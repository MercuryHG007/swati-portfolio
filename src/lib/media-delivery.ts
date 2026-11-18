import { resizeImage } from "@/lib/media-resize";
import { cloudinaryDeliveryUrl, type MediaOptions } from "@/lib/media-options";
import { getR2Object, isR2Configured, R2_MIRROR_BUCKET } from "@/lib/r2";

// Cloudinary is tried first. A slow or failing Cloudinary is skipped for this instance for BREAKER_MS, so a
// Cloudinary outage costs one timeout per instance rather than one per image.
export const CLOUDINARY_TIMEOUT_MS = 3000;
const BREAKER_MS = 60_000;
let cloudinaryBreakerUntil = 0;

export type FallbackReason =
  | "breaker_open"
  | "timeout"
  | "network"
  | "upstream_5xx"
  | "quota"
  | "auth"
  | "not_found"
  | "unexpected";

export type DeliveredImage = {
  body: Buffer;
  contentType: string;
  source: "cloudinary" | "r2";
  reason?: FallbackReason;
};

export type DeliveryResult =
  | { ok: true; image: DeliveredImage }
  | { ok: false; status: 404 | 503; message: string };

type CloudinaryAttempt =
  | { ok: true; body: Buffer; contentType: string }
  | { ok: false; notFound?: boolean; reason?: FallbackReason };

async function fetchFromCloudinary(
  cloudName: string,
  publicId: string,
  options: MediaOptions,
  accept: string | null
): Promise<CloudinaryAttempt> {
  const url = cloudinaryDeliveryUrl(cloudName, publicId, options);
  try {
    const res = await fetch(url, {
      headers: accept ? { Accept: accept } : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(CLOUDINARY_TIMEOUT_MS),
    });
    if (res.status === 404) return { ok: false, notFound: true };
    if (res.status === 420 || res.status === 429) return { ok: false, reason: "quota" };
    if (res.status === 401 || res.status === 403) return { ok: false, reason: "auth" };
    if (!res.ok) return { ok: false, reason: res.status >= 500 ? "upstream_5xx" : "unexpected" };
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) return { ok: false, reason: "unexpected" };
    return { ok: true, body: Buffer.from(await res.arrayBuffer()), contentType };
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    return { ok: false, reason: timedOut ? "timeout" : "network" };
  }
}

// Returns the image from Cloudinary when it can, otherwise from the R2 mirror resized to the same options.
// Throws only if R2 itself fails, which the route turns into a 502.
export async function deliverImage(
  publicId: string,
  options: MediaOptions,
  accept: string | null
): Promise<DeliveryResult> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  let reason: FallbackReason | undefined;

  if (cloudName) {
    if (Date.now() < cloudinaryBreakerUntil) {
      reason = "breaker_open";
    } else {
      const attempt = await fetchFromCloudinary(cloudName, publicId, options, accept);
      if (attempt.ok) {
        return { ok: true, image: { body: attempt.body, contentType: attempt.contentType, source: "cloudinary" } };
      }
      // A 404 is about one asset, not the service, so it doesn't open the breaker. It's still reported.
      if (!attempt.notFound) {
        cloudinaryBreakerUntil = Date.now() + BREAKER_MS;
        reason = attempt.reason;
      } else {
        reason = "not_found";
      }
    }
  }

  if (!isR2Configured() || !R2_MIRROR_BUCKET) {
    return { ok: false, status: 503, message: "Image source unavailable" };
  }
  const original = await getR2Object(R2_MIRROR_BUCKET, publicId);
  if (!original) return { ok: false, status: 404, message: "Not found" };

  const { body, contentType } = await resizeImage(original, options, accept);
  return { ok: true, image: { body, contentType, source: "r2", reason } };
}
