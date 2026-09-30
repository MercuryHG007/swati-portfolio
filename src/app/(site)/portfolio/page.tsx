import Link from "next/link";
import { ProtectedImage } from "@/components/cloudinary-image";
import {
  getPublishedSeries,
  getStandaloneArtworks,
  getMediums,
  getSubjects,
} from "@/lib/queries";
import { ArtworkCard } from "@/components/artwork-card";

export const revalidate = 60;

export default async function PortfolioPage() {
  const [series, standalone, mediums, subjects] = await Promise.all([
    getPublishedSeries(),
    getStandaloneArtworks(),
    getMediums(),
    getSubjects(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-16 px-6 py-16">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold text-foreground">Portfolio</h1>
        <p className="max-w-2xl text-muted">
          Browse by series, or filter across the full body of work by medium or subject.
        </p>
        {(mediums.length > 0 || subjects.length > 0) && (
          <div className="mt-2 flex flex-wrap gap-2">
            {mediums.map((medium) => (
              <Link
                key={medium.slug}
                href={`/portfolio/medium/${medium.slug}`}
                className="rounded-full border border-border px-3 py-1 text-xs text-foreground hover:border-accent hover:text-accent"
              >
                {medium.name}
              </Link>
            ))}
            {subjects.map((subject) => (
              <Link
                key={subject.slug}
                href={`/portfolio/subject/${subject.slug}`}
                className="rounded-full border border-border px-3 py-1 text-xs text-foreground hover:border-accent hover:text-accent"
              >
                {subject.name}
              </Link>
            ))}
          </div>
        )}
      </header>

      {series.length > 0 && (
        <section className="flex flex-col gap-6">
          <h2 className="text-lg font-semibold text-foreground">Series</h2>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            {series.map((s) => (
              <Link key={s.slug} href={`/portfolio/series/${s.slug}`} className="group block">
                <div className="relative aspect-[16/10] overflow-hidden rounded-md bg-surface">
                  {s.coverImage ? (
                    <ProtectedImage
                      src={s.coverImage.publicId}
                      alt={s.coverImage.alt || s.title}
                      fill
                      crop="fill"
                      gravity="auto"
                      sizes="(min-width: 640px) 50vw, 100vw"
                      className="object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : null}
                </div>
                <h3 className="mt-3 text-base font-semibold text-foreground">{s.title}</h3>
                {s.description ? (
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{s.description}</p>
                ) : null}
              </Link>
            ))}
          </div>
        </section>
      )}

      {standalone.length > 0 && (
        <section className="flex flex-col gap-6">
          <h2 className="text-lg font-semibold text-foreground">More work</h2>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
            {standalone.map((artwork) => (
              <ArtworkCard
                key={artwork.slug}
                slug={artwork.slug}
                title={artwork.title}
                year={artwork.year}
                image={artwork.images?.[0]}
              />
            ))}
          </div>
        </section>
      )}

      {series.length === 0 && standalone.length === 0 && (
        <p className="text-muted">New work coming soon.</p>
      )}
    </main>
  );
}
