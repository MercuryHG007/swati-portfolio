import Link from "next/link";
import { getAllArtworks } from "@/lib/admin-queries";
import { getYear } from "@/lib/format";
import { ArtworkList, type ArtworkRow } from "./artwork-list";
import { buttonClass } from "@/components/admin/ui";
import { ToastOnLoad } from "@/components/admin/toast-on-load";

export default async function AdminArtworksListPage() {
  const artworks = await getAllArtworks();
  const rows: ArtworkRow[] = artworks.map((artwork) => ({
    id: String(artwork._id),
    title: artwork.title,
    year: getYear(artwork.dateMade) ?? null,
    status: artwork.status,
    featured: artwork.featured ?? false,
    mediumId: artwork.medium ? String(artwork.medium._id) : null,
    mediumName: artwork.medium?.name ?? null,
    seriesId: artwork.series ? String(artwork.series._id) : null,
    seriesTitle: artwork.series?.title ?? null,
    thumb: artwork.images?.[0] ? { publicId: artwork.images[0].publicId, alt: artwork.images[0].alt } : null,
  }));

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-16">
      <ToastOnLoad
        configs={[
          { param: "saved", type: "success", message: "Saved." },
          { param: "deleted", type: "success", message: "Deleted." },
        ]}
      />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Artworks</h1>
        <Link href="/admin/artworks/new" className={buttonClass}>
          New Artwork
        </Link>
      </div>

      <ArtworkList artworks={rows} />
    </main>
  );
}

