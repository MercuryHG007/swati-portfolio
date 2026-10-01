import Link from "next/link";
import { getFeaturedArtworks } from "@/lib/queries";
import { ArtworkCard } from "@/components/artwork-card";

export const revalidate = 60;

export default async function Home() {
  const artworks = await getFeaturedArtworks(4);

  return (
    <main className="flex flex-1 flex-col gap-16 px-6 py-16">
      <section className="flex flex-col items-center gap-4 text-center">
        <p className="font-mono text-sm tracking-wide text-accent">Swati Garg /</p>
        <h1 className="max-w-2xl text-3xl font-semibold text-foreground">
          Watercolor &amp; Mixed Media Artist
        </h1>
        <p className="max-w-md text-muted">
          Paintings exploring light, landscape and quiet moments — browse the full portfolio,
          exhibitions and more.
        </p>
        <Link
          href="/portfolio"
          className="mt-2 rounded-md bg-accent px-4 py-2 text-sm text-accent-foreground"
        >
          View portfolio
        </Link>
      </section>

      <section className="mx-auto w-full max-w-5xl">
        <h2 className="mb-6 text-lg font-semibold text-foreground">Featured work</h2>
        {artworks.length > 0 ? (
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
            {artworks.map((artwork) => (
              <ArtworkCard
                key={artwork.slug}
                slug={artwork.slug}
                title={artwork.title}
                year={artwork.year}
                image={artwork.images?.[0]}
              />
            ))}
          </div>
        ) : (
          <p className="text-muted">New work coming soon.</p>
        )}
      </section>
    </main>
  );
}

