/**
 * Restores images from the off-site copy written by backup-r2-to-offsite.mjs (the images/ folder of the backup repo).
 *
 *   node --env-file=.env.prod scripts/restore-media-from-offsite.mjs <backup-repo>/images --dry-run
 *   node --env-file=.env.prod scripts/restore-media-from-offsite.mjs <backup-repo>/images --confirm
 *
 * For each original, uploads it to R2_ORIGINALS_BUCKET if it's missing. Then builds any of the seven WebP variants
 * missing from R2_MEDIA_BUCKET and uploads them. Existing objects are never overwritten, so the script is safe to
 * re-run. The variant settings must match src/lib/media-variants.ts and src/lib/media-storage.ts.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import sharp from 'sharp';

const WIDTHS = [160, 320, 640, 960, 1280, 1920, 2400];
const VARIANT_QUALITY = 80;
const VARIANT_CACHE = 'public, max-age=31536000, immutable';
const PUBLIC_ID = /^swati-portfolio\/[A-Za-z0-9_-]+(\/[A-Za-z0-9_-]+)*$/;

const args = process.argv.slice(2);
const dir = args.find((arg) => !arg.startsWith('--'));
const dryRun = args.includes('--dry-run');
const confirm = args.includes('--confirm');
if (!dir || (!dryRun && !confirm)) {
  console.error('Usage: restore-media-from-offsite.mjs <images-dir> (--dry-run | --confirm)');
  process.exit(1);
}

const env = process.env;
const required = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_ORIGINALS_BUCKET', 'R2_MEDIA_BUCKET'];
const missing = required.filter((name) => !env[name]);
if (missing.length) {
  console.error(`Missing environment variable(s): ${missing.join(', ')}`);
  process.exit(1);
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  forcePathStyle: true,
  requestChecksumCalculation: 'WHEN_REQUIRED',
  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
});

async function exists(bucket, key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (err) {
    if (err?.name === 'NotFound' || err?.$metadata?.httpStatusCode === 404) return false;
    throw err;
  }
}

async function listOriginals(root) {
  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  const found = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const path = join(entry.parentPath, entry.name);
    const publicId = relative(root, path).split(sep).join('/');
    if (PUBLIC_ID.test(publicId)) found.push({ publicId, path });
  }
  return found;
}

const originals = await listOriginals(dir);
let uploaded = 0;
let variantsWritten = 0;
let skipped = 0;
let failed = 0;

for (const { publicId, path } of originals) {
  try {
    const originalMissing = !(await exists(env.R2_ORIGINALS_BUCKET, publicId));
    const missingWidths = [];
    for (const width of WIDTHS) {
      if (!(await exists(env.R2_MEDIA_BUCKET, `${publicId}-w${width}.webp`))) missingWidths.push(width);
    }

    if (!originalMissing && missingWidths.length === 0) {
      skipped++;
      continue;
    }
    if (dryRun) {
      console.log(`Would restore ${publicId}: original ${originalMissing ? 'missing' : 'present'}, ${missingWidths.length} variant(s) missing.`);
      continue;
    }

    const input = await readFile(path);
    if (originalMissing) {
      await s3.send(
        new PutObjectCommand({
          Bucket: env.R2_ORIGINALS_BUCKET,
          Key: publicId,
          Body: input,
          ContentType: 'application/octet-stream',
        })
      );
      uploaded++;
    }
    for (const width of missingWidths) {
      const body = await sharp(input)
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: VARIANT_QUALITY })
        .toBuffer();
      await s3.send(
        new PutObjectCommand({
          Bucket: env.R2_MEDIA_BUCKET,
          Key: `${publicId}-w${width}.webp`,
          Body: body,
          ContentType: 'image/webp',
          CacheControl: VARIANT_CACHE,
        })
      );
      variantsWritten++;
    }
  } catch (err) {
    failed++;
    console.error(`Failed ${publicId}: ${err.name ?? err.message}`);
  }
}

console.log(
  `${dryRun ? 'Dry run' : 'Restore'}: ${originals.length} original(s) in ${dir}. ` +
    `${uploaded} original(s) uploaded, ${variantsWritten} variant(s) written, ${skipped} already complete, ${failed} failed.`
);
process.exit(failed === 0 ? 0 : 1);
