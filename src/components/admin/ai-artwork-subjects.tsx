"use client";

import { useState, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { useAiArtwork } from "@/components/admin/ai-artwork-context";
import { inputClass, secondaryButtonClass } from "@/components/admin/ui";
import { slugify } from "@/lib/slugify";
import { normalizeSubjectName } from "@/lib/subject-names";

interface Option {
  id: string;
  name: string;
}

// Sits under the Subjects field. Ticked names are created as subjects when the artwork is saved.
export function NewSubjectsField({ subjects }: { subjects: Option[] }) {
  const { proposed, setProposed } = useAiArtwork();
  const [manualName, setManualName] = useState("");

  function setChecked(name: string, checked: boolean) {
    setProposed((current) => current.map((item) => (item.name === name ? { ...item, checked } : item)));
  }

  function addManualSubject() {
    const name = normalizeSubjectName(manualName);
    setManualName("");
    if (!name) return;
    const key = slugify(name);
    if (subjects.some((option) => slugify(option.name) === key)) {
      toast.info(`"${name}" already exists. Tick it in Subjects above.`);
      return;
    }
    setProposed((current) =>
      current.some((item) => slugify(item.name) === key)
        ? current.map((item) => (slugify(item.name) === key ? { ...item, checked: true } : item))
        : [...current, { name, checked: true }],
    );
  }

  function handleManualKey(event: KeyboardEvent<HTMLInputElement>) {
    // Enter would otherwise submit the whole artwork form.
    if (event.key !== "Enter") return;
    event.preventDefault();
    addManualSubject();
  }

  return (
    <div className="flex flex-col gap-2 border-l-2 border-border pl-3 text-sm text-foreground">
      <p>New subjects</p>
      <p className="text-xs text-muted">
        Ticked subjects are created and attached when you save. Unticked suggestions are not saved.
      </p>
      {proposed.length ? (
        <div className="flex flex-wrap gap-3">
          {proposed.map((item) => (
            <label key={item.name} className="flex items-center gap-1">
              <input
                type="checkbox"
                name="newSubjects"
                value={item.name}
                checked={item.checked}
                onChange={(event) => setChecked(item.name, event.target.checked)}
              />
              {item.name}
            </label>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted">No new subjects yet. Use the AI button or add one below.</p>
      )}
      <div className="flex gap-2">
        <input
          value={manualName}
          onChange={(event) => setManualName(event.target.value)}
          onKeyDown={handleManualKey}
          maxLength={60}
          placeholder="Add a subject manually"
          className={`${inputClass} flex-1`}
        />
        <button type="button" onClick={addManualSubject} className={secondaryButtonClass}>
          Add
        </button>
      </div>
    </div>
  );
}
