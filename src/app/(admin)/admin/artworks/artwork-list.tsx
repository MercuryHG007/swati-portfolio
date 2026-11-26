"use client";

import { useMemo, useRef, type ReactNode } from "react";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { deleteArtwork } from "./actions";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { AdminThumbnail } from "@/components/admin/thumbnail";
import { ListPagination } from "@/components/admin/list-pagination";
import { useAdminListQuery } from "@/components/admin/use-admin-list-query";
import { ActionIcon, Select, inputClass } from "@/components/admin/ui";
import { capitalize } from "@/lib/format";
import { paginate } from "@/lib/admin-list";
import {
  ARTWORK_LIST_PARAM_KEYS,
  filterAndSortArtworks,
  parseArtworkListQuery,
  serializeArtworkListQuery,
  type ArtworkListQuery,
  type SortKey,
} from "@/lib/admin-artwork-list";

export type ArtworkRow = {
  id: string;
  title: string;
  year: number | null;
  status: string;
  featured: boolean;
  mediumId: string | null;
  mediumName: string | null;
  seriesId: string | null;
  seriesTitle: string | null;
  thumb: { publicId: string; alt?: string } | null;
  uploadedAt: number;
};

// The filters live in the URL so reloads and Back keep them, and the last state is restored on the bare list URL.
export function ArtworkList({ artworks, action }: { artworks: ArtworkRow[]; action: ReactNode }) {
  const listTopRef = useRef<HTMLDivElement>(null);
  const { query: listQuery, update } = useAdminListQuery<ArtworkListQuery>({
    storageKey: "admin-artworks-list",
    paramKeys: ARTWORK_LIST_PARAM_KEYS,
    parse: parseArtworkListQuery,
    serialize: serializeArtworkListQuery,
  });

  // Any filter or sort change starts again from the first page.
  function changeFilters(patch: Partial<ArtworkListQuery>) {
    update({ page: 1, ...patch });
  }

  function goToPage(page: number) {
    update({ page });
    listTopRef.current?.scrollIntoView({ block: "start" });
  }

  const mediums = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of artworks) if (a.mediumId && a.mediumName) map.set(a.mediumId, a.mediumName);
    return [...map].sort((x, y) => x[1].localeCompare(y[1]));
  }, [artworks]);

  const series = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of artworks) if (a.seriesId && a.seriesTitle) map.set(a.seriesId, a.seriesTitle);
    return [...map].sort((x, y) => x[1].localeCompare(y[1]));
  }, [artworks]);

  const isFiltered =
    listQuery.q.trim() !== "" || listQuery.status !== "all" || listQuery.mediumId !== "all" || listQuery.seriesId !== "all";

  const filtered = useMemo(() => filterAndSortArtworks(artworks, listQuery), [artworks, listQuery]);
  const { pageItems, page, pageCount, rangeStart, rangeEnd } = paginate(filtered, listQuery.page, listQuery.size);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">
          Artworks
          <span className="ml-2 text-base font-normal text-muted">
            {isFiltered ? `${filtered.length} of ${artworks.length}` : artworks.length}
          </span>
        </h1>
        {action}
      </div>

      <div ref={listTopRef} className="flex scroll-mt-6 flex-col gap-3">
        <input
          type="search"
          value={listQuery.q}
          onChange={(event) => changeFilters({ q: event.target.value })}
          placeholder="Search by title"
          aria-label="Search artworks by title"
          className={`${inputClass} w-full`}
        />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Select
            aria-label="Filter by status"
            value={listQuery.status}
            onChange={(event) => changeFilters({ status: event.target.value })}
          >
            <option value="all">All statuses</option>
            <option value="featured">Featured</option>
            <option value="published">Published</option>
            <option value="hidden">Hidden</option>
          </Select>
          <Select
            aria-label="Filter by medium"
            value={listQuery.mediumId}
            onChange={(event) => changeFilters({ mediumId: event.target.value })}
          >
            <option value="all">All mediums</option>
            {mediums.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Filter by series"
            value={listQuery.seriesId}
            onChange={(event) => changeFilters({ seriesId: event.target.value })}
          >
            <option value="all">All series</option>
            <option value="standalone">Standalone</option>
            {series.map(([id, title]) => (
              <option key={id} value={id}>
                {title}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Sort artworks"
            value={listQuery.sort}
            onChange={(event) => changeFilters({ sort: event.target.value as SortKey })}
          >
            <option value="uploadNewest">Uploaded, newest</option>
            <option value="uploadOldest">Uploaded, oldest</option>
            <option value="newest">Year, newest</option>
            <option value="oldest">Year, oldest</option>
            <option value="title">Title A–Z</option>
            <option value="order">Portfolio order</option>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {pageItems.map((artwork) => (
          <div
            key={artwork.id}
            className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2"
          >
            <div className="flex min-w-0 items-center gap-3">
              <AdminThumbnail image={artwork.thumb} alt={artwork.title} />
              <div className="min-w-0">
                <p className="truncate text-foreground">
                  {artwork.title} {artwork.year ? `(${artwork.year})` : ""}
                </p>
                <p className="text-xs text-muted">
                  {[
                    artwork.featured ? "Featured" : null,
                    capitalize(artwork.status),
                    artwork.mediumName ?? "No medium",
                    artwork.seriesTitle,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Link href={`/admin/artworks/${artwork.id}`} aria-label={`Edit ${artwork.title}`}>
                <ActionIcon icon={Pencil} />
              </Link>
              <form action={deleteArtwork}>
                <input type="hidden" name="id" value={artwork.id} />
                <ConfirmButton
                  confirmText={`Delete artwork "${artwork.title}"?`}
                  aria-label={`Delete ${artwork.title}`}
                >
                  <ActionIcon icon={Trash2} variant="danger" />
                </ConfirmButton>
              </form>
            </div>
          </div>
        ))}
        {artworks.length === 0 ? <p className="text-muted">No artworks yet.</p> : null}
        {artworks.length > 0 && filtered.length === 0 ? (
          <div className="flex flex-col gap-2 text-muted">
            <p>No artworks match these filters.</p>
            {isFiltered ? (
              <button
                type="button"
                onClick={() => changeFilters({ q: "", status: "all", mediumId: "all", seriesId: "all" })}
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
        size={listQuery.size}
        onPageChange={goToPage}
        onSizeChange={(size) => changeFilters({ size })}
      />
    </>
  );
}
