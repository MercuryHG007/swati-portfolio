/**
 * Dumps MongoDB, encrypts the archive, and uploads it to the private R2 backup bucket.
 *
 *   node --env-file=.env.local scripts/backup-mongo-to-r2.mjs
 *
 * Needs `mongodump` (MongoDB Database Tools) on PATH and these variables:
 *   MONGODB_URI, BACKUP_ENCRYPTION_KEY, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BACKUP_BUCKET
 *
 * Objects are written to backups/mongo/YYYY-MM-DDTHH-MM-SSZ.archive.gz.enc, so every run gets its own name. Keeps every
 * dump from the last 30 days plus the earliest dump of each month. Losing BACKUP_ENCRYPTION_KEY makes every backup
 * unreadable, so store it outside this repo and outside the database.
 *
 * Skips the dump when no collection has changed since the last one (state in backups/state/mongo.json). A full dump
 * is still taken at least weekly, or whenever --force (or FORCE_BACKUP=1) is set.
 */
import { spawn } from 'node:child_process';
import { createCipheriv, createHash, randomBytes, scryptSync } from 'node:crypto';
import { MongoClient } from 'mongodb';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

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
  const match = key.match(/(\d{4}-\d{2}-\d{2})(?:T[\d-]+Z)?\.archive\.gz\.enc$/);
  return match ? new Date(`${match[1]}T00:00:00Z`) : null;
}

async function pruneOldDumps() {
  const cutoff = Date.now() - RETAIN_DAYS * 24 * 60 * 60 * 1000;
  const keys = [];
  let token;
  do {
    const res = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: PREFIX, ContinuationToken: token }));
    for (const obj of res.Contents ?? []) if (obj.Key) keys.push(obj.Key);
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);

  // Keys sort chronologically, so the first key seen for a month is that month's earliest dump.
  const seenMonths = new Set();
  const keepForMonth = new Set();
  const expired = [];
  for (const key of keys.sort()) {
    const date = dateFromKey(key);
    if (!date) continue;
    const month = date.toISOString().slice(0, 7);
    if (!seenMonths.has(month)) {
      seenMonths.add(month);
      keepForMonth.add(key);
    }
    if (date.getTime() < cutoff && !keepForMonth.has(key)) expired.push(key);
  }
  for (const key of expired) {
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  }
  return expired.length;
}

const stamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z').replace(/:/g, '-');
const key = `${PREFIX}${stamp}.archive.gz.enc`;

// Counts and the latest updatedAt per collection. Documents edited in place bump updatedAt when the model has timestamps.
// Edits made outside the app may not, so a full backup is still forced every FORCE_EVERY_DAYS.
async function computeFingerprint() {
  const client = new MongoClient(env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  await client.connect();
  try {
    const db = client.db();
    const collections = {};
    const infos = await db.listCollections({}, { nameOnly: true }).toArray();
    for (const info of infos.filter((c) => !c.name.startsWith('system.')).sort((a, b) => a.name.localeCompare(b.name))) {
      const coll = db.collection(info.name);
      const count = await coll.countDocuments();
      const latest = await coll.findOne({}, { sort: { updatedAt: -1 }, projection: { updatedAt: 1 } });
      collections[info.name] = { count, latestUpdatedAt: latest?.updatedAt ? new Date(latest.updatedAt).toISOString() : null };
    }
    return createHash('sha256').update(JSON.stringify(collections)).digest('hex');
  } finally {
    await client.close();
  }
}

const STATE_KEY = 'backups/state/mongo.json';
const FORCE_EVERY_DAYS = 7;

async function readState() {
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: STATE_KEY }));
    return JSON.parse(Buffer.from(await res.Body.transformToByteArray()).toString('utf8'));
  } catch (err) {
    if (err?.name === 'NoSuchKey' || err?.$metadata?.httpStatusCode === 404) return null;
    throw err;
  }
}

const force = process.argv.includes('--force') || env.FORCE_BACKUP === '1';
const fingerprint = await computeFingerprint();
const state = await readState();
const lastDumpAge = state ? Date.now() - Date.parse(state.lastDumpAt) : Infinity;
if (!force && state?.fingerprint === fingerprint && lastDumpAge < FORCE_EVERY_DAYS * 24 * 60 * 60 * 1000) {
  console.log('No database changes since the last backup; skipped.');
  process.exit(0);
}

const archive = await dumpArchive();
if (archive.length === 0) throw new Error('mongodump produced an empty archive; nothing uploaded.');
const encrypted = encrypt(archive, env.BACKUP_ENCRYPTION_KEY);

await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: encrypted, ContentType: 'application/octet-stream' }));
await s3.send(
  new PutObjectCommand({
    Bucket: bucket,
    Key: STATE_KEY,
    Body: JSON.stringify({ fingerprint, lastDumpAt: new Date().toISOString(), lastBackupKey: key }),
    ContentType: 'application/json',
  })
);
const pruned = await pruneOldDumps();
console.log(
  `Uploaded ${key} (${(encrypted.length / 1024 / 1024).toFixed(2)} MB encrypted). Pruned ${pruned} expired dump(s).`
);
