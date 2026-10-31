import { ProtectedImage } from "@/components/cloudinary-image";

// Square preview for admin list rows. Shows an empty tile until the item has an image.
export function AdminThumbnail({ image, alt }: { image?: { publicId: string; alt?: string } | null; alt: string }) {
  return (
    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-background">
      {image ? (
        <ProtectedImage
          src={image.publicId}
          alt={image.alt || alt}
          fill
          crop="fill"
          gravity="auto"
          sizes="48px"
          className="object-cover"
          loading="lazy"
        />
      ) : null}
    </div>
  );
}
