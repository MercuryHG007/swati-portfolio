import { NextRequest, NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { auth } from "@/auth";
import { getAllSeries, getArtworksBySeriesIdAdmin } from "@/lib/admin-queries";
import { fetchCloudinaryImage, isValidPublicId, requestGeminiSuggestion } from "@/lib/gemini";
import { SERIES_SUGGESTION_SCHEMA, buildSeriesPrompt, parseSeriesSuggestion } from "@/lib/series-assist";

export const runtime = "nodejs";

const MAX_ARTWORK_TITLES = 30;

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
  const { publicId, seriesId } = (body ?? {}) as { publicId?: unknown; seriesId?: unknown };
  if (!isValidPublicId(publicId)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (seriesId !== undefined && (typeof seriesId !== "string" || !isValidObjectId(seriesId))) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const [allSeries, artworkTitles] = await Promise.all([
      getAllSeries(),
      typeof seriesId === "string"
        ? getArtworksBySeriesIdAdmin(seriesId).then((artworks) =>
            artworks.slice(0, MAX_ARTWORK_TITLES).map((artwork) => artwork.title))
        : Promise.resolve<string[]>([]),
    ]);
    const context = { existingTitles: allSeries.map((item) => item.title), artworkTitles };
    const image = await fetchCloudinaryImage(cloudName, publicId);
    const { suggestion, model } = await requestGeminiSuggestion({
      apiKey,
      prompt: buildSeriesPrompt(context),
      image,
      schema: SERIES_SUGGESTION_SCHEMA,
      parse: (raw) => parseSeriesSuggestion(raw, context.existingTitles),
    });
    return NextResponse.json({ suggestion, model });
  } catch (error) {
    console.error("Series assistant failed:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "The AI assistant could not suggest details. Try again, or fill the fields in manually." },
      { status: 502 },
    );
  }
}
