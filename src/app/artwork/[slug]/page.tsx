import Link from "next/link";
import { notFound } from "next/navigation";
import { CldImage } from "@/components/cloudinary-image";
import { getArtworkBySlug } from "@/lib/queries";

export const revalidate = 60;

function formatDimensions(dimensions?: { height?: number; width?: number; depth?: number; unit?: string } | null) {
  if (!dimensions?.height || !dimensions?.width) return null;
  const { height, width, depth, unit = "cm" } = dimensions;
  return depth ? `${height} × ${width} × ${depth} ${unit}` : `${height} × ${width} ${unit}`;
}

export default async function ArtworkDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artwork = await getArtworkBySlug(slug);
  if (!artwork) notFound();

  const dimensions = formatDimensions(artwork.dimensions);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 py-16">
      <div className="flex flex-col gap-6">
        {artwork.images?.map((image: { publicId: string; alt?: string; width: number; height: number }) => (
          <CldImage
            key={image.publicId}
            src={image.publicId}
            alt={image.alt || artwork.title}
            width={image.width}
            height={image.height}
            sizes="(min-width: 768px) 768px, 100vw"
            className="h-auto w-full rounded-md"
          />
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold text-foreground">{artwork.title}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          {artwork.year ? <span>{artwork.year}</span> : null}
          {artwork.medium ? (
            <>
              <span aria-hidden>·</span>
              <Link href={`/portfolio/medium/${artwork.medium.slug}`} className="hover:text-accent">
                {artwork.medium.name}
              </Link>
            </>
          ) : null}
          {dimensions ? (
            <>
              <span aria-hidden>·</span>
              <span>{dimensions}</span>
            </>
          ) : null}
        </div>

        {artwork.subjects?.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {artwork.subjects.map((subject: { slug: string; name: string }) => (
              <Link
                key={subject.slug}
                href={`/portfolio/subject/${subject.slug}`}
                className="rounded-full border border-border px-3 py-1 text-xs text-foreground hover:border-accent hover:text-accent"
              >
                {subject.name}
              </Link>
            ))}
          </div>
        ) : null}

        {artwork.description ? <p className="max-w-2xl text-muted">{artwork.description}</p> : null}

        {artwork.series ? (
          <p className="text-sm text-muted">
            Part of the{" "}
            <Link href={`/portfolio/series/${artwork.series.slug}`} className="text-accent hover:underline">
              {artwork.series.title}
            </Link>{" "}
            series.
          </p>
        ) : null}
      </div>
    </main>
  );
}
