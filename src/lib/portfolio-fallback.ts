// Computes portfolio listings from the content snapshot when the database is unavailable. The rules mirror the
// Mongo queries in queries.ts (buildPortfolioMatch, getPortfolioPage, getPortfolioFacets), so both paths return the
// same items for the same filters and seed.
import {
  PORTFOLIO_PAGE_SIZE,
  SIZE_BUCKETS,
  SIZE_KEYS,
  isSizeKey,
  type PortfolioFacets,
  type PortfolioFilters,
  type PortfolioPageResponse,
  type SizeKey,
} from "@/lib/portfolio-filters";
import { seededShuffle } from "@/lib/portfolio-order";

export type CatalogueArtwork = {
  id: string;
  slug: string;
  title: string;
  medium: string | null;
  subjects: string[];
  dimensions: { width?: number; height?: number; unit?: string } | null;
  image: { publicId: string; alt?: string; width?: number; height?: number } | null;
};

export type CatalogueTaxonomy = { _id: string; slug: string; name: string };

export type PortfolioSnapshotInput = {
  artworks: CatalogueArtwork[];
  mediums: CatalogueTaxonomy[];
  subjects: CatalogueTaxonomy[];
  mediumsWithWork: CatalogueTaxonomy[];
  subjectsWithWork: CatalogueTaxonomy[];
};

type Resolved = {
  mediumIds: string[] | null;
  subjectIds: string[] | null;
  size: SizeKey[];
};

const CM_PER_INCH = 2.54;

function resolveFilters(filters: PortfolioFilters, input: PortfolioSnapshotInput): Resolved {
  return {
    mediumIds:
      filters.medium.length > 0
        ? input.mediums.filter((medium) => filters.medium.includes(medium.slug)).map((medium) => medium._id)
        : null,
    subjectIds:
      filters.subject.length > 0
        ? input.subjects.filter((subject) => filters.subject.includes(subject.slug)).map((subject) => subject._id)
        : null,
    size: filters.size.filter(isSizeKey),
  };
}

function inBucket(longestInches: number, key: SizeKey) {
  const bounds: { min?: number; max?: number } = SIZE_BUCKETS[key];
  const aboveMin = bounds.min === undefined || longestInches > bounds.min;
  const belowMax = bounds.max === undefined || longestInches <= bounds.max;
  return aboveMin && belowMax;
}

function matches(artwork: CatalogueArtwork, resolved: Resolved): boolean {
  if (resolved.mediumIds) {
    if (artwork.medium === null || !resolved.mediumIds.includes(artwork.medium)) return false;
  }
  if (resolved.subjectIds) {
    const subjectIds = resolved.subjectIds;
    if (!artwork.subjects.some((id) => subjectIds.includes(id))) return false;
  }
  if (resolved.size.length > 0) {
    // Works without positive width and height can't be placed in a size bucket.
    const width = artwork.dimensions?.width;
    const height = artwork.dimensions?.height;
    if (!(width && width > 0) || !(height && height > 0)) return false;
    const longest = Math.max(width, height) * (artwork.dimensions?.unit === "cm" ? 1 / CM_PER_INCH : 1);
    if (!resolved.size.some((key) => inBucket(longest, key))) return false;
  }
  return true;
}

export function portfolioPageFromSnapshot(
  input: PortfolioSnapshotInput,
  filters: PortfolioFilters,
  page: number,
  seed: string,
  pageSize = PORTFOLIO_PAGE_SIZE
): PortfolioPageResponse {
  const resolved = resolveFilters(filters, input);
  const matching = input.artworks
    .filter((artwork) => matches(artwork, resolved))
    .map((artwork) => artwork.id)
    .sort();
  const ordered = seededShuffle(matching, seed, (id) => id);
  const pageIds = ordered.slice((page - 1) * pageSize, page * pageSize);
  const byId = new Map(input.artworks.map((artwork) => [artwork.id, artwork]));

  return {
    items: pageIds.flatMap((id) => {
      const artwork = byId.get(id);
      if (!artwork) return [];
      return [{ slug: artwork.slug, title: artwork.title, image: artwork.image }];
    }),
    page,
    hasMore: page * pageSize < ordered.length,
    total: ordered.length,
    seed,
  };
}

// Each facet counts with the other filters applied, as in getPortfolioFacets.
export function portfolioFacetsFromSnapshot(input: PortfolioSnapshotInput, filters: PortfolioFilters): PortfolioFacets {
  const resolved = resolveFilters(filters, input);

  return {
    mediums: input.mediumsWithWork.map((medium) => ({
      value: medium.slug,
      label: medium.name,
      count: input.artworks.filter(
        (artwork) => matches(artwork, { ...resolved, mediumIds: null }) && artwork.medium === medium._id
      ).length,
    })),
    subjects: input.subjectsWithWork.map((subject) => ({
      value: subject.slug,
      label: subject.name,
      count: input.artworks.filter(
        (artwork) => matches(artwork, { ...resolved, subjectIds: null }) && artwork.subjects.includes(subject._id)
      ).length,
    })),
    sizes: SIZE_KEYS.map((key) => ({
      value: key,
      label: SIZE_BUCKETS[key].label,
      hint: SIZE_BUCKETS[key].hint,
      count: input.artworks.filter((artwork) => matches(artwork, { ...resolved, size: [key] })).length,
    })),
  };
}
