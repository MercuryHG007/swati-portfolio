import {
  getPublishedSeries,
  getFeaturedSeries,
  getSeriesSettings,
  getStandaloneArtworks,
  getMediums,
  getSubjects,
} from "@/lib/queries";
import { ArtworkCard } from "@/components/artwork-card";
import { GridCarousel } from "@/components/grid-carousel/grid-carousel";
import { Pill } from "@/components/pill/pill";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { getYear } from "@/lib/format";

export const revalidate = 60;

export default async function PortfolioPage() {
  const [series, featuredSeries, seriesSettings, standalone, mediums, subjects] = await Promise.all([
    getPublishedSeries(),
    getFeaturedSeries(8),
    getSeriesSettings(),
    getStandaloneArtworks(),
    getMediums(),
    getSubjects(),
  ]);

  return (
    <main className="flex flex-1 flex-col gap-16 py-16">

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-16 px-6">
        <Breadcrumbs items={[{ label: "Portfolio" }]} />
      </div>

      {featuredSeries.length > 0 && (
        <GridCarousel
          heading={seriesSettings.heading}
          body={seriesSettings.body}
          ctaLabel={seriesSettings.ctaLabel}
          ctaHref="/series"
          items={featuredSeries.map((s) => ({
            href: `/portfolio/series/${s.slug}`,
            title: s.title,
            image: s.coverImage ? { publicId: s.coverImage.publicId, alt: s.coverImage.alt } : null,
          }))}
        />
      )}

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-16 px-6">
        <header className="flex flex-col gap-3">
          <h1 className="text-3xl font-medium text-foreground">Portfolio</h1>
          <p className="max-w-2xl text-muted">
            Browse by series, or filter across the full body of work by medium or subject.
          </p>
          {(mediums.length > 0 || subjects.length > 0) && (
            <div className="mt-2 flex flex-wrap gap-2">
              {mediums.map((medium) => (
                <Pill key={medium.slug} href={`/portfolio/medium/${medium.slug}`}>
                  {medium.name}
                </Pill>
              ))}
              {subjects.map((subject) => (
                <Pill key={subject.slug} href={`/portfolio/subject/${subject.slug}`}>
                  {subject.name}
                </Pill>
              ))}
            </div>
          )}
        </header>
      </div>

      {standalone.length > 0 && (
        <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6">
          <h2 className="text-lg font-medium text-foreground">More work</h2>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
            {standalone.map((artwork, index) => (
              <ArtworkCard
                key={artwork.slug}
                slug={artwork.slug}
                title={artwork.title}
                year={getYear(artwork.dateMade)}
                image={artwork.images?.[0]}
                priority={index === 0 && series.length === 0}
              />
            ))}
          </div>
        </section>
      )}

      {series.length === 0 && standalone.length === 0 && (
        <p className="mx-auto w-full max-w-5xl px-6 text-muted">New work coming soon.</p>
      )}
    </main>
  );
}
