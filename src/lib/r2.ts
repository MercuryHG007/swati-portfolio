import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Cloudflare R2 speaks the S3 API. Used for DB backups, the content snapshot, the Cloudinary mirror and,
// in r2 media mode, uploads and variants. Server-only: the access key is never exposed to the client.
const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;

export const R2_BACKUP_BUCKET = process.env.R2_BACKUP_BUCKET;
export const R2_MIRROR_BUCKET = process.env.R2_MIRROR_BUCKET;
export const R2_MEDIA_BUCKET = process.env.R2_MEDIA_BUCKET;
export const R2_ORIGINALS_BUCKET = process.env.R2_ORIGINALS_BUCKET;

export function isR2Configured() {
  return Boolean(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);
}

const globalForR2 = globalThis as typeof globalThis & { _r2Client?: S3Client };

function client() {
  if (!isR2Configured()) {
    throw new Error("Missing R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY environment variable(s)");
  }
  globalForR2._r2Client ??= new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    forcePathStyle: true,
    // Presigned browser uploads must not carry SDK-added checksum query params: CORS would block the extra headers.
    requestChecksumCalculation: "WHEN_REQUIRED",
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID!,
      secretAccessKey: R2_SECRET_ACCESS_KEY!,
    },
  });
  return globalForR2._r2Client;
}

function isNotFound(err: unknown) {
  const name = (err as { name?: string })?.name;
  const status = (err as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;
  return name === "NoSuchKey" || name === "NotFound" || status === 404;
}

export async function putR2Object(
  bucket: string,
  key: string,
  body: Buffer | string,
  contentType?: string,
  cacheControl?: string
) {
  await client().send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType, CacheControl: cacheControl })
  );
}

// A short-lived URL that lets the browser upload one object straight to R2. The signature doesn't cover the body
// size or content type, so the process route checks both before writing any variants.
export async function presignR2Put(bucket: string, key: string, contentType: string, expiresIn = 300) {
  return getSignedUrl(client(), new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }), {
    expiresIn,
  });
}

export async function getR2Object(bucket: string, key: string): Promise<Buffer | null> {
  try {
    const res = await client().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    return Buffer.from(await res.Body!.transformToByteArray());
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

export async function headR2Object(bucket: string, key: string): Promise<{ size: number } | null> {
  try {
    const res = await client().send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return { size: res.ContentLength ?? 0 };
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

export async function deleteR2Object(bucket: string, key: string) {
  await client().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function listR2Objects(bucket: string, prefix: string) {
  const objects: { key: string; size: number; lastModified: Date }[] = [];
  let token: string | undefined;
  do {
    const res = await client().send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token })
    );
    for (const obj of res.Contents ?? []) {
      if (obj.Key) objects.push({ key: obj.Key, size: obj.Size ?? 0, lastModified: obj.LastModified ?? new Date(0) });
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return objects;
}
