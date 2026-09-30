import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET() {
  try {
    const conn = await connectToDatabase();
    return NextResponse.json({
      ok: true,
      readyState: conn.connection.readyState, // 1 = connected
      db: conn.connection.name,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
