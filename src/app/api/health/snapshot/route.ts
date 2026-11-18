import { NextResponse } from "next/server";
import { loadSnapshot } from "@/lib/snapshot-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The snapshot is rebuilt nightly at 20:30 UTC, so 36 hours tolerates one missed run.
const MAX_AGE_HOURS = 36;

// Reads R2 directly (not the 5-minute memo) so a stale snapshot is reported as soon as it happens.
export async function GET() {
  try {
    const snapshot = await loadSnapshot();
    if (!snapshot) {
      return NextResponse.json({ ok: false, error: "No content snapshot found" }, { status: 503 });
    }
    const ageHours = (Date.now() - Date.parse(snapshot.generatedAt)) / 3_600_000;
    const stale = ageHours > MAX_AGE_HOURS;
    return NextResponse.json(
      {
        ok: !stale,
        generatedAt: snapshot.generatedAt,
        ageHours: Math.round(ageHours * 10) / 10,
        artworkCount: snapshot.artworkCount,
        stale,
      },
      { status: stale ? 503 : 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 503 }
    );
  }
}
