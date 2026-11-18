import { NextResponse } from "next/server";
import { getR2Object, isR2Configured, R2_BACKUP_BUCKET } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Written by scripts/probe-media-health.mjs every 15 minutes. Read from R2 so this still answers while the database is
// down. Returns 503 when the media domain is down or critical, or when the probe hasn't run for 45 minutes (three missed
// runs). An external uptime monitor on this URL then alerts independently of the probe.
const STALE_AFTER_MINUTES = 45;

export async function GET() {
  if (!isR2Configured() || !R2_BACKUP_BUCKET) {
    return NextResponse.json({ ok: false, error: "Media health storage is not configured" }, { status: 503 });
  }
  try {
    const body = await getR2Object(R2_BACKUP_BUCKET, "ops/media-health.json");
    if (!body) {
      return NextResponse.json({ ok: false, status: "unknown", error: "No media health record yet" }, { status: 503 });
    }
    const state = JSON.parse(body.toString("utf8")) as {
      checkedAt: string;
      effectiveStatus: string;
      reasons: string[];
      metrics: Record<string, unknown>;
      lastChangedAt?: string;
    };
    const ageMinutes = (Date.now() - Date.parse(state.checkedAt)) / 60_000;
    const stale = ageMinutes > STALE_AFTER_MINUTES;
    const failing = stale || state.effectiveStatus === "down" || state.effectiveStatus === "critical";
    return NextResponse.json(
      {
        ok: !failing,
        status: stale ? "stale" : state.effectiveStatus,
        checkedAt: state.checkedAt,
        ageMinutes: Math.round(ageMinutes),
        lastChangedAt: state.lastChangedAt ?? null,
        reasons: state.reasons,
        metrics: state.metrics,
      },
      { status: failing ? 503 : 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 503 }
    );
  }
}
