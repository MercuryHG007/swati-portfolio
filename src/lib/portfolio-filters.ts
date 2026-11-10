// Shared by the server queries and the client filter UI, so this module must not import server-only code.

// Works per request. Each "load more" asks for the next page of this size.
export const PORTFOLIO_PAGE_SIZE = 12;

// Thresholds apply to the longest side in inches. `min` is exclusive and `max` is inclusive.
export const SIZE_BUCKETS = {
  small: { label: "Small", hint: "up to 12 in", max: 12 },
  medium: { label: "Medium", hint: "13–24 in", min: 12, max: 24 },
  large: { label: "Large", hint: "over 24 in", min: 24 },
} satisfies Record<string, { label: string; hint: string; min?: number; max?: number }>;

export type SizeKey = keyof typeof SIZE_BUCKETS;
export const SIZE_KEYS = Object.keys(SIZE_BUCKETS) as SizeKey[];

export function isSizeKey(value: string): value is SizeKey {
  return SIZE_KEYS.includes(value as SizeKey);
}

export type FilterKey = "medium" | "subject" | "size";

// Slugs for medium and subject, bucket keys for size. Lists are OR-ed within a filter and AND-ed across filters.
export type PortfolioFilters = Record<FilterKey, string[]>;

export type PortfolioCard = {
  slug: string;
  title: string;
  // Dimensions are optional so responses cached before they were sent still render (see heightRatio).
  image: { publicId: string; alt?: string; width?: number; height?: number } | null;
};

export type PortfolioPageResponse = {
  items: PortfolioCard[];
  page: number;
  hasMore: boolean;
  total: number;
  // The order seed these items were drawn with. Later pages must use the same seed.
  seed: string;
};

export type FacetOption = {
  value: string;
  label: string;
  hint?: string;
  count: number;
};

export type PortfolioFacets = {
  mediums: FacetOption[];
  subjects: FacetOption[];
  sizes: FacetOption[];
};

type SearchInput = URLSearchParams | Record<string, string | string[] | undefined>;

function readValues(input: SearchInput, key: string): string[] {
  const raw = input instanceof URLSearchParams ? input.getAll(key) : [input[key]].flat();
  const values = raw
    .filter((value): value is string => typeof value === "string")
    .flatMap((value) => value.split(","))
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(values)];
}

export function parsePortfolioFilters(input: SearchInput): PortfolioFilters {
  return {
    medium: readValues(input, "medium"),
    subject: readValues(input, "subject"),
    size: readValues(input, "size").filter(isSizeKey),
  };
}

export function portfolioSearchParams(filters: PortfolioFilters): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of ["medium", "subject", "size"] as const) {
    if (filters[key].length > 0) params.set(key, filters[key].join(","));
  }
  return params;
}

export function hasPortfolioFilters(filters: PortfolioFilters) {
  return filters.medium.length + filters.subject.length + filters.size.length > 0;
}

export const EMPTY_PORTFOLIO_FILTERS: PortfolioFilters = { medium: [], subject: [], size: [] };
