import { NextRequest, NextResponse } from "next/server";
import type { UploadApiResponse } from "cloudinary";
import { auth } from "@/auth";
import { cloudinary } from "@/lib/cloudinary";

export const runtime = "nodejs"; // Cloudinary SDK requires Node APIs, not Edge

const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const folder = formData.get("folder");

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Missing 'file' in form data" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ ok: false, error: `Unsupported file type: ${file.type}` }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ ok: false, error: "File exceeds 15MB limit" }, { status: 400 });
    }

    // Whitelist folder chars so it can't be used for path traversal / injection into the Cloudinary API call.
    const safeFolder =
      typeof folder === "string" && /^[a-zA-Z0-9/_-]+$/.test(folder) ? folder : "swati-portfolio";

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: safeFolder,
          resource_type: "image",
          // Compress + cap oversized originals on the way in; delivery-time format/quality
          // negotiation (f_auto/q_auto per requesting browser) is handled separately by CldImage.
          quality: "auto",
          width: 2500,
          height: 2500,
          crop: "limit",
        },
        (error, uploadResult) => {
          if (error || !uploadResult) {
            reject(error ?? new Error("Cloudinary upload failed"));
            return;
          }
          resolve(uploadResult);
        }
      );
      uploadStream.end(buffer);
    });

    return NextResponse.json({
      ok: true,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
    });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "object" && err !== null && "message" in err
        ? String((err as { message: unknown }).message)
        : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
