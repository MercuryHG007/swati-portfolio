import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAllMediums, getAllSeries, getAllSubjects } from "@/lib/admin-queries";
import {
  ARTWORK_SUGGESTION_SCHEMA,
  buildArtworkPrompt,
  parseArtworkSuggestion,
  type ArtworkOptions,
} from "@/lib/artwork-assist";
import { fetchCloudinaryImage, isValidPublicId, requestGeminiSuggestion } from "@/lib/gemini";

export const runtime = "nodejs";

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
  const publicId = (body as { publicId?: unknown } | null)?.publicId;
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
    const image = await fetchCloudinaryImage(cloudName, publicId);
    const { suggestion, model } = await requestGeminiSuggestion({
      apiKey,
      prompt: buildArtworkPrompt(options),
      image,
      schema: ARTWORK_SUGGESTION_SCHEMA,
      parse: (raw) => parseArtworkSuggestion(raw, options),
    });
    return NextResponse.json({ suggestion, model });

  } catch (error) {
    console.error("Artwork assistant failed:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "The AI assistant could not suggest details. Try again, or fill the fields in manually." },
      { status: 502 },
    );
  }
}
