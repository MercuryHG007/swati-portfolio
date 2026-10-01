import Link from "next/link";
import { ProtectedImage } from "@/components/cloudinary-image";

type ArtworkCardImage = {
  publicId: string;
  alt?: string;
};

type ArtworkCardProps = {
  slug: string;
  title: string;
  year?: number | null;
  image?: ArtworkCardImage | null;
  priority?: boolean;
};

export function ArtworkCard({ slug, title, year, image, priority = false }: ArtworkCardProps) {
  return (
    <Link href={`/artwork/${slug}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-surface">
        {image ? (
          <ProtectedImage
            src={image.publicId}
            alt={image.alt || title}
            fill
            crop="fill"
            gravity="auto"
            sizes="(min-width: 768px) 25vw, 50vw"
            className="object-cover transition duration-300 group-hover:scale-105"
            loading={priority ? "eager" : "lazy"}
          />
        ) : null}
      </div>
      <p className="mt-2 text-sm text-foreground">{title}</p>
      {year ? <p className="text-xs text-muted">{year}</p> : null}
    </Link>
  );
}
