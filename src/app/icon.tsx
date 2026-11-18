import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { getAbout } from "@/lib/queries";
import { getR2Object, R2_ORIGINALS_BUCKET } from "@/lib/r2";

// Rebuilt from the footer logo every minute, so a new logo from the admin shows up without a redeploy.
export const revalidate = 60;
export const size = { width: 128, height: 128 };
export const contentType = "image/png";

// Default icon, used when no footer logo is uploaded.
const defaultIcon = `data:image/png;base64,${(
  await readFile(join(process.cwd(), "src/app/default-icon.png"))
).toString("base64")}`;

// ImageResponse can't draw WebP, so the stored original is converted to a PNG at icon size.
async function logoDataUrl(publicId: string): Promise<string | undefined> {
  if (!R2_ORIGINALS_BUCKET) return undefined;
  try {
    const original = await getR2Object(R2_ORIGINALS_BUCKET, publicId);
    if (!original) return undefined;
    const png = await sharp(original).rotate().resize(size.width, size.height, { fit: "inside" }).png().toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return undefined;
  }
}

export default async function Icon() {
  const about = await getAbout();
  const publicId = about?.footerLogo?.publicId;
  const logo = publicId ? await logoDataUrl(publicId) : undefined;

  return new ImageResponse(
    <img src={logo ?? defaultIcon} width={size.width} height={size.height} alt="" />,
    { ...size },
  );
}
