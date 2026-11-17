/**
 * Restores an encrypted MongoDB dump from the R2 backup bucket.
 *
 *   node --env-file=.env.local scripts/restore-mongo-from-r2.mjs --list
 *   node --env-file=.env.local scripts/restore-mongo-from-r2.mjs latest --target-uri "mongodb+srv://..." --confirm
 *   node --env-file=.env.local scripts/restore-mongo-from-r2.mjs backups/mongo/2026-11-01.archive.gz.enc --target-uri "..." --confirm
 *
 * Needs `mongorestore` (MongoDB Database Tools) on PATH, plus BACKUP_ENCRYPTION_KEY and the R2 variables.
 * The target must be given explicitly, never read from MONGODB_URI, so a restore can't silently overwrite the
 * live database. Existing collections in the target are dropped and replaced (`--drop`).
 */
import { spawn } from 'node:child_process';
import { createDecipheriv, scryptSync } from 'node:crypto';
import { GetObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';

const PREFIX = 'backups/mongo/';
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};
const positional = args.find((arg, index) => !arg.startsWith('--') && args[index - 1] !== '--target-uri');

const env = process.env;
for (const name of ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BACKUP_BUCKET']) {
  if (!env[name]) {
    console.error(`Missing environment variable: ${name}`);
    process.exit(1);
  }
}
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  forcePathStyle: true,
  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
});
const bucket = env.R2_BACKUP_BUCKET;

async function listDumps() {
  const objects = [];
  let token;
  do {
    const res = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: PREFIX, ContinuationToken: token }));
    objects.push(...(res.Contents ?? []));
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return objects.filter((obj) => obj.Key?.endsWith('.archive.gz.enc')).sort((a, b) => a.Key.localeCompare(b.Key));
}

function decrypt(blob, passphrase) {
  const salt = blob.subarray(0, 16);
  const iv = blob.subarray(16, 28);
  const tag = blob.subarray(28, 44);
  const decipher = createDecipheriv('aes-256-gcm', scryptSync(passphrase, salt, 32), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(blob.subarray(44)), decipher.final()]);
}

function restore(archive, targetUri) {
  return new Promise((resolve, reject) => {
    const child = spawn('mongorestore', [`--uri=${targetUri}`, '--archive', '--gzip', '--drop'], {
      stdio: ['pipe', 'inherit', 'inherit'],
    });
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`mongorestore exited with ${code}`))));
    child.stdin.end(archive);
  });
}

if (flag('--list')) {
  for (const obj of await listDumps()) {
    console.log(`${obj.Key}\t${(obj.Size / 1024 / 1024).toFixed(2)} MB\t${obj.LastModified?.toISOString()}`);
  }
  process.exit(0);
}

const targetUri = option('--target-uri');
if (!targetUri || !flag('--confirm')) {
  console.error('Usage: <key|latest> --target-uri <uri> --confirm   (or --list)');
  process.exit(1);
}
if (!env.BACKUP_ENCRYPTION_KEY) {
  console.error('Missing environment variable: BACKUP_ENCRYPTION_KEY');
  process.exit(1);
}

const dumps = await listDumps();
const key = !positional || positional === 'latest' ? dumps.at(-1)?.Key : positional;
if (!key) {
  console.error('No backup found.');
  process.exit(1);
}

const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
const blob = Buffer.from(await res.Body.transformToByteArray());
const archive = decrypt(blob, env.BACKUP_ENCRYPTION_KEY);
await restore(archive, targetUri);
console.log(`Restored ${key} into the target database.`);
