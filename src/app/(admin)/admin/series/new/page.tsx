import { SeriesForm } from "../series-form";
import { createSeries } from "../actions";
import { getAllArtworks } from "@/lib/admin-queries";
import { getYear } from "@/lib/format";
import { ToastOnLoad } from "@/components/admin/toast-on-load";

export default async function NewSeriesPage() {
  const allArtworks = await getAllArtworks();
  const artworkCatalog = allArtworks.map((artwork) => ({
    _id: String(artwork._id),
    title: artwork.title,
    year: getYear(artwork.dateMade) ?? null,
    status: artwork.status,
    thumb: artwork.images?.[0] ? { publicId: artwork.images[0].publicId, alt: artwork.images[0].alt } : null,
    seriesId: artwork.series ? String(artwork.series._id) : null,
    seriesTitle: artwork.series?.title ?? null,
  }));

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-16">
      <ToastOnLoad
        configs={[
          {
            param: "error",
            type: "error",
            message: {
              invalid: "Title is required.",
              "slug-taken": "Another series already has this title. Change the title slightly and save again.",
            },
          },
        ]}
      />
      <h1 className="text-2xl font-semibold text-foreground">New series</h1>
      <SeriesForm action={createSeries} artworkCatalog={artworkCatalog} />
    </main>
  );
}
