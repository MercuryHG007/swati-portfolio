"use client";

import { useEffect, useMemo, useRef, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { deleteArtwork } from "./actions";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { AdminThumbnail } from "@/components/admin/thumbnail";
import { ActionIcon, Select, inputClass, secondaryButtonClass } from "@/components/admin/ui";
import { capitalize } from "@/lib/format";
import {
  PAGE_SIZES,
  filterAndSortArtworks,
  isListParam,
  paginate,
  parseArtworkListQuery,
  serializeArtworkListQuery,
  type ArtworkListQuery,
  type PageSize,
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

// The filters live in the URL so reloads and Back keep them. Edit and save return to the bare
// /admin/artworks, so the last state is also kept in sessionStorage and restored when the URL has no list params.
const STORAGE_KEY = "admin-artworks-list";

function readStoredQuery() {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredQuery(value: string) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Storage can be unavailable (private mode); the URL still carries the state.
  }
}

function subscribeNone() {
  return () => {};
}

export function ArtworkList({ artworks, action }: { artworks: ArtworkRow[]; action: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Null on the server and during hydration, so the first render matches the server output.
  const storedQuery = useSyncExternalStore(subscribeNone, readStoredQuery, () => null);
  const listTopRef = useRef<HTMLDivElement>(null);

  const hasListParams = Array.from(searchParams.keys()).some(isListParam);
  const source = hasListParams ? searchParams.toString() : (storedQuery ?? "");
  const listQuery = useMemo(() => parseArtworkListQuery(new URLSearchParams(source)), [source]);

  useEffect(() => {
    if (hasListParams) writeStoredQuery(serializeArtworkListQuery(listQuery).toString());
  }, [hasListParams, listQuery]);

  // Changes go through replaceState, which Next.js reflects in useSearchParams without a server request.
  function update(patch: Partial<ArtworkListQuery>, { resetPage = true } = {}) {
    const next: ArtworkListQuery = { ...listQuery, page: resetPage ? 1 : listQuery.page, ...patch };
    const params = serializeArtworkListQuery(next);
    // Keep one-off feedback params such as ?saved=1 for the toast.
    searchParams.forEach((value, key) => {
      if (!isListParam(key)) params.append(key, value);
    });
    window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
  }

  function goToPage(page: number) {
    update({ page }, { resetPage: false });
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
          onChange={(event) => update({ q: event.target.value })}
          placeholder="Search by title"
          aria-label="Search artworks by title"
          className={`${inputClass} w-full`}
        />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Select
            aria-label="Filter by status"
            value={listQuery.status}
            onChange={(event) => update({ status: event.target.value })}
          >
            <option value="all">All statuses</option>
            <option value="featured">Featured</option>
            <option value="published">Published</option>
            <option value="hidden">Hidden</option>
          </Select>
          <Select
            aria-label="Filter by medium"
            value={listQuery.mediumId}
            onChange={(event) => update({ mediumId: event.target.value })}
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
            onChange={(event) => update({ seriesId: event.target.value })}
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
            onChange={(event) => update({ sort: event.target.value as SortKey })}
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
                onClick={() => update({ q: "", status: "all", mediumId: "all", seriesId: "all" })}
                className="w-fit cursor-pointer text-foreground underline"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {filtered.length > 0 ? (
        <nav aria-label="Artwork pages" className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
          <span>
            {rangeStart}–{rangeEnd} of {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <div className="w-36">
              <Select
                aria-label="Artworks per page"
                value={listQuery.size}
                onChange={(event) => update({ size: Number(event.target.value) as PageSize })}
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size} per page
                  </option>
                ))}
              </Select>
            </div>
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className={`${secondaryButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              Previous
            </button>
            <span className="whitespace-nowrap">
              Page {page} of {pageCount}
            </span>
            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={page >= pageCount}
              className={`${secondaryButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              Next
            </button>
          </div>
        </nav>
      ) : null}
    </>
  );
}
