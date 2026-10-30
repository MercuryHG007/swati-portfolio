"use client";

import { useMemo, useState } from "react";
import { inputClass } from "@/components/admin/ui";

export type ArtworkOption = { id: string; title: string; year?: number };

export function ArtworkMultiSelect({
  name,
  options,
  initialSelectedIds,
}: {
  name: string;
  options: ArtworkOption[];
  initialSelectedIds: string[];
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelectedIds));

  const MAX_VISIBLE = 5;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => option.title.toLowerCase().includes(q));
  }, [query, options]);

  const visible = filtered.slice(0, MAX_VISIBLE);
  const hiddenCount = filtered.length - visible.length;

  const selectedOptions = options.filter((option) => selected.has(option.id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {selectedOptions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedOptions.map((option) => (
            <span
              key={option.id}
              className="flex items-center gap-1 rounded-full border border-accent px-3 py-1 text-xs text-foreground"
            >
              {option.title}
              <input type="hidden" name={name} value={option.id} />
              <button
                type="button"
                onClick={() => toggle(option.id)}
                aria-label={`Remove ${option.title}`}
                className="text-muted hover:text-accent"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <input
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search artworks by title…"
        className={inputClass}
      />
      <div className="flex flex-col gap-1 rounded-md border border-border p-2">
        {filtered.length === 0 ? <p className="text-xs text-muted">No matching artworks.</p> : null}
        {visible.map((option) => (
          <label key={option.id} className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={selected.has(option.id)} onChange={() => toggle(option.id)} />
            {option.title}
            {option.year ? ` (${option.year})` : ""}
          </label>
        ))}
        {hiddenCount > 0 ? (
          <p className="text-xs text-muted">{hiddenCount} more match{hiddenCount === 1 ? "" : "es"} — refine your search.</p>
        ) : null}
      </div>
    </div>
  );
}
