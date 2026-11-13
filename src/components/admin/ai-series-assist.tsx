"use client";

import { useState, type MouseEvent } from "react";
import { toast } from "sonner";
import { readPublicId, setTextIfEmpty } from "@/components/admin/ai-form";
import { secondaryButtonClass } from "@/components/admin/ui";

interface SeriesSuggestion {
  title: string;
  description: string;
  altText: string;
}

export function AiSeriesAssist({ seriesId }: { seriesId?: string }) {
  const [busy, setBusy] = useState(false);
  const [altText, setAltText] = useState("");

  async function suggest(event: MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;
    if (!form) return;
    const publicId = readPublicId(form, "coverImage");
    if (!publicId) {
      toast.error("Upload a cover image first.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/admin/series-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicId, seriesId }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.suggestion) {
        toast.error(payload?.error ?? "The AI assistant could not suggest details.");
        return;
      }

      const suggestion = payload.suggestion as SeriesSuggestion;
      const filled: string[] = [];
      if (setTextIfEmpty(form, "title", suggestion.title)) filled.push("title");
      if (setTextIfEmpty(form, "description", suggestion.description)) filled.push("description");
      setAltText(suggestion.altText);
      toast.success(
        filled.length
          ? `Filled in: ${filled.join(", ")}. Review before saving.`
          : "Nothing was filled because these fields already have values.",
      );
    } catch {
      toast.error("The AI assistant could not be reached.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={suggest} disabled={busy} className={`${secondaryButtonClass} w-fit disabled:opacity-60`}>
        {busy ? "Suggesting…" : "Suggest details with AI"}
      </button>
      <p className="text-xs text-muted">Reads the cover image and fills empty fields. Review everything before saving.</p>
      <input type="hidden" name="aiAltText" value={altText} readOnly />
    </div>
  );
}
