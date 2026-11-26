import { DEFAULT_PAGE_SIZE, parseChoice, parsePage, parsePageSize, type PageSize } from "./admin-list";

export const EXHIBITION_SORT_KEYS = ["newest", "oldest", "title", "uploadNewest", "uploadOldest"] as const;
export type ExhibitionSortKey = (typeof EXHIBITION_SORT_KEYS)[number];
export const DEFAULT_EXHIBITION_SORT: ExhibitionSortKey = "newest";

const STATUS_FILTERS = ["all", "published", "hidden"] as const;

export const EXHIBITION_LIST_PARAM_KEYS = ["q", "status", "sort", "page", "size"] as const;

export type ExhibitionListQuery = {
  q: string;
  status: string;
  sort: ExhibitionSortKey;
  page: number;
  size: PageSize;
};

export const DEFAULT_EXHIBITION_LIST_QUERY: ExhibitionListQuery = {
  q: "",
  status: "all",
  sort: DEFAULT_EXHIBITION_SORT,
  page: 1,
  size: DEFAULT_PAGE_SIZE,
};

export function parseExhibitionListQuery(params: URLSearchParams): ExhibitionListQuery {
  return {
    q: params.get("q") ?? "",
    status: parseChoice(params.get("status"), STATUS_FILTERS, "all"),
    sort: parseChoice(params.get("sort"), EXHIBITION_SORT_KEYS, DEFAULT_EXHIBITION_SORT),
    page: parsePage(params.get("page")),
    size: parsePageSize(params.get("size")),
  };
}

// Sort and page are always written so the URL marks the list as user-driven. Search text is not trimmed,
// so the search box keeps any spaces the user types.
export function serializeExhibitionListQuery(query: ExhibitionListQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.status !== "all") params.set("status", query.status);
  params.set("sort", query.sort);
  params.set("page", String(query.page));
  if (query.size !== DEFAULT_PAGE_SIZE) params.set("size", String(query.size));
  return params;
}

export type FilterableExhibition = {
  title: string;
  venue: string;
  status: string;
  startTime: number;
  uploadedAt: number;
};

export function filterAndSortExhibitions<T extends FilterableExhibition>(
  exhibitions: T[],
  query: ExhibitionListQuery
): T[] {
  const q = query.q.trim().toLowerCase();
  const list = exhibitions.filter(
    (e) =>
      (!q || e.title.toLowerCase().includes(q) || e.venue.toLowerCase().includes(q)) &&
      (query.status === "all" || e.status === query.status)
  );
  switch (query.sort) {
    case "title":
      return [...list].sort((a, b) => a.title.localeCompare(b.title));
    case "uploadNewest":
      return [...list].sort((a, b) => b.uploadedAt - a.uploadedAt);
    case "uploadOldest":
      return [...list].sort((a, b) => a.uploadedAt - b.uploadedAt);
    case "newest":
      return [...list].sort((a, b) => b.startTime - a.startTime);
    case "oldest":
      return [...list].sort((a, b) => a.startTime - b.startTime);
  }
}
