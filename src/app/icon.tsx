import { ImageResponse } from "next/og";
import { getAbout } from "@/lib/queries";
import { cloudinaryImageUrl } from "@/lib/seo";

// Rebuilt from the footer logo every minute, so a new logo from the admin shows up without a redeploy.
export const revalidate = 60;
export const size = { width: 128, height: 128 };
export const contentType = "image/png";

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
    logo ? (
      <img src={logo} width={size.width} height={size.height} alt="" />
    ) : (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#000",
          color: "#fff",
          fontSize: 80,
        }}
      >
        S
      </div>
    ),
    { ...size },
  );
}
