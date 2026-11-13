// Admin-only helpers for the AI series assistant. The cover image is the main input. Model output is
// untrusted and validated here before it reaches the form.

const MAX_TITLE_LENGTH = 60;
const MAX_DESCRIPTION_LENGTH = 600;
const MAX_ALT_LENGTH = 200;

export interface SeriesContext {
  existingTitles: string[];
  artworkTitles: string[];
}

export interface SeriesSuggestion {
  title: string;
  description: string;
  altText: string;
}

export const SERIES_SUGGESTION_SCHEMA = {
  type: "OBJECT",
  required: ["title", "description", "altText"],
  properties: {
    title: { type: "STRING" },
    description: { type: "STRING" },
    altText: { type: "STRING" },
  },
};

export function buildSeriesPrompt({ existingTitles, artworkTitles }: SeriesContext): string {
  return [
    "You are helping an artist set up a series for her online portfolio. A series is a group of related artworks.",
    "The image is the series cover. Describe only what is visible in it.",
    "Do not invent dates, prices, dimensions or techniques you cannot see.",
    "Return JSON with these fields:",
    `- title: a short series name (at most ${MAX_TITLE_LENGTH} characters). It must not repeat an existing series name.`,
    `- description: one to three sentences on what unites the works in this series: subject, palette, technique and mood (at most ${MAX_DESCRIPTION_LENGTH} characters).`,
    `- altText: a concise description of the cover for screen readers that starts with what is shown (at most ${MAX_ALT_LENGTH} characters).`,
    `Existing series names (do not reuse): ${existingTitles.join(", ") || "none"}.`,
    artworkTitles.length
      ? `Artworks already in this series: ${artworkTitles.join(", ")}.`
      : "This series has no artworks yet.",
  ].join("\n");
}

const text = (value: unknown, maxLength: number): string =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

// Returns null when the output is unusable, so the caller can fall back to the next model.
export function parseSeriesSuggestion(raw: unknown, existingTitles: string[]): SeriesSuggestion | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const title = text(record.title, MAX_TITLE_LENGTH);
  const taken = new Set(existingTitles.map((item) => item.toLowerCase()));
  const description = text(record.description, MAX_DESCRIPTION_LENGTH);
  const altText = text(record.altText, MAX_ALT_LENGTH);
  if (!title && !description && !altText) return null;

  return {
    title: title && !taken.has(title.toLowerCase()) ? title : "",
    description,
    altText,
  };
}
