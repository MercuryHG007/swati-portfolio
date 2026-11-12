import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { destroyUnreferencedUploads } from "@/lib/cloudinary-cleanup";

export const runtime = "nodejs";

const MAX_IDS = 50;
// Only assets uploaded by the admin uploader (see upload/route.ts) can be discarded from here.
const UPLOAD_PREFIX = "swati-portfolio/";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { publicIds?: unknown } | null;
  const publicIds = Array.isArray(body?.publicIds) ? body.publicIds : [];
  const safeIds = publicIds
    .filter((id): id is string => typeof id === "string" && id.startsWith(UPLOAD_PREFIX))
    .slice(0, MAX_IDS);

  await destroyUnreferencedUploads(safeIds);
  return NextResponse.json({ ok: true });
}
