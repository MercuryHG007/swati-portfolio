import { describe, expect, it } from "vitest";
import {
  DEFAULT_ARTWORK_LIST_QUERY,
  filterAndSortArtworks,
  paginate,
  parseArtworkListQuery,
  serializeArtworkListQuery,
  type FilterableArtwork,
} from "./admin-artwork-list";

type Item = FilterableArtwork & { id: string };

const artworks: Item[] = [
  { id: "a", title: "Dawn", year: 2024, status: "published", featured: true, mediumId: "w", seriesId: null, uploadedAt: 1 },
  { id: "b", title: "Dusk", year: null, status: "hidden", featured: false, mediumId: "a", seriesId: "s1", uploadedAt: 3 },
  { id: "c", title: "Noon", year: 2019, status: "published", featured: false, mediumId: "w", seriesId: "s1", uploadedAt: 2 },
];

describe("parseArtworkListQuery", () => {
  it("uses recent uploads first and page 1 when nothing is specified", () => {
    expect(parseArtworkListQuery(new URLSearchParams())).toEqual(DEFAULT_ARTWORK_LIST_QUERY);
    expect(DEFAULT_ARTWORK_LIST_QUERY.sort).toBe("uploadNewest");
  });

  it("falls back to defaults for invalid values", () => {
    const query = parseArtworkListQuery(
      new URLSearchParams("sort=bogus&page=-2&size=7&status=sold")
    );
    expect(query).toEqual(DEFAULT_ARTWORK_LIST_QUERY);
  });

  it("round-trips through serialize", () => {
    const query = { ...DEFAULT_ARTWORK_LIST_QUERY, q: "sea shore", status: "hidden", seriesId: "s1", page: 3, size: 50 as const };
    expect(parseArtworkListQuery(serializeArtworkListQuery(query))).toEqual(query);
  });
});

describe("serializeArtworkListQuery", () => {
  it("omits default filters but always writes sort and page", () => {
    expect(serializeArtworkListQuery(DEFAULT_ARTWORK_LIST_QUERY).toString()).toBe("sort=uploadNewest&page=1");
  });

  it("keeps spaces in the search text so the input can be typed into", () => {
    const params = serializeArtworkListQuery({ ...DEFAULT_ARTWORK_LIST_QUERY, q: "sea " });
    expect(params.get("q")).toBe("sea ");
  });
});

describe("filterAndSortArtworks", () => {
  it("sorts by upload date, newest first by default", () => {
    expect(filterAndSortArtworks(artworks, DEFAULT_ARTWORK_LIST_QUERY).map((a) => a.id)).toEqual(["b", "c", "a"]);
  });

  it("keeps the portfolio order when asked", () => {
    expect(filterAndSortArtworks(artworks, { ...DEFAULT_ARTWORK_LIST_QUERY, sort: "order" }).map((a) => a.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("puts unknown years last in both year directions", () => {
    expect(filterAndSortArtworks(artworks, { ...DEFAULT_ARTWORK_LIST_QUERY, sort: "newest" }).map((a) => a.id)).toEqual([
      "a",
      "c",
      "b",
    ]);
    expect(filterAndSortArtworks(artworks, { ...DEFAULT_ARTWORK_LIST_QUERY, sort: "oldest" }).map((a) => a.id)).toEqual([
      "c",
      "a",
      "b",
    ]);
  });

  it("matches the trimmed, case-insensitive title search", () => {
    expect(filterAndSortArtworks(artworks, { ...DEFAULT_ARTWORK_LIST_QUERY, q: "  DU " }).map((a) => a.id)).toEqual(["b"]);
  });

  it("filters by status, featured, medium and series", () => {
    const ids = (query: Partial<typeof DEFAULT_ARTWORK_LIST_QUERY>) =>
      filterAndSortArtworks(artworks, { ...DEFAULT_ARTWORK_LIST_QUERY, ...query }).map((a) => a.id);
    expect(ids({ status: "featured" })).toEqual(["a"]);
    expect(ids({ status: "published" })).toEqual(["c", "a"]);
    expect(ids({ mediumId: "w" })).toEqual(["c", "a"]);
    expect(ids({ seriesId: "standalone" })).toEqual(["a"]);
    expect(ids({ seriesId: "s1" })).toEqual(["b", "c"]);
  });
});

describe("paginate", () => {
  const items = Array.from({ length: 45 }, (_, index) => index);

  it("returns the requested page with its range", () => {
    expect(paginate(items, 2, 20)).toEqual({
      pageItems: items.slice(20, 40),
      page: 2,
      pageCount: 3,
      rangeStart: 21,
      rangeEnd: 40,
    });
  });

  it("clamps a page that no longer exists to the last page", () => {
    const result = paginate(items, 9, 20);
    expect(result.page).toBe(3);
    expect(result.pageItems).toEqual(items.slice(40));
    expect(result.rangeEnd).toBe(45);
  });

  it("reports an empty result as one empty page", () => {
    expect(paginate([], 4, 20)).toEqual({ pageItems: [], page: 1, pageCount: 1, rangeStart: 0, rangeEnd: 0 });
  });
});
