import Link from "next/link";
import { getAllArtworks } from "@/lib/admin-queries";
import { deleteArtwork } from "./actions";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { buttonClass, dangerButtonClass, secondaryButtonClass, cardClass } from "@/components/admin/ui";

export default async function AdminArtworksListPage() {
  const artworks = await getAllArtworks();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Artworks</h1>
        <Link href="/admin/artworks/new" className={buttonClass}>
          New artwork
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {artworks.map((artwork) => (
          <div key={String(artwork._id)} className={`${cardClass} flex items-center justify-between gap-3`}>
            <div>
              <p className="text-foreground">
                {artwork.title} {artwork.year ? `(${artwork.year})` : ""}
              </p>
              <p className="text-xs text-muted">
                {artwork.status} · {artwork.medium?.name ?? "no medium"}
                {artwork.series?.title ? ` · ${artwork.series.title}` : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <Link href={`/admin/artworks/${artwork._id}`} className={secondaryButtonClass}>
                Edit
              </Link>
              <form action={deleteArtwork}>
                <input type="hidden" name="id" value={String(artwork._id)} />
                <ConfirmButton confirmText={`Delete artwork "${artwork.title}"?`} className={dangerButtonClass}>
                  Delete
                </ConfirmButton>
              </form>
            </div>
          </div>
        ))}
        {artworks.length === 0 ? <p className="text-muted">No artworks yet.</p> : null}
      </div>
    </main>
  );
}
