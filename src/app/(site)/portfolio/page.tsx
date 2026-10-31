import {
  getFeaturedSeries,
  getSeriesSettings,
  getPortfolioFacets,
  getPortfolioPage,
  resolvePortfolioFilters,
} from "@/lib/queries";
import { GridCarousel } from "@/components/grid-carousel/grid-carousel";
import { PortfolioBrowser } from "@/components/portfolio/portfolio-browser";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { parsePortfolioFilters, portfolioSearchParams } from "@/lib/portfolio-filters";

type PortfolioPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PortfolioPage({ searchParams }: PortfolioPageProps) {
  const filters = parsePortfolioFilters(await searchParams);
  const resolved = await resolvePortfolioFilters(filters);
  const [featuredSeries, seriesSettings, firstPage, facets] = await Promise.all([
    getFeaturedSeries(8),
    getSeriesSettings(),
    getPortfolioPage(resolved, 1),
    getPortfolioFacets(resolved),
  ]);

  return (
    <main className="flex flex-1 flex-col gap-16 py-16">

      <div className="flex w-full flex-col px-6">
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

      <div className="flex w-full flex-col gap-10 px-6">
        <header id="portfolio" className="flex scroll-mt-24 flex-col gap-3">
          <h1 className="text-3xl font-medium text-foreground">Portfolio</h1>
          <p className="max-w-2xl text-muted">
            Browse by series, or filter the full body of work by medium, subject or size.
          </p>
        </header>

        <section aria-label="All paintings">
          <PortfolioBrowser
            key={portfolioSearchParams(filters).toString()}
            initialFilters={filters}
            initialFacets={facets}
            initialPage={firstPage}
          />
        </section>
      </div>
    </main>
  );
}
