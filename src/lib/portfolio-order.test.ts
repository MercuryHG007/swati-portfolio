import { describe, expect, it } from "vitest";
import { dailySeed, parseSeed, seededShuffle } from "./portfolio-order";

describe("dailySeed", () => {
  it("uses the India calendar day, so the order changes at IST midnight", () => {
    expect(dailySeed(new Date("2026-03-01T18:29:59Z"))).toBe("2026-03-01");
    expect(dailySeed(new Date("2026-03-01T18:30:00Z"))).toBe("2026-03-02");
  });
});

describe("parseSeed", () => {
  it("accepts a YYYY-MM-DD seed", () => {
    expect(parseSeed("2026-03-01")).toBe("2026-03-01");
  });

  it("rejects anything else", () => {
    expect(parseSeed("2026-3-1")).toBeUndefined();
    expect(parseSeed("2026-03-01T00:00")).toBeUndefined();
    expect(parseSeed("")).toBeUndefined();
    expect(parseSeed(null)).toBeUndefined();
    expect(parseSeed(undefined)).toBeUndefined();
  });
});

describe("seededShuffle", () => {
  const items = Array.from({ length: 20 }, (_, index) => `item-${index}`);
  const key = (item: string) => item;

  it("returns the same order for the same seed", () => {
    expect(seededShuffle(items, "2026-03-01", key)).toEqual(seededShuffle(items, "2026-03-01", key));
  });

  it("returns a permutation of the items", () => {
    const result = seededShuffle(items, "2026-03-01", key);
    expect([...result].sort()).toEqual([...items].sort());
  });

  it("does not depend on the order the items arrived in", () => {
    expect(seededShuffle([...items].reverse(), "2026-03-01", key)).toEqual(seededShuffle(items, "2026-03-01", key));
  });

  it("changes order when the seed changes", () => {
    expect(seededShuffle(items, "2026-03-01", key)).not.toEqual(seededShuffle(items, "2026-03-02", key));
  });

  it("does not mutate the input", () => {
    const copy = [...items].reverse();
    seededShuffle(copy, "2026-03-01", key);
    expect(copy).toEqual([...items].reverse());
  });

  it("handles an empty list", () => {
    expect(seededShuffle([], "2026-03-01", key)).toEqual([]);
  });
});
