import { describe, expect, it } from "vitest";
import { toMetaDescription } from "./meta-description";

describe("toMetaDescription", () => {
  it("returns undefined for missing or blank text", () => {
    expect(toMetaDescription(undefined)).toBeUndefined();
    expect(toMetaDescription("")).toBeUndefined();
    expect(toMetaDescription("   \n\t ")).toBeUndefined();
  });

  it("collapses whitespace", () => {
    expect(toMetaDescription("  Hello \n\t world  ")).toBe("Hello world");
  });

  it("keeps text that fits the limit", () => {
    const text = "a".repeat(155);
    expect(toMetaDescription(text)).toBe(text);
  });

  it("prefers ending on a sentence when it lands past halfway", () => {
    const text = "This is the first sentence. Then a second long one follows here and continues.";
    expect(toMetaDescription(text, 50)).toBe("This is the first sentence.");
  });

  it("otherwise cuts on a word and adds an ellipsis", () => {
    const text = "one two three four five six seven eight nine ten eleven";
    expect(toMetaDescription(text, 20)).toBe("one two three four…");
  });

  it("truncates text with no spaces at the default limit", () => {
    const result = toMetaDescription("x".repeat(200));
    expect(result).toHaveLength(156);
    expect(result?.endsWith("…")).toBe(true);
  });
});
