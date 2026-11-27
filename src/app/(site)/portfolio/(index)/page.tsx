import {
  getCachedFeaturedSeriesCards,
  getCachedSeriesSettings,
  getCachedPortfolioFacets,
  getCachedPortfolioPage,
} from "@/lib/queries";
import { GridCarousel } from "@/components/grid-carousel/grid-carousel";
import { PortfolioBrowser } from "@/components/portfolio/portfolio-browser";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { parsePortfolioFilters, portfolioSearchParams } from "@/lib/portfolio-filters";
import { dailySeed } from "@/lib/portfolio-order";
import { JsonLd } from "@/components/json-ld";
import type { Metadata } from "next";
import { collectionJsonLd, pageMetadata } from "@/lib/seo";
import { getPortfolioDescription } from "@/lib/site-copy";

// Filter and sort parameters share this canonical URL, so each filtered view isn't indexed separately.
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: "Portfolio — Swati Garg",
    description: await getPortfolioDescription(),
    path: "/portfolio",
  });
}

type PortfolioPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PortfolioPage({ searchParams }: PortfolioPageProps) {
  const filters = parsePortfolioFilters(await searchParams);
  const [featuredSeries, seriesSettings, firstPage, facets] = await Promise.all([
    getCachedFeaturedSeriesCards(),
    getCachedSeriesSettings(),
    getCachedPortfolioPage(filters, 1, dailySeed()),
    getCachedPortfolioFacets(filters),
  ]);

  const description = await getPortfolioDescription();

  return (
    <main className="flex flex-1 flex-col gap-8 py-16">
      <JsonLd data={collectionJsonLd({ name: "Portfolio", description, path: "/portfolio" })} />

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
            image: s.image,
          }))}
        />
      )}

      <div className="flex w-full flex-col gap-4 px-6">
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
