"use client";

import { useState, type CSSProperties, type ComponentProps } from "react";
import { CldImage as BaseCldImage } from "next-cloudinary";

// next-cloudinary@6.19.3's dist bundle is missing the "use client" directive
// (its CldImage uses useState internally), which breaks it when imported
// straight into a Server Component. Wrapping it in this client module gives
// it a proper client boundary.

// If an image fails to load from Cloudinary, the fallback requests a resized copy from /api/media, which reads the
// R2 mirror. Cloudinary-only transforms (format, quality, gravity) are replaced by the route's defaults.
type CldImageProps = ComponentProps<typeof BaseCldImage>;

const MAX_EDGE = 2400;

function mirrorUrl(publicId: string, width: CldImageProps["width"], height: CldImageProps["height"], cover: boolean) {
  const params = new URLSearchParams({ w: String(Math.min(Number(width) || 1200, MAX_EDGE)) });
  if (height) params.set("h", String(Math.min(Number(height), MAX_EDGE)));
  if (cover) params.set("fit", "cover");
  return `/api/media/${publicId.split("/").map(encodeURIComponent).join("/")}?${params}`;
}

// Plain <img> for the fallback. `cover` keeps the crop that Cloudinary's `fill` mode would have produced.
function MirrorImage({
  src,
  alt,
  width,
  height,
  fill,
  crop,
  className,
  style,
  loading,
  draggable,
  onContextMenu,
  onLoad,
}: CldImageProps & { src: string }) {
  const cover = Boolean(fill) || crop === "fill";
  const fillStyle: CSSProperties | undefined = fill
    ? { position: "absolute", inset: 0, width: "100%", height: "100%" }
    : undefined;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- next/image would optimise via the loader, defeating the fallback
    <img
      src={mirrorUrl(src, width, height, cover)}
      alt={alt}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      className={className}
      style={{ ...fillStyle, objectFit: cover ? "cover" : undefined, ...style }}
      loading={loading}
      draggable={draggable}
      onContextMenu={onContextMenu}
      onLoad={onLoad}
    />
  );
}

export function CldImage(props: CldImageProps) {
  const [useMirror, setUseMirror] = useState(false);

  if (useMirror && typeof props.src === "string") {
    return <MirrorImage {...props} src={props.src} />;
  }

  return (
    <BaseCldImage
      {...props}
      onError={(event) => {
        props.onError?.(event);
        // Returning false stops CldImage's own retry polling, so the fallback shows right away.
        setUseMirror(true);
        return false;
      }}
    />
  );
}

// Deterrent (not real DRM) against casual right-click-save / drag / iOS
// long-press-save copying of artwork images — used on all public-facing
// artwork, series, exhibition and profile images.
export function ProtectedImage(props: CldImageProps) {
  return (
    <CldImage
      {...props}
      draggable={false}
      onContextMenu={(event) => event.preventDefault()}
      style={{ ...props.style, WebkitUserSelect: "none", WebkitTouchCallout: "none" }}
    />
  );
}

