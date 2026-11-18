import sharp from "sharp";
import { MEDIA_MAX_EDGE, type MediaFormat, type MediaOptions } from "@/lib/media-options";

export { MEDIA_MAX_EDGE };

// Resolves f=auto the way Cloudinary's f_auto does: AVIF or WebP when the browser accepts them, otherwise JPEG.
export function resolveFormat(format: MediaFormat, accept: string | null): Exclude<MediaFormat, "auto"> {
  if (format !== "auto") return format;
  if (accept?.includes("image/avif")) return "avif";
  if (accept?.includes("image/webp")) return "webp";
  return "jpeg";
}

// Matches the Cloudinary transform from cloudinaryTransform(): auto-rotate from EXIF, never enlarge, cover crops
// around the most interesting area (Cloudinary's g_auto), and quality defaults to 80 where Cloudinary's q_auto is used.
export async function resizeImage(input: Buffer, options: MediaOptions, accept: string | null = null) {
  const format = resolveFormat(options.format, accept);
  const cover = options.fit === "cover";
  const body = await sharp(input)
    .rotate()
    .resize({
      width: options.width,
      height: options.height,
      fit: cover ? "cover" : "inside",
      position: cover ? "attention" : "centre",
      withoutEnlargement: true,
    })
    .toFormat(format, { quality: options.quality ?? 80 })
    .toBuffer();
  return { body, contentType: `image/${format}`, format };
}
