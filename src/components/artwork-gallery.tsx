"use client";

import { useState } from "react";
import { ProtectedImage } from "@/components/media-image";
import { ArtworkLightbox, type LightboxSlide } from "@/components/artwork-lightbox/artwork-lightbox";
import { r2MediaUrl } from "@/lib/media-storage";

type GalleryImage = { publicId: string; alt?: string; width: number; height: number };

export function ArtworkGallery({ images, title }: { images: GalleryImage[]; title: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (images.length === 0) return null;

  // The lightbox takes plain URLs, so these are built here rather than by the image component.
  const slides: LightboxSlide[] = images.map((image) => ({
    src: r2MediaUrl(image.publicId, 2400),
    thumbSrc: r2MediaUrl(image.publicId, 320),
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
            sizes="(min-width: 1152px) 1104px, calc(100vw - 3rem)"
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
