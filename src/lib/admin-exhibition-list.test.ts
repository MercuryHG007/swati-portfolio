import { describe, expect, it } from "vitest";
import {
  DEFAULT_EXHIBITION_LIST_QUERY,
  filterAndSortExhibitions,
  parseExhibitionListQuery,
  serializeExhibitionListQuery,
  type FilterableExhibition,
} from "./admin-exhibition-list";

type Item = FilterableExhibition & { id: string };

const exhibitions: Item[] = [
  { id: "a", title: "Spring Show", venue: "Gallery North", status: "published", startTime: 300, uploadedAt: 1 },
  { id: "b", title: "Winter Light", venue: "Harbour Hall", status: "hidden", startTime: 100, uploadedAt: 3 },
  { id: "c", title: "Autumn Lines", venue: "Gallery North", status: "published", startTime: 200, uploadedAt: 2 },
];

describe("parseExhibitionListQuery", () => {
  it("defaults to date, newest, on page 1", () => {
    expect(parseExhibitionListQuery(new URLSearchParams())).toEqual(DEFAULT_EXHIBITION_LIST_QUERY);
    expect(DEFAULT_EXHIBITION_LIST_QUERY.sort).toBe("newest");
  });

  it("falls back to defaults for invalid values", () => {
    expect(parseExhibitionListQuery(new URLSearchParams("sort=bogus&status=sold&page=x&size=3"))).toEqual(
      DEFAULT_EXHIBITION_LIST_QUERY
    );
  });

  it("round-trips through serialize", () => {
    const query = { ...DEFAULT_EXHIBITION_LIST_QUERY, q: "gallery north ", status: "hidden", sort: "title" as const, page: 2, size: 50 as const };
    expect(parseExhibitionListQuery(serializeExhibitionListQuery(query))).toEqual(query);
  });
});

describe("serializeExhibitionListQuery", () => {
  it("omits default filters but always writes sort and page", () => {
    expect(serializeExhibitionListQuery(DEFAULT_EXHIBITION_LIST_QUERY).toString()).toBe("sort=newest&page=1");
  });
});

describe("filterAndSortExhibitions", () => {
  const ids = (query: Partial<typeof DEFAULT_EXHIBITION_LIST_QUERY>) =>
    filterAndSortExhibitions(exhibitions, { ...DEFAULT_EXHIBITION_LIST_QUERY, ...query }).map((e) => e.id);

  it("sorts by date, newest first by default", () => {
    expect(ids({})).toEqual(["a", "c", "b"]);
    expect(ids({ sort: "oldest" })).toEqual(["b", "c", "a"]);
  });

  it("sorts by upload date and title", () => {
    expect(ids({ sort: "uploadNewest" })).toEqual(["b", "c", "a"]);
    expect(ids({ sort: "uploadOldest" })).toEqual(["a", "c", "b"]);
    expect(ids({ sort: "title" })).toEqual(["c", "a", "b"]);
  });

  it("searches title and venue, ignoring case and surrounding spaces", () => {
    expect(ids({ q: "  WINTER " })).toEqual(["b"]);
    expect(ids({ q: "harbour" })).toEqual(["b"]);
    expect(ids({ q: "gallery north" })).toEqual(["a", "c"]);
  });

  it("filters by status", () => {
    expect(ids({ status: "hidden" })).toEqual(["b"]);
    expect(ids({ status: "published" })).toEqual(["a", "c"]);
  });
});
