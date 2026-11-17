"use client";

import { useState, type CSSProperties, type ComponentProps } from "react";
import { CldImage as BaseCldImage } from "next-cloudinary";

// next-cloudinary@6.19.3's dist bundle is missing the "use client" directive
// (its CldImage uses useState internally), which breaks it when imported
// straight into a Server Component. Wrapping it in this client module gives
// it a proper client boundary.

// Public base URL of the R2 mirror (see scripts/mirror-cloudinary-to-r2.mjs). If an image fails to load from
// Cloudinary, the browser requests the original file from here instead. Unset means no fallback.
const MIRROR_BASE_URL = process.env.NEXT_PUBLIC_MEDIA_MIRROR_URL?.replace(/\/+$/, "");

type CldImageProps = ComponentProps<typeof BaseCldImage>;

function mirrorUrl(publicId: string) {
  return `${MIRROR_BASE_URL}/${publicId.split("/").map(encodeURIComponent).join("/")}`;
}

// Plain <img> for the fallback. Cloudinary-only transforms (format, quality, gravity) don't apply, so the
// original file is shown. `cover` keeps the crop that Cloudinary's `fill` mode would have produced.
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
}: CldImageProps & { src: string }) {
  const cover = Boolean(fill) || crop === "fill";
  const fillStyle: CSSProperties | undefined = fill
    ? { position: "absolute", inset: 0, width: "100%", height: "100%" }
    : undefined;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- next/image would optimise via the loader, defeating the fallback
    <img
      src={mirrorUrl(src)}
      alt={alt}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      className={className}
      style={{ ...fillStyle, objectFit: cover ? "cover" : undefined, ...style }}
      loading={loading}
      draggable={draggable}
      onContextMenu={onContextMenu}
    />
  );
}

export function CldImage(props: CldImageProps) {
  const [useMirror, setUseMirror] = useState(false);

  if (useMirror && MIRROR_BASE_URL && typeof props.src === "string") {
    return <MirrorImage {...props} src={props.src} />;
  }

  return (
    <BaseCldImage
      {...props}
      onError={(event) => {
        props.onError?.(event);
        if (!MIRROR_BASE_URL) return;
        // Returning false stops CldImage's own retry polling, so the mirror shows right away.
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

