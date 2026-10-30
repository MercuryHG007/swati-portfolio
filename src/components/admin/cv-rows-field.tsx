"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { inputClass, secondaryButtonClass } from "@/components/admin/ui";

export type CvRow = { title: string; detail: string; date: string };

// Repeatable CV lines (education, awards, achievements). Rows are submitted as one JSON hidden field,
// the same approach the image uploader uses, and parsed server-side by readCvRows().
export function CvRowsField({
  name,
  initial,
  addLabel = "Add entry",
}: {
  name: string;
  initial: CvRow[];
  addLabel?: string;
}) {
  const [rows, setRows] = useState<CvRow[]>(initial);

  function update(index: number, key: keyof CvRow, value: string) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  }

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name={name} value={JSON.stringify(rows)} />
      {rows.map((row, index) => (
        <div key={index} className="grid grid-cols-[1fr_auto] gap-2 rounded-md border border-border p-3">
          <div className="grid gap-2 sm:grid-cols-[1fr_9rem]">
            <input
              value={row.title}
              onChange={(event) => update(index, "title", event.target.value)}
              placeholder="Title (e.g. MA Drawing and Painting)"
              aria-label="Title"
              className={inputClass}
            />
            <input
              value={row.date}
              onChange={(event) => update(index, "date", event.target.value)}
              placeholder="Date (e.g. 1997 – 1999)"
              aria-label="Date"
              className={inputClass}
            />
            <input
              value={row.detail}
              onChange={(event) => update(index, "detail", event.target.value)}
              placeholder="Detail (e.g. Meerut University)"
              aria-label="Detail"
              className={`${inputClass} sm:col-span-2`}
            />
          </div>
          <button
            type="button"
            onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
            aria-label="Remove entry"
            className="self-start rounded-md p-2 text-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setRows((prev) => [...prev, { title: "", detail: "", date: "" }])}
        className={`${secondaryButtonClass} flex w-fit items-center gap-2 text-sm`}
      >
        <Plus className="h-4 w-4" />
        {addLabel}
      </button>
    </div>
  );
}
