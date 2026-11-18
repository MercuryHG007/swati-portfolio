import { NextRequest, NextResponse } from "next/server";
import { refreshContentSnapshot } from "@/lib/content-snapshot";
import { replayContactSpool } from "@/lib/contact-spool";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. The secret must be set, or nothing is allowed.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const snapshot = await refreshContentSnapshot();
    // Moves contact messages spooled while the database was down. A replay failure must not fail the snapshot.
    const contactSpool = await replayContactSpool().catch((err) => {
      console.error("Contact spool replay failed:", err);
      return null;
    });
    return NextResponse.json({
      ok: true,
      generatedAt: snapshot.generatedAt,
      artworkCount: snapshot.artworkCount,
      entries: Object.keys(snapshot.entries).length,
      contactSpool,
    });
  } catch (err) {
    console.error("Scheduled content snapshot failed:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
