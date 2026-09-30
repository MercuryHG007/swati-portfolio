import Link from "next/link";
import { CldImage } from "@/components/cloudinary-image";

type ArtworkCardImage = {
  publicId: string;
  alt?: string;
};

type ArtworkCardProps = {
  slug: string;
  title: string;
  year?: number | null;
  image?: ArtworkCardImage | null;
};

export function ArtworkCard({ slug, title, year, image }: ArtworkCardProps) {
  return (
    <Link href={`/artwork/${slug}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-surface">
        {image ? (
          <CldImage
            src={image.publicId}
            alt={image.alt || title}
            fill
            crop="fill"
            gravity="auto"
            sizes="(min-width: 768px) 25vw, 50vw"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        ) : null}
      </div>
      <p className="mt-2 text-sm text-foreground">{title}</p>
      {year ? <p className="text-xs text-muted">{year}</p> : null}
    </Link>
  );
}
