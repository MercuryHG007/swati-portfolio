import Link from "next/link";
import { notFound } from "next/navigation";
import { ProtectedImage } from "@/components/cloudinary-image";
import {
  getArtworkBySlug,
  getArtworksBySeriesId,
  getStandaloneArtworks,
  getExhibitionsForArtwork,
} from "@/lib/queries";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/breadcrumbs";
import { PrevNextNav } from "@/components/prev-next-nav";
import { getPrevNext } from "@/lib/prev-next";
import { formatDateRange } from "@/lib/format";

export const revalidate = 60;

function formatDimensions(dimensions?: { height?: number; width?: number; depth?: number; unit?: string } | null) {
  if (!dimensions?.height || !dimensions?.width) return null;
  const { height, width, depth, unit = "cm" } = dimensions;
  const unitLabel = unit === "in" ? "inch" : unit;
  return depth ? `${height} × ${width} × ${depth} ${unitLabel}` : `${height} × ${width} ${unitLabel}`;
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
  // A series only has a public page while it's published — don't link to a 404.
  const seriesIsLinkable = artwork.series?.status === "published";

  // Prev/Next cycles within the artwork's own series when it has one, otherwise
  // across the site-wide standalone list — same scoping as how the artwork is browsed.
  const siblingArtworks = artwork.series
    ? await getArtworksBySeriesId(artwork.series._id)
    : await getStandaloneArtworks();
  const currentIndex = siblingArtworks.findIndex((a) => a.slug === slug);
  const siblings = getPrevNext(siblingArtworks, currentIndex);

  const exhibitions = await getExhibitionsForArtwork(artwork._id);

  const breadcrumbItems: BreadcrumbItem[] = [{ label: "Portfolio", href: "/portfolio" }];
  if (artwork.series) {
    breadcrumbItems.push({
      label: artwork.series.title,
      href: seriesIsLinkable ? `/portfolio/series/${artwork.series.slug}` : undefined,
    });
  }
  breadcrumbItems.push({ label: artwork.title });

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 py-16">
      <Breadcrumbs items={breadcrumbItems} />
      <div className="flex flex-col gap-6">
        {artwork.images?.map((image: { publicId: string; alt?: string; width: number; height: number }) => (
          <ProtectedImage
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
            {seriesIsLinkable ? (
              <Link href={`/portfolio/series/${artwork.series.slug}`} className="text-accent hover:underline">
                {artwork.series.title}
              </Link>
            ) : (
              <span className="text-foreground">{artwork.series.title}</span>
            )}{" "}
            series.
          </p>
        ) : null}

        {exhibitions.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-foreground">Exhibited in {exhibitions.length} exhibition{exhibitions.length === 1 ? "" : "s"}:</p>
            <ul className="flex flex-col gap-1 text-sm">
              {exhibitions.map((exhibition) => (
                <li key={exhibition.slug}>
                  <Link href={`/exhibitions/${exhibition.slug}`} className="text-accent hover:underline">
                    {exhibition.title}
                  </Link>{" "}
                  <span className="text-muted">
                    ({formatDateRange(exhibition.startDate, exhibition.endDate)})
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <PrevNextNav
        prev={siblings?.prev ? { href: `/artwork/${siblings.prev.slug}`, label: siblings.prev.title } : null}
        next={siblings?.next ? { href: `/artwork/${siblings.next.slug}`, label: siblings.next.title } : null}
      />
    </main>
  );
}
