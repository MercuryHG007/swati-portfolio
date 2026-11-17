import { NextResponse } from "next/server";
import { getR2Object, isR2Configured, R2_MIRROR_BUCKET } from "@/lib/r2";
import { parseResizeOptions, resizeImage } from "@/lib/media-resize";

// Serves a resized copy of an image from the R2 mirror. The image components use this when Cloudinary fails to load.
// Only keys that exist in the mirror are served, and the output is cached at the CDN so each size is resized once.
export async function GET(request: Request, { params }: { params: Promise<{ publicId: string[] }> }) {
  const options = parseResizeOptions(new URL(request.url).searchParams);
  if (!options) {
    return new NextResponse("Invalid size, fit or format", { status: 400 });
  }
  if (!isR2Configured() || !R2_MIRROR_BUCKET) {
    return new NextResponse("Media mirror is not configured", { status: 503 });
  }

  const { publicId } = await params;
  const original = await getR2Object(R2_MIRROR_BUCKET, publicId.join("/"));
  if (!original) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { body, contentType } = await resizeImage(original, options);
  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, s-maxage=2592000",
    },
  });
}
