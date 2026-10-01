"use client";

import { useEffect, useState } from "react";
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
  const [isMobile, setIsMobile] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  if (images.length === 0) return null;

  const hasMultiple = images.length > 1;

  return (
    <div className="flex flex-col gap-6">
      {images.map((image, index) => (
        <button
          key={image.publicId}
          type="button"
          disabled={!isMobile}
          onClick={() => setOpenIndex(index)}
          aria-label={`Zoom into image ${index + 1} of ${images.length}`}
          className={`block w-full border-0 bg-transparent p-0 text-left ${isMobile ? "cursor-zoom-in" : "cursor-default"}`}
        >
          <ProtectedImage
            src={image.publicId}
            alt={image.alt || title}
            width={image.width}
            height={image.height}
            sizes="(min-width: 768px) 768px, 100vw"
            className="h-auto w-full rounded-md"
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
        zoom={{ maxZoomPixelRatio: 3 }}
        render={hasMultiple ? undefined : { buttonPrev: () => null, buttonNext: () => null }}
      />
    </div>
  );
}
