import Link from "next/link";
import { ProtectedImage } from "@/components/cloudinary-image";
import {
  getPublishedSeries,
  getStandaloneArtworks,
  getMediums,
  getSubjects,
} from "@/lib/queries";
import { ArtworkCard } from "@/components/artwork-card";
import { CardTitle } from "@/components/card-title/card-title";
import { Pill } from "@/components/pill/pill";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { getYear } from "@/lib/format";

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
      <Breadcrumbs items={[{ label: "Portfolio" }]} />
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-medium text-foreground">Portfolio</h1>
        <p className="max-w-2xl text-muted">
          Browse by series, or filter across the full body of work by medium or subject.
        </p>
        {(mediums.length > 0 || subjects.length > 0) && (
          <div className="mt-2 flex flex-wrap gap-2">
            {mediums.map((medium) => (
              <Pill key={medium.slug} href={`/portfolio/medium/${medium.slug}`}>
                {medium.name}
              </Pill>
            ))}
            {subjects.map((subject) => (
              <Pill key={subject.slug} href={`/portfolio/subject/${subject.slug}`}>
                {subject.name}
              </Pill>
            ))}
          </div>
        )}
      </header>

      {series.length > 0 && (
        <section className="flex flex-col gap-6">
          <h2 className="text-lg font-medium text-foreground">Series</h2>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            {series.map((s, index) => (
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
                      className="scale-[1.05] object-cover transition duration-500 ease-out group-hover:scale-100 group-focus-visible:scale-100 motion-reduce:scale-100 motion-reduce:transition-none"
                      loading={index === 0 ? "eager" : "lazy"}
                    />
                  ) : null}
                </div>
                <h3 className="mt-3 font-sans text-base font-semibold text-foreground">
                  <CardTitle>{s.title}</CardTitle>
                </h3>
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
          <h2 className="text-lg font-medium text-foreground">More work</h2>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
            {standalone.map((artwork, index) => (
              <ArtworkCard
                key={artwork.slug}
                slug={artwork.slug}
                title={artwork.title}
                year={getYear(artwork.dateMade)}
                image={artwork.images?.[0]}
                priority={index === 0 && series.length === 0}
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
