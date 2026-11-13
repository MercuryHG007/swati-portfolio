import { isValidObjectId } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { requestGeminiText } from "@/lib/gemini";
import type { ArtworkContext } from "@/lib/artwork-assist";
import { About, AiSuggestion, Artwork, ArtworkAssistSettings } from "@/models";
import { STYLE_GUIDE_MAX_LENGTH } from "@/models/ArtworkAssistSettings";

const EXAMPLE_POOL_SIZE = 60;
const CORRECTION_LIMIT = 5;
const DRAFT_SAMPLE_SIZE = 20;
const DRAFT_STATEMENT_LENGTH = 1000;
export const DRAFT_MIN_DESCRIPTIONS = 3;

interface PopulatedArtwork {
  title: string;
  description: string;
  medium?: { _id: unknown; name: string } | null;
  subjects: { _id: unknown; name: string }[];
}

export function onlyObjectIds(values: unknown, limit: number): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .filter((value): value is string => typeof value === "string" && isValidObjectId(value))
    .slice(0, limit);
}

export async function getStyleGuide(): Promise<string> {
  await connectToDatabase();
  const settings = await ArtworkAssistSettings.findOne().lean<{ styleGuide?: string }>();
  return settings?.styleGuide ?? "";
}

export async function saveStyleGuide(styleGuide: string): Promise<void> {
  await connectToDatabase();
  await ArtworkAssistSettings.findOneAndUpdate({}, { styleGuide }, { upsert: true });
}

// Published works with descriptions, closest first: same medium counts double, each shared subject counts once.
// Ties keep the most recently updated work first.
async function getStyleExamples({
  mediumId,
  subjectIds,
  excludeId,
  limit,
}: {
  mediumId?: string;
  subjectIds: string[];
  excludeId?: string;
  limit: number;
}): Promise<ArtworkContext["examples"]> {
  await connectToDatabase();
  const works = await Artwork.find({
    status: "published",
    description: { $gt: "" },
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  })
    .sort({ updatedAt: -1 })
    .limit(EXAMPLE_POOL_SIZE)
    .populate("medium", "name")
    .populate("subjects", "name")
    .lean<PopulatedArtwork[]>();

  const wantedSubjects = new Set(subjectIds);
  return works
    .map((work) => ({
      work,
      score:
        (mediumId && String(work.medium?._id) === mediumId ? 2 : 0) +
        work.subjects.filter((subject) => wantedSubjects.has(String(subject._id))).length,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ work }) => ({
      title: work.title,
      medium: work.medium?.name ?? "",
      subjects: work.subjects.map((subject) => subject.name),
      description: work.description,
    }));
}

// Only suggestions whose description the artist then changed count as corrections. Unchanged ones
// already match her voice, so they add nothing the examples don't show.
async function getRecentCorrections(limit: number): Promise<ArtworkContext["corrections"]> {
  await connectToDatabase();
  const rows = await AiSuggestion.find({
    "suggested.description": { $gt: "" },
    "saved.description": { $gt: "" },
  })
    .sort({ updatedAt: -1 })
    .limit(limit * 4)
    .lean<{ suggested: { description: string }; saved: { description: string } }[]>();

  return rows
    .filter((row) => row.suggested.description !== row.saved.description)
    .slice(0, limit)
    .map((row) => ({ aiDescription: row.suggested.description, artistDescription: row.saved.description }));
}

export async function loadArtworkContext({
  note,
  artworkId,
  mediumId,
  subjectIds,
  examples,
}: {
  note: string;
  artworkId?: string;
  mediumId?: string;
  subjectIds: string[];
  examples: number;
}): Promise<ArtworkContext> {
  const [styleGuide, works, corrections] = await Promise.all([
    getStyleGuide(),
    getStyleExamples({ mediumId, subjectIds, excludeId: artworkId, limit: examples }),
    getRecentCorrections(CORRECTION_LIMIT),
  ]);
  return { styleGuide, note, examples: works, corrections };
}

export interface SuggestedText {
  title: string;
  description: string;
  altText: string;
}

export async function recordSuggestion(suggested: SuggestedText, artworkId?: string): Promise<string> {
  await connectToDatabase();
  const record = await AiSuggestion.create({
    suggested,
    artwork: artworkId ?? null,
  });
  return String(record._id);
}

// Called after an artwork is saved. Stores what the artist kept so later prompts can learn from edits.
export async function recordSavedDescription(suggestionId: string, artworkId: string, saved: { title: string; description: string }) {
  if (!isValidObjectId(suggestionId)) return;
  await connectToDatabase();
  await AiSuggestion.updateOne({ _id: suggestionId }, { artwork: artworkId, saved });
}

// Drafts a style guide from the artist's own published descriptions and statement. The draft is
// returned to the admin, who reviews and edits it before it is saved and used.
export async function draftStyleGuide(apiKey: string): Promise<string | null> {
  await connectToDatabase();
  const [about, works] = await Promise.all([
    About.findOne().lean<{ statement?: string }>(),
    Artwork.find({ status: "published", description: { $gt: "" } })
      .sort({ updatedAt: -1 })
      .limit(DRAFT_SAMPLE_SIZE)
      .select("title description")
      .lean<{ title: string; description: string }[]>(),
  ]);
  if (works.length < DRAFT_MIN_DESCRIPTIONS) return null;

  const statement = (about?.statement ?? "").trim().slice(0, DRAFT_STATEMENT_LENGTH);
  const prompt = [
    "You are helping an artist write a short style guide for the descriptions of her artworks.",
    "Read her artist statement and the descriptions she has already written. Describe how she writes: sentence length, tone, vocabulary, what she tends to emphasise (colour, light, mood, technique, subject) and what she avoids.",
    "Write six to ten short bullet points in plain text, each addressed to a writer (for example 'Use ...' or 'Avoid ...').",
    "Describe only patterns you can see in the samples. Do not invent facts about her life, education or exhibitions, and do not quote her descriptions at length.",
    `Artist statement: ${JSON.stringify(statement || "(none)")}`,
    "Her descriptions:",
    ...works.map((work) => `- ${JSON.stringify({ title: work.title, description: work.description.slice(0, 600) })}`),
  ].join("\n");

  const guide = await requestGeminiText({ apiKey, prompt });
  return guide.slice(0, STYLE_GUIDE_MAX_LENGTH);
}
