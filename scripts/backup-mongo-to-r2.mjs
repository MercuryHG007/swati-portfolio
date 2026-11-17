/**
 * Dumps MongoDB, encrypts the archive, and uploads it to the private R2 backup bucket.
 *
 *   node --env-file=.env.local scripts/backup-mongo-to-r2.mjs
 *
 * Needs `mongodump` (MongoDB Database Tools) on PATH and these variables:
 *   MONGODB_URI, BACKUP_ENCRYPTION_KEY, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BACKUP_BUCKET
 *
 * Objects are written to backups/mongo/YYYY-MM-DD.archive.gz.enc. Keeps every dump from the last 30 days
 * plus the first dump of each month. Losing BACKUP_ENCRYPTION_KEY makes every backup unreadable, so store it
 * outside this repo and outside the database.
 */
import { spawn } from 'node:child_process';
import { createCipheriv, randomBytes, scryptSync } from 'node:crypto';
import { DeleteObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const env = process.env;
const required = [
  'MONGODB_URI',
  'BACKUP_ENCRYPTION_KEY',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BACKUP_BUCKET',
];
const missing = required.filter((name) => !env[name]);
if (missing.length) {
  console.error(`Missing environment variable(s): ${missing.join(', ')}`);
  process.exit(1);
}

const PREFIX = 'backups/mongo/';
const RETAIN_DAYS = 30;
const bucket = env.R2_BACKUP_BUCKET;
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  forcePathStyle: true,
  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
});

function dumpArchive() {
  return new Promise((resolve, reject) => {
    const child = spawn('mongodump', [`--uri=${env.MONGODB_URI}`, '--archive', '--gzip'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const chunks = [];
    const errors = [];
    child.stdout.on('data', (chunk) => chunks.push(chunk));
    child.stderr.on('data', (chunk) => errors.push(chunk));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(Buffer.concat(chunks));
      else reject(new Error(`mongodump exited with ${code}: ${Buffer.concat(errors).toString('utf8').trim()}`));
    });
  });
}

// Layout: salt (16) | iv (12) | auth tag (16) | ciphertext. AES-256-GCM, key derived with scrypt.
function encrypt(plain, passphrase) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', scryptSync(passphrase, salt, 32), iv);
  const body = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([salt, iv, cipher.getAuthTag(), body]);
}

function dateFromKey(key) {
  const match = key.match(/(\d{4}-\d{2}-\d{2})\.archive\.gz\.enc$/);
  return match ? new Date(`${match[1]}T00:00:00Z`) : null;
}

async function pruneOldDumps() {
  const cutoff = Date.now() - RETAIN_DAYS * 24 * 60 * 60 * 1000;
  let token;
  let deleted = 0;
  do {
    const res = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: PREFIX, ContinuationToken: token }));
    for (const obj of res.Contents ?? []) {
      const date = dateFromKey(obj.Key ?? '');
      if (!date || date.getTime() >= cutoff || date.getUTCDate() === 1) continue;
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: obj.Key }));
      deleted += 1;
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return deleted;
}

const today = new Date().toISOString().slice(0, 10);
const key = `${PREFIX}${today}.archive.gz.enc`;

const archive = await dumpArchive();
if (archive.length === 0) throw new Error('mongodump produced an empty archive; nothing uploaded.');
const encrypted = encrypt(archive, env.BACKUP_ENCRYPTION_KEY);

await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: encrypted, ContentType: 'application/octet-stream' }));
const pruned = await pruneOldDumps();
console.log(
  `Uploaded ${key} (${(encrypted.length / 1024 / 1024).toFixed(2)} MB encrypted). Pruned ${pruned} expired dump(s).`
);
