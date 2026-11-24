import Link from "next/link";
import { notFound } from "next/navigation";
import { getSeriesById, getArtworksBySeriesIdAdmin, getAllArtworks } from "@/lib/admin-queries";
import { getYear } from "@/lib/format";
import { SeriesForm } from "../series-form";
import { updateSeries } from "../actions";
import { SeriesArtworksList } from "./series-artworks-list";
import { ToastOnLoad } from "@/components/admin/toast-on-load";

export default async function EditSeriesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const series = await getSeriesById(id);
  if (!series) notFound();
  const [artworks, allArtworks] = await Promise.all([getArtworksBySeriesIdAdmin(id), getAllArtworks()]);
  const artworkItems = artworks.map((artwork) => ({
    _id: String(artwork._id),
    title: artwork.title,
    status: artwork.status,
    thumb: artwork.images?.[0] ? { publicId: artwork.images[0].publicId, alt: artwork.images[0].alt } : null,
  }));
  const catalog = allArtworks.map((artwork) => ({
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Edit series</h1>
        <Link href={`/portfolio/series/${series.slug}`} className="text-sm text-muted hover:text-accent">
          View
        </Link>
      </div>
      <SeriesForm
        series={{
          _id: String(series._id),
          title: series.title,
          slug: series.slug,
          description: series.description,
          coverImage: series.coverImage
            ? {
                publicId: series.coverImage.publicId,
                width: series.coverImage.width,
                height: series.coverImage.height,
                alt: series.coverImage.alt,
              }
            : null,
          status: series.status,
          featured: series.featured ?? false,
        }}
        action={updateSeries}
      />
      <SeriesArtworksList
        seriesId={id}
        seriesTitle={series.title}
        initialArtworks={artworkItems}
        catalog={catalog}
      />
    </main>
  );
}

