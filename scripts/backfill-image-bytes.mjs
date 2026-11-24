/**
 * Records the original file size (bytes) on image entries saved before the size was stored.
 * Each size is read from the R2 originals bucket with a HEAD request. Dry run unless --apply is passed.
 *
 *   node --env-file=.env.local scripts/backfill-image-bytes.mjs          # report only
 *   node --env-file=.env.local scripts/backfill-image-bytes.mjs --apply  # write sizes
 *
 * Needs MONGODB_URI, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_ORIGINALS_BUCKET.
 * Safe to re-run: entries that already have a size are skipped.
 */
import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { MongoClient } from 'mongodb';

const env = process.env;
const required = ['MONGODB_URI', 'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_ORIGINALS_BUCKET'];
const missing = required.filter((name) => !env[name]);
if (missing.length) {
  console.error(`Missing environment variable(s): ${missing.join(', ')}`);
  process.exit(1);
}

const apply = process.argv.includes('--apply');

// Every embedded image field in src/models. `many` marks an array of images rather than a single image.
const FIELDS = [
  { collection: 'artworks', field: 'images', many: true },
  { collection: 'series', field: 'coverImage', many: false },
  { collection: 'exhibitions', field: 'images', many: true },
  { collection: 'abouts', field: 'photo', many: false },
  { collection: 'abouts', field: 'footerLogo', many: false },
];

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  forcePathStyle: true,
  requestChecksumCalculation: 'WHEN_REQUIRED',
  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
});

async function originalSize(publicId) {
  try {
    const res = await s3.send(new HeadObjectCommand({ Bucket: env.R2_ORIGINALS_BUCKET, Key: publicId }));
    return res.ContentLength ?? null;
  } catch (err) {
    if (err?.name === 'NotFound' || err?.$metadata?.httpStatusCode === 404) return null;
    throw err;
  }
}

const client = new MongoClient(env.MONGODB_URI);
await client.connect();
const db = client.db();
const totals = { missing: 0, notInR2: 0, found: 0, written: 0 };

try {
  for (const { collection, field, many } of FIELDS) {
    const docs = await db
      .collection(collection)
      .find({ [field]: { $ne: null } }, { projection: { [field]: 1 } })
      .toArray();

    for (const doc of docs) {
      const images = many ? doc[field] ?? [] : [doc[field]];
      for (const image of images) {
        if (!image?.publicId || typeof image.bytes === 'number') continue;
        totals.missing++;

        const size = await originalSize(image.publicId);
        if (size == null) {
          totals.notInR2++;
          console.warn(`Not found in R2, skipped: ${collection} ${doc._id} ${image.publicId}`);
          continue;
        }
        totals.found++;

        if (apply) {
          const path = many ? `${field}.$.bytes` : `${field}.bytes`;
          await db
            .collection(collection)
            .updateOne({ _id: doc._id, [`${field}.publicId`]: image.publicId }, { $set: { [path]: size } });
          totals.written++;
        }
      }
    }
  }
} finally {
  await client.close();
}

console.log(
  `${apply ? 'Applied' : 'Dry run'}: ${totals.missing} image(s) without a size, ` +
    `${totals.found} read from R2, ${totals.notInR2} missing in R2, ${totals.written} written.`
);
if (!apply) console.log('Re-run with --apply to write the sizes.');
