"use client";

import { useMemo, useRef } from "react";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { deleteExhibition } from "./actions";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { ListPagination } from "@/components/admin/list-pagination";
import { useAdminListQuery } from "@/components/admin/use-admin-list-query";
import { ActionIcon, Select, inputClass } from "@/components/admin/ui";
import { capitalize } from "@/lib/format";
import { paginate } from "@/lib/admin-list";
import {
  EXHIBITION_LIST_PARAM_KEYS,
  filterAndSortExhibitions,
  parseExhibitionListQuery,
  serializeExhibitionListQuery,
  type ExhibitionListQuery,
  type ExhibitionSortKey,
} from "@/lib/admin-exhibition-list";

export type ExhibitionRow = {
  id: string;
  title: string;
  venue: string;
  status: string;
  range: string;
  startTime: number;
  uploadedAt: number;
};

// The filters live in the URL so reloads and Back keep them, and the last state is restored on the bare list URL.
export function ExhibitionList({ exhibitions }: { exhibitions: ExhibitionRow[] }) {
  const listTopRef = useRef<HTMLDivElement>(null);
  const { query, update } = useAdminListQuery<ExhibitionListQuery>({
    storageKey: "admin-exhibitions-list",
    paramKeys: EXHIBITION_LIST_PARAM_KEYS,
    parse: parseExhibitionListQuery,
    serialize: serializeExhibitionListQuery,
  });

  // Any filter or sort change starts again from the first page.
  function changeFilters(patch: Partial<ExhibitionListQuery>) {
    update({ page: 1, ...patch });
  }

  function goToPage(page: number) {
    update({ page });
    listTopRef.current?.scrollIntoView({ block: "start" });
  }

  const isFiltered = query.q.trim() !== "" || query.status !== "all";

  const filtered = useMemo(() => filterAndSortExhibitions(exhibitions, query), [exhibitions, query]);
  const { pageItems, page, pageCount, rangeStart, rangeEnd } = paginate(filtered, query.page, query.size);

  return (
    <>
      <div ref={listTopRef} className="flex scroll-mt-6 flex-col gap-3">
        <input
          type="search"
          value={query.q}
          onChange={(event) => changeFilters({ q: event.target.value })}
          placeholder="Search by title or venue"
          aria-label="Search exhibitions by title or venue"
          className={`${inputClass} w-full`}
        />
        <div className="grid grid-cols-2 gap-3">
          <Select
            aria-label="Filter by status"
            value={query.status}
            onChange={(event) => changeFilters({ status: event.target.value })}
          >
            <option value="all">All statuses</option>
            <option value="published">Published</option>
            <option value="hidden">Hidden</option>
          </Select>
          <Select
            aria-label="Sort exhibitions"
            value={query.sort}
            onChange={(event) => changeFilters({ sort: event.target.value as ExhibitionSortKey })}
          >
            <option value="newest">Date, newest</option>
            <option value="oldest">Date, oldest</option>
            <option value="title">Title A–Z</option>
            <option value="uploadNewest">Uploaded, newest</option>
            <option value="uploadOldest">Uploaded, oldest</option>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {pageItems.map((exhibition) => (
          <div
            key={exhibition.id}
            className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-foreground">{exhibition.title}</p>
              <p className="text-xs text-muted">
                {capitalize(exhibition.status)} · {exhibition.venue} · {exhibition.range}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
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
        {exhibitions.length > 0 && filtered.length === 0 ? (
          <div className="flex flex-col gap-2 text-muted">
            <p>No exhibitions match these filters.</p>
            {isFiltered ? (
              <button
                type="button"
                onClick={() => changeFilters({ q: "", status: "all" })}
                className="w-fit cursor-pointer text-foreground underline"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <ListPagination
        total={filtered.length}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        page={page}
        pageCount={pageCount}
        size={query.size}
        onPageChange={goToPage}
        onSizeChange={(size) => changeFilters({ size })}
      />
    </>
  );
}
