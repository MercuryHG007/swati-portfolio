import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { fetchArtworkImage, parseAssistRequest, requestArtworkSuggestion } from "@/lib/artwork-assist";

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
  const assistRequest = parseAssistRequest(body);
  if (!assistRequest) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const image = await fetchArtworkImage(cloudName, assistRequest.publicId);
    const { suggestion, model } = await requestArtworkSuggestion({ apiKey, image, request: assistRequest });
    return NextResponse.json({ suggestion, model });
  } catch (error) {
    console.error("Artwork assistant failed:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "The AI assistant could not suggest details. Try again, or fill the fields in manually." },
      { status: 502 },
    );
  }
}
