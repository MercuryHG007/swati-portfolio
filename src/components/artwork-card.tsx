import Link from "next/link";
import { CardTitle } from "@/components/card-title/card-title";
import { ProtectedImage } from "@/components/cloudinary-image";
import { FadeInImage } from "@/components/fade-in-image";

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
  id?: string;
  dataIndex?: number;
  // Width ÷ height. Omitted, the image box stays 4:5.
  aspectRatio?: number;
  sizes?: string;
  // Without the caption, the link is named by aria-label so screen readers still get the title.
  showCaption?: boolean;
  // Fades the image in once it has loaded.
  fadeIn?: boolean;
};

export function ArtworkCard({
  slug,
  title,
  year,
  image,
  priority = false,
  id,
  dataIndex,
  aspectRatio,
  sizes = "(min-width: 768px) 25vw, 50vw",
  showCaption = true,
  fadeIn = false,
}: ArtworkCardProps) {
  const imageClass =
    "scale-[1.05] object-cover transition duration-500 ease-out group-hover:scale-100 group-focus-visible:scale-100 motion-reduce:scale-100 motion-reduce:transition-none";
  const ImageComponent = fadeIn ? FadeInImage : ProtectedImage;
  return (
    <Link
      href={`/artwork/${slug}`}
      id={id}
      data-index={dataIndex}
      aria-label={showCaption ? undefined : title}
      className="group block"
    >
      <div
        className={`relative overflow-hidden rounded-md bg-surface${aspectRatio ? "" : " aspect-[4/5]"}`}
        style={aspectRatio ? { aspectRatio } : undefined}
      >
        {image ? (
          <ImageComponent
            src={image.publicId}
            alt={image.alt || title}
            fill
            crop="fill"
            gravity="auto"
            sizes={sizes}
            className={imageClass}
            loading={priority ? "eager" : "lazy"}
          />
        ) : null}
      </div>
      {showCaption && (
        <>
          <p className="mt-2 text-sm text-foreground">
            <CardTitle>{title}</CardTitle>
          </p>
          {year ? <p className="text-xs text-muted">{year}</p> : null}
        </>
      )}
    </Link>
  );
}
