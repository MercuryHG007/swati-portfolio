import { cloudinaryDeliveryUrl } from "@/lib/media-options";

// "cloudinary" keeps Cloudinary for uploads and delivery (the default). "r2" stores uploads in R2 and serves
// pre-made WebP variants from the public media bucket. Switch per deployment with NEXT_PUBLIC_MEDIA_STORAGE.
export const MEDIA_STORAGE: "r2" | "cloudinary" =
  process.env.NEXT_PUBLIC_MEDIA_STORAGE === "r2" ? "r2" : "cloudinary";

// Every upload is stored at these widths, so the browser always requests a file that exists.
export const MEDIA_VARIANT_WIDTHS = [160, 320, 640, 960, 1280, 1920, 2400] as const;

export const MEDIA_FOLDER_ROOT = "swati-portfolio";
export const MEDIA_ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);
export const MEDIA_MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export function variantWidth(requested: number): number {
  return MEDIA_VARIANT_WIDTHS.find((width) => width >= requested) ?? MEDIA_VARIANT_WIDTHS[MEDIA_VARIANT_WIDTHS.length - 1];
}

export function variantKey(publicId: string, width: number): string {
  return `${publicId}-w${width}.webp`;
}

export function r2MediaUrl(publicId: string, requestedWidth: number): string {
  const base = (process.env.NEXT_PUBLIC_MEDIA_BASE_URL ?? "").replace(/\/$/, "");
  return `${base}/${variantKey(publicId, variantWidth(requestedWidth))}`;
}

// Delivery URL for the active storage mode.
export function mediaSrc(publicId: string, requestedWidth: number): string {
  if (MEDIA_STORAGE === "r2") return r2MediaUrl(publicId, requestedWidth);
  return cloudinaryDeliveryUrl(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "", publicId, {
    width: requestedWidth,
    fit: "inside",
    format: "auto",
  });
}

// Upload folders must sit under the swati-portfolio root, so discard and cleanup can recognise them.
export function safeMediaFolder(folder: unknown): string {
  if (typeof folder !== "string" || !/^[a-zA-Z0-9/_-]+$/.test(folder)) return MEDIA_FOLDER_ROOT;
  return folder === MEDIA_FOLDER_ROOT || folder.startsWith(`${MEDIA_FOLDER_ROOT}/`) ? folder : MEDIA_FOLDER_ROOT;
}
