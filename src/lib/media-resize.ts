import sharp from "sharp";

export const MEDIA_MAX_EDGE = 2400;

const FORMATS = ["webp", "avif", "jpeg"] as const;
type MediaFormat = (typeof FORMATS)[number];

export type ResizeOptions = {
  width?: number;
  height?: number;
  fit: "cover" | "inside";
  quality: number;
  format: MediaFormat;
};

// Returns undefined when the parameter is absent, and null when it is present but out of range.
function optionalInt(raw: string | null, min: number, max: number): number | undefined | null {
  if (raw === null) return undefined;
  const value = Number(raw);
  return Number.isInteger(value) && value >= min && value <= max ? value : null;
}

// Query parameters: w and h (pixels, at least one required), fit (cover | inside), q (1-100), f (webp | avif | jpeg).
export function parseResizeOptions(params: URLSearchParams): ResizeOptions | null {
  const width = optionalInt(params.get("w"), 16, MEDIA_MAX_EDGE);
  const height = optionalInt(params.get("h"), 16, MEDIA_MAX_EDGE);
  if (width === null || height === null || (width === undefined && height === undefined)) return null;

  const fit = params.get("fit") ?? "inside";
  if (fit !== "cover" && fit !== "inside") return null;

  const format = params.get("f") ?? "webp";
  if (!(FORMATS as readonly string[]).includes(format)) return null;

  return {
    width,
    height,
    fit,
    quality: optionalInt(params.get("q"), 1, 100) ?? 80,
    format: format as MediaFormat,
  };
}

// Auto-rotates from EXIF and never enlarges, so a small original is returned at its own size.
export async function resizeImage(input: Buffer, options: ResizeOptions) {
  const body = await sharp(input)
    .rotate()
    .resize({ width: options.width, height: options.height, fit: options.fit, withoutEnlargement: true })
    .toFormat(options.format, { quality: options.quality })
    .toBuffer();
  return { body, contentType: `image/${options.format}` };
}
