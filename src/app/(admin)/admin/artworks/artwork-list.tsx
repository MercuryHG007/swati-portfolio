"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { deleteArtwork } from "./actions";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { AdminThumbnail } from "@/components/admin/thumbnail";
import { ActionIcon, Select, cardClass, inputClass } from "@/components/admin/ui";
import { capitalize } from "@/lib/format";

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
};

type SortKey = "order" | "newest" | "oldest" | "title";

// Years sort with unknown years last, whichever direction is chosen.
function byYear(direction: 1 | -1) {
  return (a: ArtworkRow, b: ArtworkRow) => {
    if (a.year == null && b.year == null) return 0;
    if (a.year == null) return 1;
    if (b.year == null) return -1;
    return (a.year - b.year) * direction;
  };
}

export function ArtworkList({ artworks }: { artworks: ArtworkRow[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [mediumId, setMediumId] = useState("all");
  const [seriesId, setSeriesId] = useState("all");
  const [sort, setSort] = useState<SortKey>("order");

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

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = artworks.filter(
      (a) =>
        (!q || a.title.toLowerCase().includes(q)) &&
        (status === "all" || (status === "featured" ? a.featured : a.status === status)) &&
        (mediumId === "all" || a.mediumId === mediumId) &&
        (seriesId === "all" || (seriesId === "standalone" ? !a.seriesId : a.seriesId === seriesId))
    );
    if (sort === "order") return list;
    if (sort === "title") return [...list].sort((a, b) => a.title.localeCompare(b.title));
    return [...list].sort(byYear(sort === "newest" ? -1 : 1));
  }, [artworks, query, status, mediumId, seriesId, sort]);

  return (
    <>
      <div className="flex flex-col gap-3">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by title"
          aria-label="Search artworks by title"
          className={`${inputClass} w-full`}
        />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="featured">Featured</option>
            <option value="published">Published</option>
            <option value="hidden">Hidden</option>
          </Select>
          <Select aria-label="Filter by medium" value={mediumId} onChange={(event) => setMediumId(event.target.value)}>
            <option value="all">All mediums</option>
            {mediums.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </Select>
          <Select aria-label="Filter by series" value={seriesId} onChange={(event) => setSeriesId(event.target.value)}>
            <option value="all">All series</option>
            <option value="standalone">Standalone</option>
            {series.map(([id, title]) => (
              <option key={id} value={id}>
                {title}
              </option>
            ))}
          </Select>
          <Select aria-label="Sort artworks" value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
            <option value="order">Default order</option>
            <option value="newest">Year, newest</option>
            <option value="oldest">Year, oldest</option>
            <option value="title">Title A–Z</option>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {visible.map((artwork) => (
          <div key={artwork.id} className={`${cardClass} flex items-center justify-between gap-3`}>
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
        {artworks.length > 0 && visible.length === 0 ? (
          <p className="text-muted">No artworks match these filters.</p>
        ) : null}
      </div>
    </>
  );
}
