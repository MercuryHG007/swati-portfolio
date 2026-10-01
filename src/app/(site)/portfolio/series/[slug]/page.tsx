import { notFound } from "next/navigation";
import { getSeriesBySlug, getArtworksBySeriesId, getPublishedSeries } from "@/lib/queries";
import { ArtworkCard } from "@/components/artwork-card";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { PrevNextNav } from "@/components/prev-next-nav";
import { getPrevNext } from "@/lib/prev-next";
import { getYear } from "@/lib/format";

export const revalidate = 60;

export default async function SeriesDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const series = await getSeriesBySlug(slug);
  if (!series) notFound();

  const [artworks, allSeries] = await Promise.all([getArtworksBySeriesId(series._id), getPublishedSeries()]);
  const currentIndex = allSeries.findIndex((s) => s.slug === slug);
  const siblings = getPrevNext(allSeries, currentIndex);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-16">
      <Breadcrumbs items={[{ label: "Portfolio", href: "/portfolio" }, { label: series.title }]} />
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold text-foreground">{series.title}</h1>
        {series.description ? <p className="max-w-2xl text-muted">{series.description}</p> : null}
      </header>

      {artworks.length > 0 ? (
        <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
          {artworks.map((artwork) => (
            <ArtworkCard
              key={artwork.slug}
              slug={artwork.slug}
              title={artwork.title}
              year={getYear(artwork.dateMade)}
              image={artwork.images?.[0]}
            />
          ))}
        </div>
      ) : (
        <p className="text-muted">Work from this series is coming soon.</p>
      )}

      <PrevNextNav
        prev={siblings?.prev ? { href: `/portfolio/series/${siblings.prev.slug}`, label: siblings.prev.title } : null}
        next={siblings?.next ? { href: `/portfolio/series/${siblings.next.slug}`, label: siblings.next.title } : null}
      />
    </main>
  );
}
