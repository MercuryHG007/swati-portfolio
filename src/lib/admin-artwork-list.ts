import { DEFAULT_PAGE_SIZE, parseChoice, parsePage, parsePageSize, type PageSize } from "./admin-list";

export const SORT_KEYS = ["uploadNewest", "uploadOldest", "newest", "oldest", "title", "order"] as const;
export type SortKey = (typeof SORT_KEYS)[number];
export const DEFAULT_SORT: SortKey = "uploadNewest";

const STATUS_FILTERS = ["all", "featured", "published", "hidden"] as const;

export const ARTWORK_LIST_PARAM_KEYS = ["q", "status", "medium", "series", "sort", "page", "size"] as const;

export type ArtworkListQuery = {
  q: string;
  status: string;
  mediumId: string;
  seriesId: string;
  sort: SortKey;
  page: number;
  size: PageSize;
};

export const DEFAULT_ARTWORK_LIST_QUERY: ArtworkListQuery = {
  q: "",
  status: "all",
  mediumId: "all",
  seriesId: "all",
  sort: DEFAULT_SORT,
  page: 1,
  size: DEFAULT_PAGE_SIZE,
};

// Invalid or missing values fall back to the defaults, so a hand-edited URL never breaks the list.
export function parseArtworkListQuery(params: URLSearchParams): ArtworkListQuery {
  return {
    q: params.get("q") ?? "",
    status: parseChoice(params.get("status"), STATUS_FILTERS, "all"),
    mediumId: params.get("medium") ?? "all",
    seriesId: params.get("series") ?? "all",
    sort: parseChoice(params.get("sort"), SORT_KEYS, DEFAULT_SORT),
    page: parsePage(params.get("page")),
    size: parsePageSize(params.get("size")),
  };
}

// Only non-default filters are written, but sort and page are always present so the URL marks the list as user-driven.
export function serializeArtworkListQuery(query: ArtworkListQuery): URLSearchParams {
  const params = new URLSearchParams();
  // Not trimmed: trimming here would stop the user typing spaces into the search box.
  if (query.q) params.set("q", query.q);
  if (query.status !== "all") params.set("status", query.status);
  if (query.mediumId !== "all") params.set("medium", query.mediumId);
  if (query.seriesId !== "all") params.set("series", query.seriesId);
  params.set("sort", query.sort);
  params.set("page", String(query.page));
  if (query.size !== DEFAULT_PAGE_SIZE) params.set("size", String(query.size));
  return params;
}

export type FilterableArtwork = {
  title: string;
  year: number | null;
  status: string;
  featured: boolean;
  mediumId: string | null;
  seriesId: string | null;
  uploadedAt: number;
};

// Years sort with unknown years last, whichever direction is chosen.
function byYear<T extends FilterableArtwork>(direction: 1 | -1) {
  return (a: T, b: T) => {
    if (a.year == null && b.year == null) return 0;
    if (a.year == null) return 1;
    if (b.year == null) return -1;
    return (a.year - b.year) * direction;
  };
}

export function filterAndSortArtworks<T extends FilterableArtwork>(artworks: T[], query: ArtworkListQuery): T[] {
  const q = query.q.trim().toLowerCase();
  const list = artworks.filter(
    (a) =>
      (!q || a.title.toLowerCase().includes(q)) &&
      (query.status === "all" || (query.status === "featured" ? a.featured : a.status === query.status)) &&
      (query.mediumId === "all" || a.mediumId === query.mediumId) &&
      (query.seriesId === "all" || (query.seriesId === "standalone" ? !a.seriesId : a.seriesId === query.seriesId))
  );
  switch (query.sort) {
    case "order":
      return list;
    case "title":
      return [...list].sort((a, b) => a.title.localeCompare(b.title));
    case "uploadNewest":
      return [...list].sort((a, b) => b.uploadedAt - a.uploadedAt);
    case "uploadOldest":
      return [...list].sort((a, b) => a.uploadedAt - b.uploadedAt);
    case "newest":
      return [...list].sort(byYear<T>(-1));
    case "oldest":
      return [...list].sort(byYear<T>(1));
  }
}
