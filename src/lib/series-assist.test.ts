import { describe, expect, it } from "vitest";
import { buildSeriesPrompt, parseSeriesSuggestion } from "./series-assist";

describe("buildSeriesPrompt", () => {
  it("lists existing series names and artworks so they are not repeated", () => {
    const prompt = buildSeriesPrompt({ existingTitles: ["Florals", "Night"], artworkTitles: ["Dawn"] });
    expect(prompt).toContain("Existing series names (do not reuse): Florals, Night.");
    expect(prompt).toContain("Artworks already in this series: Dawn.");
  });

  it("says when there are no existing names or artworks", () => {
    const prompt = buildSeriesPrompt({ existingTitles: [], artworkTitles: [] });
    expect(prompt).toContain("(do not reuse): none.");
    expect(prompt).toContain("This series has no artworks yet.");
  });
});

describe("parseSeriesSuggestion", () => {
  it("returns null for output that is not an object or has no usable text", () => {
    expect(parseSeriesSuggestion(null, [])).toBeNull();
    expect(parseSeriesSuggestion("text", [])).toBeNull();
    expect(parseSeriesSuggestion({}, [])).toBeNull();
    expect(parseSeriesSuggestion({ title: "  ", description: "", altText: "" }, [])).toBeNull();
  });

  it("trims the fields", () => {
    expect(parseSeriesSuggestion({ title: " Night Birds ", description: " Calm. ", altText: " Birds " }, [])).toEqual({
      title: "Night Birds",
      description: "Calm.",
      altText: "Birds",
    });
  });

  it("drops a title that repeats an existing series, ignoring case", () => {
    expect(parseSeriesSuggestion({ title: "florals", description: "Calm.", altText: "" }, ["Florals"])).toEqual({
      title: "",
      description: "Calm.",
      altText: "",
    });
  });

  it("caps the title at 60 characters", () => {
    expect(parseSeriesSuggestion({ title: "x".repeat(100) }, [])?.title).toHaveLength(60);
  });

  it("treats non-string fields as empty", () => {
    expect(parseSeriesSuggestion({ title: 5, description: null, altText: "ok" }, [])).toEqual({
      title: "",
      description: "",
      altText: "ok",
    });
  });
});
