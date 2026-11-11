// Admin-only helpers for the AI artwork assistant. The route handler loads the taxonomy from the database
// and checks the admin session. Everything here treats the model output as untrusted and validates it.

import { newSubjectNames } from "./subject-names";

const MAX_OPTION_LENGTH = 100;
const MAX_NEW_SUBJECTS = 5;

export interface ArtworkOptions {
  mediums: string[];
  subjects: string[];
  series: { id: string; title: string; description: string }[];
}

export interface ArtworkSuggestion {
  title: string;
  description: string;
  altText: string;
  medium: string;
  subjects: string[];
  newSubjects: string[];
  seriesId: string;
  seriesTitle: string;
  seriesReason: string;
}

export const ARTWORK_SUGGESTION_SCHEMA = {
  type: "OBJECT",
  required: ["title", "description", "altText", "medium", "subjects", "newSubjects", "seriesId", "seriesReason"],
  properties: {
    title: { type: "STRING" },
    description: { type: "STRING" },
    altText: { type: "STRING" },
    medium: { type: "STRING" },
    subjects: { type: "ARRAY", items: { type: "STRING" } },
    newSubjects: { type: "ARRAY", items: { type: "STRING" } },
    seriesId: { type: "STRING" },
    seriesReason: { type: "STRING" },
  },
};

export function buildArtworkPrompt({ mediums, subjects, series }: ArtworkOptions): string {
  const seriesLines = series.length
    ? series.map((item) => `  - id "${item.id}": "${item.title}". ${item.description.slice(0, 300)}`)
    : ["  - none"];
  return [
    "You are helping an artist catalogue an original artwork for her online portfolio.",
    "The artist paints in watercolor, acrylic, pencil and oil. Describe only what is visible in the photo.",
    "Do not invent dimensions, dates, prices, signatures or techniques you cannot see.",
    "Return JSON with these fields:",
    "- title: a short, evocative title (at most 80 characters).",
    "- description: one to three sentences on the subject, mood, colours and composition for visitors (at most 600 characters).",
    "- altText: a concise description for screen readers that starts with what is shown (at most 200 characters).",
    `- medium: exactly one of these mediums, or an empty string if none clearly fits: ${mediums.join(", ") || "none"}.`,
    `- subjects: zero to four of these existing subjects that clearly apply: ${subjects.join(", ") || "none"}.`,
    "- newSubjects: up to five short subject names (one to three words) that describe the work and are NOT in the existing subjects list. Empty if nothing new is needed.",
    "- seriesId: the id of an existing series this artwork clearly belongs to, judged by subject, style and palette. Use an empty string when unsure; prefer an empty string over a guess.",
    "- seriesReason: if seriesId is set, one short sentence explaining why (at most 200 characters). Otherwise an empty string.",
    "Existing series:",
    ...seriesLines,
  ].join("\n");
}

const text = (value: unknown, maxLength: number): string =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

const matchOption = (value: string, options: string[]): string | undefined => {
  const wanted = value.trim().toLowerCase();
  return options.find((option) => option.toLowerCase() === wanted);
};

// Returns null when the output is unusable, so the caller can fall back to the next model.
export function parseArtworkSuggestion(raw: unknown, options: ArtworkOptions): ArtworkSuggestion | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const title = text(record.title, 80);
  if (!title) return null;

  const medium = matchOption(text(record.medium, MAX_OPTION_LENGTH), options.mediums) ?? "";
  const subjects = Array.isArray(record.subjects)
    ? [...new Set(record.subjects.flatMap((subject) => {
        const match = typeof subject === "string" ? matchOption(subject, options.subjects) : undefined;
        return match ? [match] : [];
      }))].slice(0, 4)
    : [];
  const proposedSubjects = Array.isArray(record.newSubjects)
    ? record.newSubjects.filter((item): item is string => typeof item === "string")
    : [];
  const newSubjects = newSubjectNames(proposedSubjects, options.subjects).slice(0, MAX_NEW_SUBJECTS);

  const series = options.series.find((item) => item.id === record.seriesId);

  return {
    title,
    description: text(record.description, 600),
    altText: text(record.altText, 200),
    medium,
    subjects,
    newSubjects,
    seriesId: series?.id ?? "",
    seriesTitle: series?.title ?? "",
    seriesReason: series ? text(record.seriesReason, 200) : "",
  };
}

