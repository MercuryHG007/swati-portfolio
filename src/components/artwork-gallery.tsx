"use client";

import { useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Counter from "yet-another-react-lightbox/plugins/counter";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/counter.css";
import { ProtectedImage } from "@/components/cloudinary-image";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

type GalleryImage = { publicId: string; alt?: string; width: number; height: number };

// Lightbox slides need a direct image URL — CldImage/ProtectedImage only build one
// internally for Next's loader, so the raw delivery URL is constructed here instead.
function cloudinaryUrl(publicId: string) {
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto/${publicId}`;
}

export function ArtworkGallery({ images, title }: { images: GalleryImage[]; title: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (images.length === 0) return null;

  const hasMultiple = images.length > 1;

  return (
    <div className="flex flex-col gap-6">
      {images.map((image, index) => (
        <button
          key={image.publicId}
          type="button"
          onClick={() => setOpenIndex(index)}
          aria-label={`Zoom into image ${index + 1} of ${images.length}`}
          className="block w-full cursor-zoom-in border-0 bg-transparent p-0 text-left"
        >
          <ProtectedImage
            src={image.publicId}
            alt={image.alt || title}
            width={image.width}
            height={image.height}
            sizes="(min-width: 1152px) 1104px, 100vw"
            className="h-auto w-full rounded-md"
            // First image is the above-the-fold LCP element on this page; Next 16 recommends
            // `loading="eager"` here instead of the deprecated `priority` prop.
            loading={index === 0 ? "eager" : "lazy"}
          />
        </button>
      ))}

      <Lightbox
        open={openIndex !== null}
        close={() => setOpenIndex(null)}
        index={openIndex ?? 0}
        slides={images.map((image) => ({
          src: cloudinaryUrl(image.publicId),
          alt: image.alt || title,
          width: image.width,
          height: image.height,
        }))}
        plugins={hasMultiple ? [Zoom, Counter] : [Zoom]}
        zoom={{ maxZoomPixelRatio: 3, scrollToZoom: true }}
        render={hasMultiple ? undefined : { buttonPrev: () => null, buttonNext: () => null }}
      />
    </div>
  );
}
