import { describe, expect, it } from "vitest";
import {
  EMPTY_PORTFOLIO_FILTERS,
  SIZE_KEYS,
  hasPortfolioFilters,
  isSizeKey,
  parsePortfolioFilters,
  portfolioSearchParams,
} from "./portfolio-filters";

describe("parsePortfolioFilters", () => {
  it("reads comma-separated and repeated values, lowercased and de-duplicated", () => {
    const input = new URLSearchParams("medium=Oil,Watercolour&medium=oil&subject=Florals&size=small,huge,LARGE");
    expect(parsePortfolioFilters(input)).toEqual({
      medium: ["oil", "watercolour"],
      subject: ["florals"],
      size: ["small", "large"],
    });
  });

  it("accepts a plain record, such as Next.js search params", () => {
    expect(parsePortfolioFilters({ medium: ["Ink", " ink "], subject: undefined, size: "medium" })).toEqual({
      medium: ["ink"],
      subject: [],
      size: ["medium"],
    });
  });

  it("returns empty filters when nothing is set", () => {
    expect(parsePortfolioFilters(new URLSearchParams())).toEqual(EMPTY_PORTFOLIO_FILTERS);
    expect(parsePortfolioFilters(new URLSearchParams("medium= , ,"))).toEqual(EMPTY_PORTFOLIO_FILTERS);
  });
});

describe("portfolioSearchParams", () => {
  it("writes only the filters that are set", () => {
    const params = portfolioSearchParams({ medium: ["oil", "ink"], subject: [], size: ["small"] });
    expect(params.get("medium")).toBe("oil,ink");
    expect(params.get("size")).toBe("small");
    expect(params.has("subject")).toBe(false);
  });

  it("round-trips through parsePortfolioFilters", () => {
    const filters = { medium: ["oil"], subject: ["florals", "birds"], size: ["large"] };
    expect(parsePortfolioFilters(portfolioSearchParams(filters))).toEqual(filters);
  });
});

describe("hasPortfolioFilters", () => {
  it("is false for empty filters and true when any filter is set", () => {
    expect(hasPortfolioFilters(EMPTY_PORTFOLIO_FILTERS)).toBe(false);
    expect(hasPortfolioFilters({ ...EMPTY_PORTFOLIO_FILTERS, size: ["small"] })).toBe(true);
  });
});

describe("size buckets", () => {
  it("lists the bucket keys in order", () => {
    expect(SIZE_KEYS).toEqual(["small", "medium", "large"]);
  });

  it("recognises only known bucket keys", () => {
    expect(isSizeKey("medium")).toBe(true);
    expect(isSizeKey("xl")).toBe(false);
  });
});
