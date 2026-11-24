import { describe, expect, it } from "vitest";
import { MAX_SUBJECT_NAME_LENGTH, newSubjectNames, normalizeSubjectName } from "./subject-names";

describe("normalizeSubjectName", () => {
  it("collapses whitespace and trims", () => {
    expect(normalizeSubjectName("  Still   life  ")).toBe("Still life");
  });

  it("caps the length and does not leave a trailing space", () => {
    expect(normalizeSubjectName("a".repeat(70))).toHaveLength(MAX_SUBJECT_NAME_LENGTH);
    expect(normalizeSubjectName(`${"a".repeat(59)} b`)).toBe("a".repeat(59));
  });
});

describe("newSubjectNames", () => {
  it("keeps only names that do not already exist, comparing by slug", () => {
    expect(newSubjectNames(["Florals", "florals", " Birds ", "Portraits"], ["portraits"])).toEqual([
      "Florals",
      "Birds",
    ]);
  });

  it("skips names that match an existing name by slug", () => {
    expect(newSubjectNames(["florals"], ["Florals"])).toEqual([]);
  });

  it("skips blank names and names with no letters or digits", () => {
    expect(newSubjectNames(["", "   ", "!!!"], [])).toEqual([]);
  });

  it("returns each new name once", () => {
    expect(newSubjectNames(["Still Life", "still-life"], [])).toEqual(["Still Life"]);
  });
});
