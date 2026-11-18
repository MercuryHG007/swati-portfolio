import { NextResponse } from "next/server";
import { deliverImage } from "@/lib/media-delivery";
import { isValidMediaPublicId, parseMediaOptions } from "@/lib/media-options";

export const runtime = "nodejs";

// Image route. The browser calls it only after a direct Cloudinary load fails (proxy=1). OG and JSON-LD also use it,
// because crawlers need a URL that always serves the image. Cloudinary is tried first, then the R2 mirror resized
// with the same options.
// Response headers say where the image came from: X-Media-Source (cloudinary | r2) and, for r2, X-Media-Fallback.
export async function GET(request: Request, { params }: { params: Promise<{ publicId: string[] }> }) {
  const options = parseMediaOptions(new URL(request.url).searchParams);
  if (!options) return new NextResponse("Invalid size, fit, quality or format", { status: 400 });

  const { publicId: segments } = await params;
  const publicId = segments.join("/");
  if (!isValidMediaPublicId(publicId)) return new NextResponse("Invalid image", { status: 400 });

  // Only f=auto depends on the Accept header, so only that request forwards it and varies its cache.
  const accept = options.format === "auto" ? request.headers.get("accept") : null;

  let result;
  try {
    result = await deliverImage(publicId, options, accept);
  } catch (err) {
    console.error(`Image delivery failed for ${publicId}:`, err);
    return new NextResponse("Image unavailable", { status: 502, headers: { "Cache-Control": "no-store" } });
  }

  if (!result.ok) {
    return new NextResponse(result.message, { status: result.status, headers: { "Cache-Control": "public, max-age=60" } });
  }

  const { image } = result;
  const headers: Record<string, string> = {
    "Content-Type": image.contentType,
    "X-Media-Source": image.source,
    // A Cloudinary copy is stable, so it's cached for a month. An R2 copy is cached for ten minutes, so the CDN picks
    // Cloudinary back up soon after it recovers.
    "Cache-Control":
      image.source === "cloudinary"
        ? "public, max-age=86400, s-maxage=2592000"
        : "public, max-age=60, s-maxage=600",
  };
  if (image.reason) headers["X-Media-Fallback"] = image.reason;
  if (options.format === "auto") headers.Vary = "Accept";

  return new NextResponse(new Uint8Array(image.body), { headers });
}
