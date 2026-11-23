import { describe, expect, it } from "vitest";
import { capitalize, formatDateRange, formatDimensions, getYear } from "./format";

describe("getYear", () => {
  it("reads the year in UTC, so UTC-midnight dates stay in their year", () => {
    expect(getYear("2024-01-01T00:00:00Z")).toBe(2024);
    expect(getYear(new Date("2024-01-01T00:00:00Z"))).toBe(2024);
  });

  it("returns undefined when there is no date", () => {
    expect(getYear(null)).toBeUndefined();
    expect(getYear(undefined)).toBeUndefined();
    expect(getYear("")).toBeUndefined();
  });
});

describe("formatDimensions", () => {
  it("formats height and width with the unit, defaulting to cm", () => {
    expect(formatDimensions({ height: 100, width: 80 })).toBe("100 × 80 cm");
    expect(formatDimensions({ height: 12, width: 9, unit: "in" })).toBe("12 × 9 inch");
  });

  it("returns null unless both height and width are set", () => {
    expect(formatDimensions(null)).toBeNull();
    expect(formatDimensions({ height: 100 })).toBeNull();
    expect(formatDimensions({ height: 0, width: 80 })).toBeNull();
  });
});

describe("capitalize", () => {
  it("uppercases the first letter only", () => {
    expect(capitalize("oil on canvas")).toBe("Oil on canvas");
    expect(capitalize("")).toBe("");
  });
});

describe("formatDateRange", () => {
  it("shows a single month and year for a start date with no end", () => {
    expect(formatDateRange("2024-03-01")).toBe("Mar 2024");
  });

  it("shows one month when start and end fall in the same month", () => {
    expect(formatDateRange("2024-03-01", "2024-03-01")).toBe("Mar 2024");
  });

  it("drops the year from the start when both dates share it", () => {
    expect(formatDateRange("2024-03-01", "2024-05-01")).toBe("Mar – May 2024");
  });

  it("shows the year on both ends when the range crosses a year", () => {
    expect(formatDateRange("2023-11-01", "2024-02-01")).toBe("Nov 2023 – Feb 2024");
  });
});
