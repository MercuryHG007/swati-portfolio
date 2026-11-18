/**
 * Copies the newest encrypted database dump and the image originals from R2 into a local folder, so the
 * disaster-recovery workflow can commit them to the private off-site backup repo. Nothing is deleted locally.
 *
 *   node --env-file=.env.prod scripts/backup-r2-to-offsite.mjs db <dir>
 *   node --env-file=.env.prod scripts/backup-r2-to-offsite.mjs images <dir>
 *
 * `db` copies only the newest dump, because older dumps were copied on earlier nights. `images` copies every original
 * that is missing locally or has a different size. Originals are copied, not variants, because the variants can be
 * rebuilt from them (see restore-media-from-offsite.mjs).
 *
 * Needs R2_ACCOUNT_ID, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY, plus R2_BACKUP_BUCKET for `db` or
 * R2_ORIGINALS_BUCKET for `images`.
 */
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { GetObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';

const MEDIA_ROOT = 'swati-portfolio';
const PUBLIC_ID = /^swati-portfolio\/[A-Za-z0-9_-]+(\/[A-Za-z0-9_-]+)*$/;
const BUCKET_VARIABLE = { db: 'R2_BACKUP_BUCKET', images: 'R2_ORIGINALS_BUCKET' };

const [mode, dir] = process.argv.slice(2);
if (!BUCKET_VARIABLE[mode] || !dir) {
  console.error('Usage: backup-r2-to-offsite.mjs <db|images> <dir>');
  process.exit(1);
}

const env = process.env;
const required = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', BUCKET_VARIABLE[mode]];
const missing = required.filter((name) => !env[name]);
if (missing.length) {
  console.error(`Missing environment variable(s): ${missing.join(', ')}`);
  process.exit(1);
}

const bucket = env[BUCKET_VARIABLE[mode]];
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  forcePathStyle: true,
  requestChecksumCalculation: 'WHEN_REQUIRED',
  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
});

async function listAll(prefix) {
  const objects = [];
  let token;
  do {
    const res = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token }));
    objects.push(...(res.Contents ?? []));
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return objects;
}

async function download(key) {
  const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  return Buffer.from(await res.Body.transformToByteArray());
}

// -1 when the file doesn't exist, so a missing file never matches a real size.
async function localSize(path) {
  try {
    return (await stat(path)).size;
  } catch (err) {
    if (err?.code === 'ENOENT') return -1;
    throw err;
  }
}

async function copyNewestDump() {
  const dumps = (await listAll('backups/mongo/'))
    .filter((obj) => obj.Key?.endsWith('.archive.gz.enc'))
    .sort((a, b) => a.Key.localeCompare(b.Key));
  const latest = dumps.at(-1);
  if (!latest) {
    console.error('No dump found in the backup bucket.');
    return false;
  }

  const target = join(dir, basename(latest.Key));
  if ((await localSize(target)) === latest.Size) {
    console.log(`Already copied: ${basename(latest.Key)}`);
    return true;
  }
  await mkdir(dir, { recursive: true });
  await writeFile(target, await download(latest.Key));
  console.log(`Copied ${basename(latest.Key)} (${(latest.Size / 1048576).toFixed(2)} MB).`);
  return true;
}

async function copyOriginals() {
  const originals = (await listAll(`${MEDIA_ROOT}/`)).filter((obj) => obj.Key && PUBLIC_ID.test(obj.Key));
  let copied = 0;
  let present = 0;
  let failed = 0;

  for (const obj of originals) {
    const target = join(dir, obj.Key);
    try {
      if ((await localSize(target)) === obj.Size) {
        present++;
        continue;
      }
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, await download(obj.Key));
      copied++;
    } catch (err) {
      failed++;
      console.error(`Failed ${obj.Key}: ${err.name ?? err.message}`);
    }
  }

  console.log(`Originals: ${originals.length} in bucket, ${copied} copied, ${present} already present, ${failed} failed.`);
  return failed === 0;
}

let ok;
try {
  ok = mode === 'db' ? await copyNewestDump() : await copyOriginals();
} catch (err) {
  console.error(`Failed: ${err.name ?? 'Error'}: ${err.message}`);
  ok = false;
}
process.exit(ok ? 0 : 1);
