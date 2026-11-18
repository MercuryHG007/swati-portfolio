import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { auth } from "@/auth";
import { isR2Configured, presignR2Put, R2_ORIGINALS_BUCKET } from "@/lib/r2";
import { MEDIA_ALLOWED_TYPES, safeMediaFolder } from "@/lib/media-storage";

export const runtime = "nodejs";

// Step 1 of an r2-mode upload: returns a short-lived URL so the browser sends the file straight to R2,
// bypassing the server's request-size limit. Step 2 is /api/admin/upload/process.
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!isR2Configured() || !R2_ORIGINALS_BUCKET) {
    return NextResponse.json({ ok: false, error: "R2 originals bucket is not configured" }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as { folder?: unknown; contentType?: unknown } | null;
  const contentType = typeof body?.contentType === "string" ? body.contentType : "";
  if (!MEDIA_ALLOWED_TYPES.has(contentType)) {
    return NextResponse.json({ ok: false, error: `Unsupported file type: ${contentType}` }, { status: 400 });
  }

  const publicId = `${safeMediaFolder(body?.folder)}/${randomUUID()}`;
  const uploadUrl = await presignR2Put(R2_ORIGINALS_BUCKET, publicId, contentType);
  return NextResponse.json({ ok: true, publicId, uploadUrl });
}
