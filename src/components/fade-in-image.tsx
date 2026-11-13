"use client";

import { useEffect, useRef, useState, type ComponentProps } from "react";
import { ProtectedImage } from "@/components/cloudinary-image";

// Fades in when the picture has loaded. A CSS animation starts as soon as the element renders, so on a slow
// connection it would finish before the image arrives and the picture would just pop in.
export function FadeInImage(props: ComponentProps<typeof ProtectedImage>) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  // The image can finish before React attaches onLoad (e.g. from the HTML cache), so check once on mount.
  useEffect(() => {
    const img = wrapperRef.current?.querySelector("img");
    if (img?.complete && img.naturalWidth > 0) setLoaded(true);
  }, []);

  return (
    <div
      ref={wrapperRef}
      className={`absolute inset-0 transition-opacity duration-500 ease-out motion-reduce:transition-none ${
        loaded ? "opacity-100" : "opacity-0"
      }`}
    >
      <ProtectedImage {...props} onLoad={() => setLoaded(true)} />
    </div>
  );
}
