"use client";

import { useMemo, useState } from "react";
import { Save, Trash2 } from "lucide-react";
import { updateSubject, deleteSubject } from "./actions";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { ActionIcon, Select, cardClass, inputClass } from "@/components/admin/ui";

export type SubjectRow = {
  id: string;
  name: string;
  artworkCount: number;
  uploadedAt: number;
};

type UsageFilter = "all" | "used" | "unused";
type SortKey = "name" | "mostUsed" | "newest" | "oldest";

export function SubjectList({ subjects }: { subjects: SubjectRow[] }) {
  const [query, setQuery] = useState("");
  const [usage, setUsage] = useState<UsageFilter>("all");
  const [sort, setSort] = useState<SortKey>("name");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = subjects.filter(
      (s) =>
        (!q || s.name.toLowerCase().includes(q)) &&
        (usage === "all" || (usage === "used" ? s.artworkCount > 0 : s.artworkCount === 0))
    );
    if (sort === "mostUsed") {
      return [...list].sort((a, b) => b.artworkCount - a.artworkCount || a.name.localeCompare(b.name));
    }
    if (sort === "newest") return [...list].sort((a, b) => b.uploadedAt - a.uploadedAt);
    if (sort === "oldest") return [...list].sort((a, b) => a.uploadedAt - b.uploadedAt);
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [subjects, query, usage, sort]);

  return (
    <>
      <div className="flex flex-col gap-3">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name"
          aria-label="Search subjects by name"
          className={`${inputClass} w-full`}
        />
        <div className="grid grid-cols-2 gap-3">
          <Select aria-label="Filter by usage" value={usage} onChange={(event) => setUsage(event.target.value as UsageFilter)}>
            <option value="all">All subjects</option>
            <option value="used">In use</option>
            <option value="unused">Unused</option>
          </Select>
          <Select aria-label="Sort subjects" value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
            <option value="name">Name A–Z</option>
            <option value="mostUsed">Most used</option>
            <option value="newest">Uploaded, newest</option>
            <option value="oldest">Uploaded, oldest</option>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {visible.map((subject) => (
          <form key={subject.id} action={updateSubject} className={`${cardClass} flex flex-wrap items-center gap-3`}>
            <input type="hidden" name="id" value={subject.id} />
            <input name="name" defaultValue={subject.name} className={`${inputClass} min-w-0 flex-1`} />
            <span className="whitespace-nowrap text-xs text-muted">
              {subject.artworkCount} {subject.artworkCount === 1 ? "artwork" : "artworks"}
            </span>
            <button type="submit" aria-label={`Save ${subject.name}`} className="cursor-pointer">
              <ActionIcon icon={Save} variant="primary" />
            </button>
            <ConfirmButton
              confirmText={`Delete subject "${subject.name}"?`}
              formAction={deleteSubject}
              aria-label={`Delete ${subject.name}`}
            >
              <ActionIcon icon={Trash2} variant="danger" />
            </ConfirmButton>
          </form>
        ))}
        {subjects.length === 0 ? <p className="text-muted">No subjects yet.</p> : null}
        {subjects.length > 0 && visible.length === 0 ? (
          <p className="text-muted">No subjects match these filters.</p>
        ) : null}
      </div>
    </>
  );
}
