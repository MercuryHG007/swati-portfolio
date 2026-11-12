import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAllMediums, getAllSeries, getAllSubjects } from "@/lib/admin-queries";
import { loadArtworkContext, onlyObjectIds, recordSuggestion } from "@/lib/artist-voice";
import {
  ARTWORK_SUGGESTION_SCHEMA,
  buildArtworkPrompt,
  parseArtworkSuggestion,
  type ArtworkOptions,
} from "@/lib/artwork-assist";
import { fetchCloudinaryImage, isValidPublicId, requestGeminiSuggestion } from "@/lib/gemini";

export const runtime = "nodejs";

const MAX_NOTE_LENGTH = 500;
const MAX_EXAMPLES = 6;
const MAX_SUBJECTS = 20;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!apiKey || !cloudName) {
    return NextResponse.json({ error: "The AI assistant is not configured." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { publicId, note, artworkId, mediumId, subjectIds } = (body ?? {}) as Record<string, unknown>;
  if (!isValidPublicId(publicId)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const [mediums, subjects, series] = await Promise.all([getAllMediums(), getAllSubjects(), getAllSeries()]);
    const options: ArtworkOptions = {
      mediums: mediums.map((medium) => medium.name),
      subjects: subjects.map((subject) => subject.name),
      series: series.map((item) => ({ id: String(item._id), title: item.title, description: item.description ?? "" })),
    };
    const context = await loadArtworkContext({
      note: typeof note === "string" ? note.trim().slice(0, MAX_NOTE_LENGTH) : "",
      artworkId: onlyObjectIds([artworkId], 1)[0],
      mediumId: onlyObjectIds([mediumId], 1)[0],
      subjectIds: onlyObjectIds(subjectIds, MAX_SUBJECTS),
      examples: MAX_EXAMPLES,
    });
    const image = await fetchCloudinaryImage(cloudName, publicId);
    const { suggestion, model } = await requestGeminiSuggestion({
      apiKey,
      prompt: buildArtworkPrompt(options, context),
      image,
      schema: ARTWORK_SUGGESTION_SCHEMA,
      parse: (raw) => parseArtworkSuggestion(raw, options),
    });

    // Feedback is best-effort: a logging failure must not hide a suggestion the model already produced.
    const suggestionId = await recordSuggestion(
      { title: suggestion.title, description: suggestion.description, altText: suggestion.altText },
      onlyObjectIds([artworkId], 1)[0],
    ).catch((error: unknown) => {
      console.error("Could not record artwork suggestion:", error instanceof Error ? error.message : error);
      return null;
    });

    return NextResponse.json({ suggestion, model, suggestionId });
  } catch (error) {
    console.error("Artwork assistant failed:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "The AI assistant could not suggest details. Try again, or fill the fields in manually." },
      { status: 502 },
    );
  }
}
