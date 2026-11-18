/**
 * Creates the health-check canary in the R2 media bucket, the object the media probe checks through the media domain.
 * Safe to re-run: it only creates what's missing.
 *
 *   node --env-file=.env.local scripts/ensure-media-canary.mjs
 *
 * Needs R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_MEDIA_BUCKET.
 */
import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import sharp from 'sharp';

const env = process.env;
const required = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_MEDIA_BUCKET'];
const missing = required.filter((name) => !env[name]);
if (missing.length) {
  console.error(`Missing environment variable(s): ${missing.join(', ')}`);
  process.exit(1);
}

const CANARY_KEY = 'swati-portfolio/_health/canary-w160.webp';
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  forcePathStyle: true,
  requestChecksumCalculation: 'WHEN_REQUIRED',
  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
});

try {
  await s3.send(new HeadObjectCommand({ Bucket: env.R2_MEDIA_BUCKET, Key: CANARY_KEY }));
  console.log('Media canary exists.');
} catch (err) {
  if (!(err?.name === 'NotFound' || err?.$metadata?.httpStatusCode === 404)) throw err;
  const body = await sharp({ create: { width: 160, height: 107, channels: 3, background: '#c8b8a2' } }).webp({ quality: 80 }).toBuffer();
  await s3.send(
    new PutObjectCommand({
      Bucket: env.R2_MEDIA_BUCKET,
      Key: CANARY_KEY,
      Body: body,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=300',
    })
  );
  console.log('Wrote media canary.');
}
