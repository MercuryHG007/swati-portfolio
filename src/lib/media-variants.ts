import sharp from "sharp";
import { MEDIA_VARIANT_WIDTHS, variantKey } from "@/lib/media-storage";

const VARIANT_QUALITY = 80;

// Sizes one original into the pre-made WebP variants. Each size is built from the original (never enlarged), and
// EXIF rotation is applied first. The dimensions come from the largest variant, so they match the rotated image.
export async function buildMediaVariants(publicId: string, input: Buffer) {
  const build = (width: number) =>
    sharp(input)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: VARIANT_QUALITY })
      .toBuffer({ resolveWithObject: true });

  const widths = [...MEDIA_VARIANT_WIDTHS];
  const built = await Promise.all(widths.map((width) => build(width)));
  const largest = built[built.length - 1].info;

  return {
    width: largest.width,
    height: largest.height,
    variants: built.map(({ data }, index) => ({ key: variantKey(publicId, widths[index]), body: data })),
  };
}
