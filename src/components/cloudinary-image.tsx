"use client";

import { CldImage as BaseCldImage } from "next-cloudinary";
import type { ComponentProps } from "react";

// next-cloudinary@6.19.3's dist bundle is missing the "use client" directive
// (its CldImage uses useState internally), which breaks it when imported
// straight into a Server Component. Re-exporting through this client module
// gives it a proper client boundary.
export { CldImage } from "next-cloudinary";

// Deterrent (not real DRM) against casual right-click-save / drag / iOS
// long-press-save copying of artwork images — used on all public-facing
// artwork, series, exhibition and profile images.
export function ProtectedImage(props: ComponentProps<typeof BaseCldImage>) {
  return (
    <BaseCldImage
      {...props}
      draggable={false}
      onContextMenu={(event) => event.preventDefault()}
      style={{ ...props.style, WebkitUserSelect: "none", WebkitTouchCallout: "none" }}
    />
  );
}

