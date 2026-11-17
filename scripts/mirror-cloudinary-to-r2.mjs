/**
 * Copies every Cloudinary image into the public R2 mirror bucket, keyed by its public_id.
 *
 *   node --env-file=.env.local scripts/mirror-cloudinary-to-r2.mjs
 *
 * Needs CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET and R2_ACCOUNT_ID/ACCESS_KEY_ID/SECRET_ACCESS_KEY/R2_MIRROR_BUCKET.
 * Additive only: nothing is deleted from the mirror, so images removed in admin stay available as a fallback.
 * Objects already in the mirror with the same byte size are skipped, so repeat runs only copy new uploads.
 */
import { v2 as cloudinary } from 'cloudinary';
import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const env = process.env;
const required = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_MIRROR_BUCKET',
];
const missing = required.filter((name) => !env[name]);
if (missing.length) {
  console.error(`Missing environment variable(s): ${missing.join(', ')}`);
  process.exit(1);
}

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

const bucket = env.R2_MIRROR_BUCKET;
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  forcePathStyle: true,
  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
});

async function mirroredSize(key) {
  try {
    const res = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return res.ContentLength ?? -1;
  } catch (err) {
    if (err.$metadata?.httpStatusCode === 404 || err.name === 'NotFound') return -1;
    throw err;
  }
}

let cursor;
let scanned = 0;
let copied = 0;
let skipped = 0;
let failed = 0;

do {
  const page = await cloudinary.api.resources({
    type: 'upload',
    resource_type: 'image',
    max_results: 500,
    next_cursor: cursor,
  });

  for (const asset of page.resources) {
    scanned += 1;
    const key = asset.public_id;
    try {
      if ((await mirroredSize(key)) === asset.bytes) {
        skipped += 1;
        continue;
      }
      const res = await fetch(asset.secure_url);
      if (!res.ok) throw new Error(`download returned ${res.status}`);
      const body = Buffer.from(await res.arrayBuffer());
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: res.headers.get('content-type') ?? 'image/jpeg',
        })
      );
      copied += 1;
    } catch (err) {
      failed += 1;
      console.warn(`Failed ${key}: ${err.message}`);
    }
  }

  cursor = page.next_cursor;
} while (cursor);

console.log(`Scanned ${scanned} Cloudinary image(s): copied ${copied}, already mirrored ${skipped}, failed ${failed}.`);
if (failed) process.exitCode = 1;
