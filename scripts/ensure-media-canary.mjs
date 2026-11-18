/**
 * Creates the health-check canary image in Cloudinary and in the R2 mirror. Safe to re-run: it only creates what's missing.
 *
 *   node --env-file=.env.local scripts/ensure-media-canary.mjs
 *
 * Needs CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET and R2_ACCOUNT_ID/ACCESS_KEY_ID/SECRET_ACCESS_KEY/R2_MIRROR_BUCKET.
 */
import { v2 as cloudinary } from 'cloudinary';
import sharp from 'sharp';
import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const CANARY_PUBLIC_ID = 'swati-portfolio/_health/canary';
const env = process.env;
const required = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET', 'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_MIRROR_BUCKET'];
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

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  forcePathStyle: true,
  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
});

// A plain 64px tile. It's small, public and not an artwork, so it never appears on the site.
const png = await sharp({ create: { width: 64, height: 64, channels: 3, background: { r: 236, g: 232, b: 224 } } })
  .png()
  .toBuffer();

let cloudinaryExists = true;
try {
  await cloudinary.api.resource(CANARY_PUBLIC_ID, { resource_type: 'image' });
} catch (err) {
  // The SDK nests the HTTP status under err.error. Only the message is printed, since the full error can include credentials.
  const status = err?.http_code ?? err?.error?.http_code;
  if (status !== 404) throw new Error(`Cloudinary lookup failed: ${err?.message ?? err?.error?.message ?? status}`);
  cloudinaryExists = false;
}
if (cloudinaryExists) {
  console.log(`Cloudinary canary exists: ${CANARY_PUBLIC_ID}`);
} else {
  await cloudinary.uploader.upload(`data:image/png;base64,${png.toString('base64')}`, {
    public_id: CANARY_PUBLIC_ID,
    resource_type: 'image',
    overwrite: false,
  });
  console.log(`Uploaded Cloudinary canary: ${CANARY_PUBLIC_ID}`);
}

try {
  await s3.send(new HeadObjectCommand({ Bucket: env.R2_MIRROR_BUCKET, Key: CANARY_PUBLIC_ID }));
  console.log('R2 mirror canary exists.');
} catch (err) {
  if (err?.name !== 'NotFound' && err?.$metadata?.httpStatusCode !== 404) throw err;
  await s3.send(new PutObjectCommand({ Bucket: env.R2_MIRROR_BUCKET, Key: CANARY_PUBLIC_ID, Body: png, ContentType: 'image/png' }));
  console.log('Wrote R2 mirror canary.');
}
