import { describe, expect, it } from "vitest";
import { columnCountFor, columnWidthFor, distributeIntoColumns, driftFactor, heightRatio } from "./masonry";

describe("columnCountFor", () => {
  it("fits ~220px columns on mobile and tablet, with at least two", () => {
    expect(columnCountFor(375)).toBe(2);
    expect(columnCountFor(800)).toBe(3);
    expect(columnCountFor(1023)).toBe(4);
  });

  it("uses wider desktop columns from 1024px", () => {
    expect(columnCountFor(1024)).toBe(3);
    expect(columnCountFor(1600)).toBe(5);
  });

  it("caps desktop at five columns", () => {
    expect(columnCountFor(2000)).toBe(5);
  });
});

describe("columnWidthFor", () => {
  it("splits the width between columns and gutters", () => {
    expect(columnWidthFor(800, 3)).toBe(256);
  });

  it("never returns a negative width", () => {
    expect(columnWidthFor(10, 5)).toBe(0);
  });
});

describe("driftFactor", () => {
  it("is zero for a single column", () => {
    expect(driftFactor(0, 1)).toBe(0);
  });

  it("is negative on the left, zero in the centre, positive on the right", () => {
    expect(driftFactor(0, 3)).toBeCloseTo(-0.06);
    expect(driftFactor(1, 3)).toBe(0);
    expect(driftFactor(2, 3)).toBeCloseTo(0.06);
  });
});

describe("heightRatio", () => {
  it("is height divided by width", () => {
    expect(heightRatio({ image: { publicId: "a", width: 100, height: 150 } })).toBe(1.5);
  });

  it("clamps extreme shapes", () => {
    expect(heightRatio({ image: { publicId: "a", width: 100, height: 1000 } })).toBe(2);
    expect(heightRatio({ image: { publicId: "a", width: 1000, height: 100 } })).toBe(0.5);
  });

  it("falls back to 4:5 when dimensions are missing", () => {
    expect(heightRatio({ image: null })).toBe(1.25);
    expect(heightRatio({ image: { publicId: "a", width: 100 } })).toBe(1.25);
  });
});

describe("distributeIntoColumns", () => {
  it("places each item in the currently shortest column", () => {
    const items = [
      { id: "tall", ratio: 2 },
      { id: "short-1", ratio: 1 },
      { id: "short-2", ratio: 1 },
      { id: "short-3", ratio: 1 },
    ];
    const columns = distributeIntoColumns(items, 2, (item) => item.ratio);
    expect(columns.map((column) => column.map((entry) => entry.index))).toEqual([
      [0, 3],
      [1, 2],
    ]);
  });

  it("keeps every item exactly once", () => {
    const items = Array.from({ length: 11 }, (_, index) => index);
    const columns = distributeIntoColumns(items, 4, (item) => 1 + (item % 3));
    const placed = columns.flat().map((entry) => entry.item).sort((a, b) => a - b);
    expect(placed).toEqual(items);
  });

  it("returns empty columns for an empty list", () => {
    expect(distributeIntoColumns([], 2, () => 1)).toEqual([[], []]);
  });
});
