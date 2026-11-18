"use client";

import Image, { type ImageLoaderProps } from "next/image";
import { type ComponentProps, type CSSProperties } from "react";
import { r2MediaUrl } from "@/lib/media-storage";

// Images are pre-made WebP variants in the R2 media bucket, served from the public media domain. The loader picks
// the variant nearest to the width next/image asks for.
//
// Variants are not cropped, so a `fill` image is returned whole and cropped in the browser with object-fit: cover,
// positioned by the gravity prop.
type MediaImageProps = Omit<ComponentProps<typeof Image>, "src" | "loader" | "quality" | "unoptimized"> & {
  src: string;
  crop?: "fill";
  gravity?: "auto" | "face";
};

const OBJECT_POSITION: Record<NonNullable<MediaImageProps["gravity"]>, string> = {
  auto: "50% 50%",
  face: "50% 30%",
};

export function MediaImage({ src, alt, crop, gravity, style, ...props }: MediaImageProps) {
  const loader = ({ width }: ImageLoaderProps) => r2MediaUrl(src, width);

  const cropStyle: CSSProperties | undefined =
    crop === "fill" ? { objectFit: "cover", objectPosition: OBJECT_POSITION[gravity ?? "auto"] } : undefined;

  return <Image {...props} src={src} alt={alt} loader={loader} style={{ ...cropStyle, ...style }} />;
}

// Deterrent (not real DRM) against casual right-click-save / drag / iOS
// long-press-save copying of artwork images — used on all public-facing
// artwork, series, exhibition and profile images.
export function ProtectedImage(props: MediaImageProps) {
  return (
    <MediaImage
      {...props}
      draggable={false}
      onContextMenu={(event) => event.preventDefault()}
      style={{ ...props.style, WebkitUserSelect: "none", WebkitTouchCallout: "none" }}
    />
  );
}
