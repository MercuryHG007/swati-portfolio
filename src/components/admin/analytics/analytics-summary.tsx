"use client";

import { useState } from "react";
import { buttonClass, cardClass } from "@/components/admin/ui";
import type { CachedSummary } from "@/lib/analytics-cache";

export function AnalyticsSummary({ days, initial }: { days: number; initial: CachedSummary | null }) {
  const [result, setResult] = useState<CachedSummary | null>(initial);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/analytics-summary?range=${days}`, { method: "POST" });
      const payload = (await response.json().catch(() => null)) as
        | (Partial<CachedSummary> & { error?: string })
        | null;
      if (!response.ok || !payload?.summary || !payload.generatedAt) {
        setError(payload?.error ?? "The AI summary could not be written. Try again in a minute.");
        return;
      }
      setResult({ summary: payload.summary, generatedAt: payload.generatedAt });
    } catch {
      setError("The AI summary could not be written. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const points = result ? parsePoints(result.summary) : [];

  return (
    <section className={`${cardClass} flex flex-col gap-3`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-foreground">AI summary</h2>
          <p className="text-xs text-muted">Reads the last {days} days of numbers and suggests next steps.</p>
        </div>
        <button type="button" className={buttonClass} onClick={generate} disabled={loading}>
          {loading ? "Writing…" : result ? "Write again" : "Summarise with AI"}
        </button>
      </div>
      {loading ? <p className="text-xs text-muted">This usually takes 10 to 30 seconds.</p> : null}
      {points.length > 0 ? (
        <ul className="list-disc space-y-2 pl-5 text-sm text-foreground">
          {points.map((point, index) => (
            <li key={index}>{point}</li>
          ))}
        </ul>
      ) : null}
      {result ? (
        <p className="text-xs text-muted">Written {formatWrittenAt(result.generatedAt)}. Write again for fresh numbers.</p>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </section>
  );
}

function parsePoints(summary: string): string[] {
  return summary
    .split("\n")
    .map((line) => line.replace(/^\s*[-*•]\s*/, "").trim())
    .filter(Boolean);
}

function formatWrittenAt(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });
}
