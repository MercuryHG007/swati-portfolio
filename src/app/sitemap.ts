import type { MetadataRoute } from "next";
import { getSitemapEntries } from "@/lib/queries";
import { absoluteUrl, isIndexableDeployment } from "@/lib/seo";

export const revalidate = 60;

const STATIC_PATHS = ["/", "/about", "/portfolio", "/series", "/exhibitions", "/contact"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Preview and UAT deployments list nothing, matching their noindex and disallow-all robots rules.
  if (!isIndexableDeployment()) return [];

  const { artworks, series, exhibitions } = await getSitemapEntries();
  return [
    ...STATIC_PATHS.map((path) => ({ url: absoluteUrl(path) })),
    ...artworks.map((artwork) => ({
      url: absoluteUrl(`/artwork/${artwork.slug}`),
      lastModified: artwork.updatedAt,
    })),
    ...series.map((item) => ({
      url: absoluteUrl(`/portfolio/series/${item.slug}`),
      lastModified: item.updatedAt,
    })),
    ...exhibitions.map((exhibition) => ({
      url: absoluteUrl(`/exhibitions/${exhibition.slug}`),
      lastModified: exhibition.updatedAt,
    })),
  ];
}
