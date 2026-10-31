import { FeaturedCarousel, type CarouselItem } from "@/components/featured-carousel";
import { Button } from "@/components/button/button";
import { TextLink } from "@/components/text-link/text-link";
import { getFeaturedArtworks, getMediums } from "@/lib/queries";

export const revalidate = 60;

export default async function Home() {
  const [artworks, mediums] = await Promise.all([
    getFeaturedArtworks(8),
    getMediums(),
  ]);

  const carouselItems: CarouselItem[] = artworks.map((artwork) => ({
    href: `/artwork/${artwork.slug}`,
    title: artwork.title,
    image: artwork.images?.[0] ?? null,
  }));

  return (
    <main className="flex flex-1 flex-col gap-24 py-16">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6">
        <h1 className="max-w-4xl text-5xl font-medium leading-[1.02] tracking-tight text-foreground md:text-7xl">
          Swati Garg. Paintings exploring light, landscape and quiet moments.
        </h1>
        <Button href="/portfolio" size="lg">
          View Portfolio
        </Button>
      </section>

      {carouselItems.length > 0 ? (
        <section className="flex flex-col gap-6">
          <div className="mx-auto flex w-full max-w-6xl items-end justify-between px-6">
        <h2 className="text-xs uppercase tracking-widest font-sans text-muted">Featured work</h2>
            <TextLink href="/portfolio" variant="primary" className="text-sm text-foreground">
              ALL WORKS
            </TextLink>
          </div>
          <FeaturedCarousel items={carouselItems} />
        </section>
      ) : (
        <p className="mx-auto w-full max-w-6xl px-6 text-muted">New work coming soon.</p>
      )}

      {mediums.length > 0 ? (
        <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6">
          <h2 className="text-xs uppercase tracking-widest font-sans text-muted">Working mediums</h2>
          <ul className="flex flex-wrap gap-3">
            {mediums.map((medium) => (
              <li key={medium.slug}>
                <Button href={`/portfolio/medium/${medium.slug}`} variant="inverse" size="md">
                  {medium.name}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 border-t border-border px-6 pt-12">
        <h2 className="max-w-3xl text-3xl font-medium leading-tight tracking-tight text-foreground md:text-5xl">
          Commissions and enquiries are welcome.
        </h2>
        <div className="flex flex-wrap gap-4 text-sm">
          <Button href="/contact" size="lg">
            Get in touch
          </Button>
        </div>
      </section>
    </main>
  );
}
