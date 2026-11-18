"use client";

import { useState } from "react";
import { ProtectedImage } from "@/components/cloudinary-image";
import { ArtworkLightbox, type LightboxSlide } from "@/components/artwork-lightbox/artwork-lightbox";
import { cloudinaryDeliveryUrl } from "@/lib/media-options";
import { MEDIA_STORAGE, r2MediaUrl } from "@/lib/media-storage";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";

type GalleryImage = { publicId: string; alt?: string; width: number; height: number };

export function ArtworkGallery({ images, title }: { images: GalleryImage[]; title: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (images.length === 0) return null;

  // The lightbox takes plain URLs and has no retry, so these load straight from the active store.
  const slides: LightboxSlide[] = images.map((image) => ({
    src:
      MEDIA_STORAGE === "r2"
        ? r2MediaUrl(image.publicId, 2400)
        : cloudinaryDeliveryUrl(CLOUD_NAME, image.publicId, { width: 2400, fit: "inside", format: "auto" }),
    thumbSrc:
      MEDIA_STORAGE === "r2"
        ? r2MediaUrl(image.publicId, 320)
        : cloudinaryDeliveryUrl(CLOUD_NAME, image.publicId, { width: 176, height: 120, fit: "cover", format: "auto" }),
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
