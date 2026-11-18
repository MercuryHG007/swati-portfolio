"use client";

import Image, { type ImageLoaderProps } from "next/image";
import { useState, type ComponentProps, type CSSProperties } from "react";
import { cloudinaryDeliveryUrl, mediaUrl } from "@/lib/media-options";
import { MEDIA_STORAGE, r2MediaUrl } from "@/lib/media-storage";

// Images load straight from Cloudinary's CDN, one request each. If a load fails, the image is requested once more
// through the server (proxy=1), which falls back to the R2 mirror.
//
// The route only resizes, so crops are done in the browser. A `fill` image is returned whole and cropped by
// object-fit: cover, positioned by the gravity prop. This gives the same result from either source.
type ProtectedImageProps = Omit<ComponentProps<typeof Image>, "src" | "loader" | "quality" | "unoptimized"> & {
  src: string;
  crop?: "fill";
  gravity?: "auto" | "face";
  quality?: number | "auto";
  format?: string;
};

const OBJECT_POSITION: Record<NonNullable<ProtectedImageProps["gravity"]>, string> = {
  auto: "50% 50%",
  face: "50% 30%",
};

export function CldImage({ src, alt, crop, gravity, quality, format: _format, style, ...props }: ProtectedImageProps) {
  void _format; // The format is picked by Cloudinary (f_auto) on the direct path, or by the route on the fallback path.
  const [useProxy, setUseProxy] = useState(false);
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const loader = ({ width }: ImageLoaderProps) => {
    // R2 mode: each size is a pre-made file, so the loader only picks the nearest one.
    if (MEDIA_STORAGE === "r2") return r2MediaUrl(src, width);
    const options = { width, fit: "inside" as const, quality: typeof quality === "number" ? quality : undefined };
    // Healthy case: the browser loads Cloudinary directly, one request per image. Only after a failed load does the
    // image come through the server, which falls back to the R2 mirror.
    if (!useProxy && cloudName) return cloudinaryDeliveryUrl(cloudName, src, { ...options, format: "auto" });
    return mediaUrl(src, { ...options, proxy: true });
  };

  const cropStyle: CSSProperties | undefined =
    crop === "fill" ? { objectFit: "cover", objectPosition: OBJECT_POSITION[gravity ?? "auto"] } : undefined;

  return (
    <Image
      {...props}
      src={src}
      alt={alt}
      loader={loader}
      onError={(event) => {
        props.onError?.(event);
        // Cloudinary mode only: one retry through the server. Once proxied, a further failure is left alone.
        if (!useProxy && MEDIA_STORAGE === "cloudinary") setUseProxy(true);
      }}
      style={{ ...cropStyle, ...style }}
    />
  );
}

// Deterrent (not real DRM) against casual right-click-save / drag / iOS
// long-press-save copying of artwork images — used on all public-facing
// artwork, series, exhibition and profile images.
export function ProtectedImage(props: ProtectedImageProps) {
  return (
    <CldImage
      {...props}
      draggable={false}
      onContextMenu={(event) => event.preventDefault()}
      style={{ ...props.style, WebkitUserSelect: "none", WebkitTouchCallout: "none" }}
    />
  );
}

