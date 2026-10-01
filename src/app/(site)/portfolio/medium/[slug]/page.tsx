import { notFound } from "next/navigation";
import { getArtworksByMediumSlug } from "@/lib/queries";
import { ArtworkCard } from "@/components/artwork-card";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { getYear } from "@/lib/format";

export const revalidate = 60;

export default async function MediumDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { medium, artworks } = await getArtworksByMediumSlug(slug);
  if (!medium) notFound();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-16">
      <Breadcrumbs items={[{ label: "Portfolio", href: "/portfolio" }, { label: medium.name }]} />
      <header className="flex flex-col gap-3">
        <p className="font-mono text-xs uppercase tracking-wide text-accent">Medium</p>
        <h1 className="text-3xl font-semibold text-foreground">{medium.name}</h1>
      </header>

      {artworks.length > 0 ? (
        <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
          {artworks.map((artwork) => (
            <ArtworkCard
              key={artwork.slug}
              slug={artwork.slug}
              title={artwork.title}
              year={getYear(artwork.dateMade)}
              image={artwork.images?.[0]}
            />
          ))}
        </div>
      ) : (
        <p className="text-muted">No published work for this medium yet.</p>
      )}
    </main>
  );
}
