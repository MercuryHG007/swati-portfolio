import { describe, expect, it } from "vitest";
import { paginate, parseChoice, parsePage, parsePageSize } from "./admin-list";

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

describe("URL value parsing", () => {
  it("accepts only listed choices", () => {
    expect(parseChoice("hidden", ["all", "hidden"], "all")).toBe("hidden");
    expect(parseChoice("sold", ["all", "hidden"], "all")).toBe("all");
    expect(parseChoice(null, ["all", "hidden"], "all")).toBe("all");
  });

  it("falls back to page 1 for missing or invalid pages", () => {
    expect(parsePage(null)).toBe(1);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("2.5")).toBe(1);
    expect(parsePage("4")).toBe(4);
  });

  it("only allows the listed page sizes", () => {
    expect(parsePageSize("50")).toBe(50);
    expect(parsePageSize("7")).toBe(20);
    expect(parsePageSize(null)).toBe(20);
  });
});
