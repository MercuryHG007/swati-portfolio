import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  deleteR2Object,
  getR2Object,
  headR2Object,
  isR2Configured,
  putR2Object,
  R2_MEDIA_BUCKET,
  R2_ORIGINALS_BUCKET,
} from "@/lib/r2";
import { buildMediaVariants } from "@/lib/media-variants";
import { MEDIA_MAX_UPLOAD_BYTES, MEDIA_FOLDER_ROOT } from "@/lib/media-storage";
import { isValidMediaPublicId } from "@/lib/media-options";

export const runtime = "nodejs";
export const maxDuration = 60;

// Variant keys are unique per upload, so browsers and the CDN can cache them forever.
const VARIANT_CACHE = "public, max-age=31536000, immutable";

// Step 2 of an r2-mode upload: reads the original the browser sent to R2, writes the pre-made variants to the
// public media bucket, and returns the public id the record stores. Rejects and removes anything that isn't an image.
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!isR2Configured() || !R2_ORIGINALS_BUCKET || !R2_MEDIA_BUCKET) {
    return NextResponse.json({ ok: false, error: "R2 media buckets are not configured" }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as { publicId?: unknown } | null;
  const publicId = typeof body?.publicId === "string" ? body.publicId : "";
  if (!isValidMediaPublicId(publicId) || !publicId.startsWith(`${MEDIA_FOLDER_ROOT}/`)) {
    return NextResponse.json({ ok: false, error: "Invalid publicId" }, { status: 400 });
  }

  const stored = await headR2Object(R2_ORIGINALS_BUCKET, publicId);
  if (!stored) {
    return NextResponse.json({ ok: false, error: "Upload not found" }, { status: 404 });
  }
  if (stored.size > MEDIA_MAX_UPLOAD_BYTES) {
    await deleteR2Object(R2_ORIGINALS_BUCKET, publicId);
    return NextResponse.json({ ok: false, error: "File exceeds 15MB limit" }, { status: 400 });
  }

  const input = await getR2Object(R2_ORIGINALS_BUCKET, publicId);
  if (!input) {
    return NextResponse.json({ ok: false, error: "Upload not found" }, { status: 404 });
  }

  let built;
  try {
    built = await buildMediaVariants(publicId, input);
  } catch {
    await deleteR2Object(R2_ORIGINALS_BUCKET, publicId);
    return NextResponse.json({ ok: false, error: "File is not a readable image" }, { status: 400 });
  }

  await Promise.all(
    built.variants.map((variant) => putR2Object(R2_MEDIA_BUCKET!, variant.key, variant.body, "image/webp", VARIANT_CACHE))
  );

  return NextResponse.json({
    ok: true,
    publicId,
    width: built.width,
    height: built.height,
    format: "webp",
    bytes: stored.size,
  });
}
