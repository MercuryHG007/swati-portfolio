"use client";

import { useState, type MouseEvent } from "react";
import { toast } from "sonner";
import { newSubjectNames } from "@/lib/subject-names";
import { readPublicId, setTextIfEmpty } from "@/components/admin/ai-form";
import { useAiArtwork } from "@/components/admin/ai-artwork-context";
import { secondaryButtonClass } from "@/components/admin/ui";

interface Option {
  id: string;
  name: string;
}

interface Suggestion {
  title: string;
  description: string;
  altText: string;
  medium: string;
  subjects: string[];
  newSubjects: string[];
  seriesId: string;
  seriesTitle: string;
  seriesReason: string;
}

// Only empty fields are filled, so anything the admin has already written is kept.
function applySuggestion(form: HTMLFormElement, suggestion: Suggestion, mediums: Option[], subjects: Option[]): string[] {
  const filled: string[] = [];
  if (setTextIfEmpty(form, "title", suggestion.title)) filled.push("title");
  if (setTextIfEmpty(form, "description", suggestion.description)) filled.push("description");

  const medium = form.elements.namedItem("medium") as HTMLSelectElement | null;
  const mediumId = mediums.find((option) => option.name === suggestion.medium)?.id;
  if (medium && !medium.value && mediumId) {
    medium.value = mediumId;
    filled.push("medium");
  }

  let subjectsChecked = 0;
  for (const name of suggestion.subjects) {
    const id = subjects.find((option) => option.name === name)?.id;
    if (!id) continue;
    const box = form.querySelector<HTMLInputElement>(`input[type="checkbox"][name="subjects"][value="${CSS.escape(id)}"]`);
    if (box && !box.checked) {
      box.checked = true;
      subjectsChecked += 1;
    }
  }
  if (subjectsChecked) filled.push("subjects");

  const series = form.elements.namedItem("series") as HTMLSelectElement | null;
  if (series && !series.value && suggestion.seriesId) {
    series.value = suggestion.seriesId;
    filled.push("series");
  }

  return filled;
}

function describeSeries(suggestion: Suggestion, applied: boolean): string {
  if (!suggestion.seriesId) return "";
  const reason = suggestion.seriesReason ? ` ${suggestion.seriesReason}` : "";
  return applied
    ? `Series set to "${suggestion.seriesTitle}".${reason}`
    : `Possible series: "${suggestion.seriesTitle}". The series field was already set, so it was left unchanged.${reason}`;
}

export function AiArtworkAssist({ mediums, subjects }: { mediums: Option[]; subjects: Option[] }) {
  const [busy, setBusy] = useState(false);
  const { altText, setAltText, setSeriesNote, setProposed } = useAiArtwork();

  async function suggest(event: MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;
    if (!form) return;
    const publicId = readPublicId(form, "images");
    if (!publicId) {
      toast.error("Upload an image first.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/admin/artwork-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicId }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.suggestion) {
        toast.error(payload?.error ?? "The AI assistant could not suggest details.");
        return;
      }

      const suggestion = payload.suggestion as Suggestion;
      const filled = applySuggestion(form, suggestion, mediums, subjects);
      setAltText(suggestion.altText);
      setSeriesNote(describeSeries(suggestion, filled.includes("series")));
      setProposed((current) => [
        ...current,
        ...newSubjectNames(suggestion.newSubjects, [...subjects, ...current].map((item) => item.name))
          .map((name) => ({ name, checked: false })),
      ]);
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
      <p className="text-xs text-muted">Reads the first image and fills empty fields. Review everything before saving.</p>
      <input type="hidden" name="aiAltText" value={altText} readOnly />
    </div>
  );
}

// Rendered under the Series field, so the note sits beside the value it describes.
export function AiSeriesNote() {
  const { seriesNote } = useAiArtwork();
  if (!seriesNote) return null;
  return <p className="text-xs text-muted">{seriesNote}</p>;
}

