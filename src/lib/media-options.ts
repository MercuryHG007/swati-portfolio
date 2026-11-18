// Shared by the image route, the browser components and the metadata helpers, so all three build the same URLs.
// Must not import server-only code.

export const MEDIA_MAX_EDGE = 2400;
export const MEDIA_PUBLIC_ID_PREFIX = "swati-portfolio/";

// Only sizes the pages request are accepted. next/image picks widths from its size list (16 to 3840, with 3840
// clamped to MEDIA_MAX_EDGE), and 176 is the gallery thumbnail. Anything else is rejected, so arbitrary sizes can't
// create cache entries or spend Cloudinary transformations.
export const MEDIA_ALLOWED_WIDTHS: readonly number[] = [
  16, 32, 48, 64, 96, 128, 176, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, MEDIA_MAX_EDGE,
];
// Cover crops are only used for the gallery thumbnail, so only that size is accepted.
const MEDIA_ALLOWED_COVER_SIZES = new Set(["176x120"]);
// Automatic quality, or the blur placeholder's quality.
const MEDIA_ALLOWED_QUALITIES: readonly number[] = [40];

export type MediaFit = "inside" | "cover";
export type MediaFormat = "webp" | "avif" | "jpeg" | "auto";

export type MediaOptions = {
  width?: number;
  height?: number;
  // inside: keep the whole picture, never enlarge (Cloudinary c_limit). cover: crop to w x h (c_fill, g_auto).
  fit: MediaFit;
  // undefined means automatic quality (Cloudinary q_auto).
  quality?: number;
  format: MediaFormat;
  // Skip the health-based redirect and serve through the server. Used by the browser after a failed load.
  proxy?: boolean;
};

function optionalInt(raw: string | null, min: number, max: number): number | undefined | null {
  if (raw === null) return undefined;
  const value = Number(raw);
  return Number.isInteger(value) && value >= min && value <= max ? value : null;
}

// Query parameters: w (required, from the allowlist), h (only with fit=cover and an allowed size), fit (inside |
// cover), q (auto or an allowed value), f (webp, avif, jpeg or auto), proxy (1). Defaults: fit=inside, q=auto,
// f=webp. webp is the default so the CDN never has to vary the cache by the Accept header. Pass f=auto to let the
// server choose from Accept.
export function parseMediaOptions(params: URLSearchParams): MediaOptions | null {
  const width = optionalInt(params.get("w"), 16, MEDIA_MAX_EDGE);
  if (width === undefined || width === null || !MEDIA_ALLOWED_WIDTHS.includes(width)) return null;

  const height = optionalInt(params.get("h"), 16, MEDIA_MAX_EDGE);
  if (height === null) return null;

  const fit = params.get("fit") ?? "inside";
  if (fit === "inside") {
    if (height !== undefined) return null;
  } else if (fit === "cover") {
    if (height === undefined || !MEDIA_ALLOWED_COVER_SIZES.has(`${width}x${height}`)) return null;
  } else {
    return null;
  }

  const rawQuality = params.get("q") ?? "auto";
  let quality: number | undefined;
  if (rawQuality !== "auto") {
    const parsed = optionalInt(rawQuality, 1, 100);
    if (parsed === undefined || parsed === null || !MEDIA_ALLOWED_QUALITIES.includes(parsed)) return null;
    quality = parsed;
  }

  const format = params.get("f") ?? "webp";
  if (!["webp", "avif", "jpeg", "auto"].includes(format)) return null;

  return {
    width,
    height,
    fit: fit as MediaFit,
    quality,
    format: format as MediaFormat,
    proxy: params.get("proxy") === "1",
  };
}

export function isValidMediaPublicId(publicId: string) {
  return (
    publicId.length <= 200 &&
    publicId.startsWith(MEDIA_PUBLIC_ID_PREFIX) &&
    /^[A-Za-z0-9_-]+(\/[A-Za-z0-9_-]+)*$/.test(publicId)
  );
}

// Cloudinary delivery transformation for the same options. The server uses it for the primary source.
export function cloudinaryTransform(options: MediaOptions): string {
  const parts = [options.fit === "cover" ? "c_fill" : "c_limit"];
  if (options.fit === "cover") parts.push("g_auto");
  if (options.width) parts.push(`w_${options.width}`);
  if (options.height) parts.push(`h_${options.height}`);
  parts.push(options.quality === undefined ? "q_auto" : `q_${options.quality}`);
  const formatCode = { webp: "webp", avif: "avif", jpeg: "jpg", auto: "auto" }[options.format];
  parts.push(`f_${formatCode}`);
  return parts.join(",");
}

// The Cloudinary URL the server proxies, and the one healthy requests are redirected to.
export function cloudinaryDeliveryUrl(cloudName: string, publicId: string, options: MediaOptions): string {
  return `https://res.cloudinary.com/${cloudName}/image/upload/${cloudinaryTransform(options)}/${publicId}`;
}

// Relative URL of the central image route. Works in the browser, and absoluteMediaUrl adds the origin for metadata.
export function mediaUrl(publicId: string, options: Partial<MediaOptions> = {}): string {
  const params = new URLSearchParams();
  if (options.width) params.set("w", String(Math.min(options.width, MEDIA_MAX_EDGE)));
  if (options.height) params.set("h", String(Math.min(options.height, MEDIA_MAX_EDGE)));
  if (options.fit === "cover") params.set("fit", "cover");
  if (options.quality !== undefined) params.set("q", String(options.quality));
  if (options.format && options.format !== "webp") params.set("f", options.format);
  if (options.proxy) params.set("proxy", "1");
  const path = publicId.split("/").map(encodeURIComponent).join("/");
  const query = params.toString();
  return `/api/media/${path}${query ? `?${query}` : ""}`;
}
