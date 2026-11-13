import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { parseRangeDays } from "@/lib/analytics-dashboard";
import { getCachedDashboard, setCachedSummary } from "@/lib/analytics-cache";
import { buildAnalyticsSummaryPrompt } from "@/lib/analytics-summary";
import { getGa4Config } from "@/lib/ga4";
import { requestGeminiText } from "@/lib/gemini";

export const runtime = "nodejs";
// Loading the dashboard and asking Gemini can take longer than the default serverless limit.
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "The AI assistant is not configured." }, { status: 503 });
  }

  const config = getGa4Config();
  if (!config) {
    return NextResponse.json({ error: "Google Analytics is not connected." }, { status: 503 });
  }

  const days = parseRangeDays(request.nextUrl.searchParams.get("range") ?? undefined);

  try {
    const dashboard = await getCachedDashboard(config, days);
    const text = await requestGeminiText({ apiKey, prompt: buildAnalyticsSummaryPrompt(dashboard) });
    return NextResponse.json(await setCachedSummary(days, text));
  } catch (error) {
    console.error("Analytics summary failed:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "The AI summary is busy or unavailable right now. Try again in a minute." },
      { status: 502 },
    );
  }
}
