"use client";

import { useState, type MouseEvent } from "react";
import { toast } from "sonner";
import { secondaryButtonClass } from "@/components/admin/ui";

interface Option {
  id: string;
  name: string;
}

interface Suggestion {
  title: string;
  description: string;
  seoDescription: string;
  altText: string;
  medium: string;
  subjects: string[];
}

function firstImagePublicId(form: HTMLFormElement): string | null {
  const field = form.elements.namedItem("images") as HTMLInputElement | null;
  try {
    const images: unknown = JSON.parse(field?.value || "[]");
    const first = Array.isArray(images) ? images[0] : null;
    const publicId = first && typeof first === "object" ? (first as { publicId?: unknown }).publicId : null;
    return typeof publicId === "string" ? publicId : null;
  } catch {
    return null;
  }
}

// Only empty fields are filled, so anything the admin has already written is kept.
function applySuggestion(form: HTMLFormElement, suggestion: Suggestion, mediums: Option[], subjects: Option[]): string[] {
  const filled: string[] = [];

  const fillText = (name: string, label: string, value: string) => {
    const field = form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null;
    if (!field || field.value.trim() || !value) return;
    field.value = value;
    filled.push(label);
  };
  fillText("title", "title", suggestion.title);
  fillText("description", "description", suggestion.description);
  fillText("seoDescription", "SEO description", suggestion.seoDescription);

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

  return filled;
}

export function AiArtworkAssist({ mediums, subjects }: { mediums: Option[]; subjects: Option[] }) {
  const [busy, setBusy] = useState(false);
  const [altText, setAltText] = useState("");

  async function suggest(event: MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;
    if (!form) return;
    const publicId = firstImagePublicId(form);
    if (!publicId) {
      toast.error("Upload an image first.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/admin/artwork-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicId,
          mediums: mediums.map((option) => option.name),
          subjects: subjects.map((option) => option.name),
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.suggestion) {
        toast.error(payload?.error ?? "The AI assistant could not suggest details.");
        return;
      }

      const suggestion = payload.suggestion as Suggestion;
      const filled = applySuggestion(form, suggestion, mediums, subjects);
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
      <p className="text-xs text-muted">Reads the first image and fills empty fields. Review everything before saving.</p>
      <input type="hidden" name="aiAltText" value={altText} readOnly />
    </div>
  );
}
