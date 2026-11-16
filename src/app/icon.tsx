import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getAbout } from "@/lib/queries";
import { cloudinaryImageUrl } from "@/lib/seo";

// Rebuilt from the footer logo every minute, so a new logo from the admin shows up without a redeploy.
export const revalidate = 60;
export const size = { width: 128, height: 128 };
export const contentType = "image/png";

// Default icon, used when no footer logo is uploaded.
const defaultIcon = `data:image/png;base64,${(
  await readFile(join(process.cwd(), "src/app/default-icon.png"))
).toString("base64")}`;

async function logoDataUrl(publicId: string): Promise<string | undefined> {
  const url = cloudinaryImageUrl(publicId, "f_png,c_fit,w_128,h_128");
  if (!url) return undefined;
  try {
    const res = await fetch(url);
    if (!res.ok) return undefined;
    const base64 = Buffer.from(await res.arrayBuffer()).toString("base64");
    return `data:image/png;base64,${base64}`;
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
