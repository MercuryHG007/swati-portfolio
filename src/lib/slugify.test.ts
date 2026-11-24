import { describe, expect, it } from "vitest";
import { slugify } from "./slugify";

describe("slugify", () => {
  it("lowercases and joins words with hyphens", () => {
    expect(slugify("The Valley of Quiet Snow")).toBe("the-valley-of-quiet-snow");
  });

  it("collapses punctuation and whitespace runs into one hyphen", () => {
    expect(slugify("  Hello,   World!  ")).toBe("hello-world");
  });

  it("keeps digits", () => {
    expect(slugify("Study No. 2 (v3)")).toBe("study-no-2-v3");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("---already--slugged---")).toBe("already-slugged");
  });

  it("returns an empty string when nothing is left", () => {
    expect(slugify("!!!")).toBe("");
  });
});
