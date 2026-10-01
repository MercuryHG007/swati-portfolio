import Link from "next/link";
import { notFound } from "next/navigation";
import { getSeriesById, getArtworksBySeriesIdAdmin } from "@/lib/admin-queries";
import { SeriesForm } from "../series-form";
import { updateSeries } from "../actions";
import { SeriesArtworksList } from "./series-artworks-list";

export default async function EditSeriesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const series = await getSeriesById(id);
  if (!series) notFound();
  const artworks = await getArtworksBySeriesIdAdmin(id);
  const artworkItems = artworks.map((artwork) => ({
    _id: String(artwork._id),
    title: artwork.title,
    status: artwork.status,
  }));

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Edit series</h1>
        <Link href={`/portfolio/series/${series.slug}`} className="text-sm text-muted hover:text-accent">
          View
        </Link>
      </div>
      {error === "invalid" ? <p className="text-sm text-red-600">Title is required.</p> : null}
      <SeriesForm series={series} action={updateSeries} />
      <SeriesArtworksList seriesId={id} initialArtworks={artworkItems} />
    </main>
  );
}

