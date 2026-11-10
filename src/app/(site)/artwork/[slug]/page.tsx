import { Fragment, type ReactNode } from "react";
import type { Metadata } from "next";
import { Button } from "@/components/button/button";
import { TextLink } from "@/components/text-link/text-link";
import { notFound } from "next/navigation";
import {
  getArtworkBySlug,
  getArtworksBySeriesId,
  getStandaloneArtworks,
  getExhibitionsForArtwork,
} from "@/lib/queries";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/breadcrumbs";
import { Pill } from "@/components/pill/pill";
import { PrevNextNav } from "@/components/prev-next-nav";
import { ArtworkGallery } from "@/components/artwork-gallery";
import { TrackOnMount } from "@/components/analytics/track-on-mount";
import { getPrevNext } from "@/lib/prev-next";
import { formatDateRange, getYear } from "@/lib/format";

export const revalidate = 60;

function formatDimensions(dimensions?: { height?: number; width?: number; unit?: string } | null) {
  if (!dimensions?.height || !dimensions?.width) return null;
  const { height, width, unit = "cm" } = dimensions;
  const unitLabel = unit === "in" ? "inch" : unit;
  return `${height} × ${width} ${unitLabel}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const artwork = await getArtworkBySlug(slug);
  if (!artwork) return {};

  const description = artwork.seoDescription || artwork.description || undefined;
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const cover = artwork.images?.[0];
  const image = cloudName && cover
    ? `https://res.cloudinary.com/${cloudName}/image/upload/c_limit,w_1200/${cover.publicId}`
    : undefined;

  return {
    title: `${artwork.title} — Swati Garg`,
    description,
    openGraph: {
      title: artwork.title,
      description,
      ...(image && { images: [{ url: image, alt: cover?.alt || artwork.title }] }),
    },
  };
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
  // Only the values that exist become parts, so the separators never lead, trail or double up.
  const metaParts: ReactNode[] = [];
  const year = getYear(artwork.dateMade);
  if (year) metaParts.push(<span>{year}</span>);
  if (artwork.medium) {
    metaParts.push(
      <TextLink href={`/portfolio?medium=${encodeURIComponent(artwork.medium.slug)}#portfolio`} variant="primary">
        {artwork.medium.name}
      </TextLink>
    );
  }
  if (dimensions) metaParts.push(<span>{dimensions}</span>);
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
  const enquireHref = `/contact?artwork=${encodeURIComponent(artwork.slug)}`;

  const breadcrumbItems: BreadcrumbItem[] = [{ label: "Portfolio", href: "/portfolio" }];
  if (artwork.series) {
    breadcrumbItems.push({
      label: artwork.series.title,
      href: seriesIsLinkable ? `/portfolio/series/${artwork.series.slug}` : undefined,
    });
  }
  breadcrumbItems.push({ label: artwork.title });

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-16">
      <TrackOnMount
        event="view_item"
        params={{
          items: [{
            item_id: artwork.slug,
            item_name: artwork.title,
            item_category: artwork.medium?.name,
            item_category2: artwork.series?.title,
          }],
        }}
      />
      <Breadcrumbs items={breadcrumbItems} />
      <ArtworkGallery images={artwork.images ?? []} title={artwork.title} />

      <div className="flex flex-col gap-3">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:justify-between">
          <h1 className="text-2xl font-medium text-foreground">{artwork.title}</h1>
          <div className="hidden sm:block">
            <Button href={enquireHref} size="sm" variant="inverse" className="shrink-0">
              Enquire about this work
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          {metaParts.map((part, index) => (
            <Fragment key={index}>
              {index > 0 ? <span aria-hidden>·</span> : null}
              {part}
            </Fragment>
          ))}
        </div>

        {artwork.subjects?.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {artwork.subjects.map((subject: { slug: string; name: string }) => (
                <Pill key={subject.slug} href={`/portfolio?subject=${encodeURIComponent(subject.slug)}#portfolio`}>
                  {subject.name}
                </Pill>
            ))}
          </div>
        ) : null}

        {artwork.description ? <p className="max-w-2xl text-muted">{artwork.description}</p> : null}

        {artwork.series ? (
          <p className="text-sm text-muted">
            Part of the{" "}
            {seriesIsLinkable ? (
              <TextLink href={`/portfolio/series/${artwork.series.slug}`} variant="primary" className="text-accent">
                {artwork.series.title}
              </TextLink>
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
                  <TextLink href={`/exhibitions/${exhibition.slug}`} variant="primary" className="text-accent">
                    {exhibition.title}
                  </TextLink>{" "}
                  <span className="text-muted">
                    ({formatDateRange(exhibition.startDate, exhibition.endDate)})
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="sm:hidden">
          <Button href={enquireHref} size="sm" variant="inverse">
            Enquire about this work
          </Button>
        </div>
      </div>

      <PrevNextNav
        prev={siblings?.prev ? { href: `/artwork/${siblings.prev.slug}`, label: siblings.prev.title } : null}
        next={siblings?.next ? { href: `/artwork/${siblings.next.slug}`, label: siblings.next.title } : null}
      />
    </main>
  );
}
