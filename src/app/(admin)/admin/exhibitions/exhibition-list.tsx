"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { deleteExhibition } from "./actions";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { ActionIcon, Select, cardClass, inputClass } from "@/components/admin/ui";

export type ExhibitionRow = {
  id: string;
  title: string;
  venue: string;
  status: string;
  range: string;
  startTime: number;
};

type SortKey = "newest" | "oldest" | "title";

export function ExhibitionList({ exhibitions }: { exhibitions: ExhibitionRow[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<SortKey>("newest");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = exhibitions.filter(
      (e) =>
        (!q || e.title.toLowerCase().includes(q) || e.venue.toLowerCase().includes(q)) &&
        (status === "all" || e.status === status)
    );
    if (sort === "title") return [...list].sort((a, b) => a.title.localeCompare(b.title));
    return [...list].sort((a, b) => (sort === "newest" ? b.startTime - a.startTime : a.startTime - b.startTime));
  }, [exhibitions, query, status, sort]);

  return (
    <>
      <div className="flex flex-col gap-3">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by title or venue"
          aria-label="Search exhibitions by title or venue"
          className={`${inputClass} w-full`}
        />
        <div className="grid grid-cols-2 gap-3">
          <Select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="published">Published</option>
            <option value="hidden">Hidden</option>
          </Select>
          <Select aria-label="Sort exhibitions" value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
            <option value="newest">Date, newest</option>
            <option value="oldest">Date, oldest</option>
            <option value="title">Title A–Z</option>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {visible.map((exhibition) => (
          <div key={exhibition.id} className={`${cardClass} flex items-center justify-between gap-3`}>
            <div>
              <p className="text-foreground">{exhibition.title}</p>
              <p className="text-xs text-muted">
                {exhibition.status} · {exhibition.venue} · {exhibition.range}
              </p>
            </div>
            <div className="flex gap-2">
              <Link href={`/admin/exhibitions/${exhibition.id}`} aria-label={`Edit ${exhibition.title}`}>
                <ActionIcon icon={Pencil} />
              </Link>
              <form action={deleteExhibition}>
                <input type="hidden" name="id" value={exhibition.id} />
                <ConfirmButton
                  confirmText={`Delete exhibition "${exhibition.title}"?`}
                  aria-label={`Delete ${exhibition.title}`}
                >
                  <ActionIcon icon={Trash2} variant="danger" />
                </ConfirmButton>
              </form>
            </div>
          </div>
        ))}
        {exhibitions.length === 0 ? <p className="text-muted">No exhibitions yet.</p> : null}
        {exhibitions.length > 0 && visible.length === 0 ? (
          <p className="text-muted">No exhibitions match these filters.</p>
        ) : null}
      </div>
    </>
  );
}
