"use client";

import { useState } from "react";
import { ProtectedImage } from "@/components/cloudinary-image";
import { ArtworkLightbox, type LightboxSlide } from "@/components/artwork-lightbox/artwork-lightbox";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

type GalleryImage = { publicId: string; alt?: string; width: number; height: number };

// Lightbox slides need direct image URLs — CldImage/ProtectedImage only build one
// internally for Next's loader, so the raw delivery URLs are constructed here instead.
function cloudinaryUrl(publicId: string, transformations = "f_auto,q_auto") {
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transformations}/${publicId}`;
}

export function ArtworkGallery({ images, title }: { images: GalleryImage[]; title: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (images.length === 0) return null;

  const slides: LightboxSlide[] = images.map((image) => ({
    src: cloudinaryUrl(image.publicId),
    thumbSrc: cloudinaryUrl(image.publicId, "f_auto,q_auto,c_fill,w_176,h_120"),
    alt: image.alt || title,
    width: image.width,
    height: image.height,
  }));

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

      {openIndex !== null && (
        <ArtworkLightbox
          slides={slides}
          title={title}
          initialIndex={openIndex}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </div>
  );
}
