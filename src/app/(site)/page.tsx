import Link from "next/link";
import { FeaturedCarousel, type CarouselItem } from "@/components/featured-carousel";
import { TextLink } from "@/components/text-link/text-link";
import { getAbout, getFeaturedArtworks, getMediums } from "@/lib/queries";

export const revalidate = 60;

export default async function Home() {
  const [artworks, mediums, about] = await Promise.all([
    getFeaturedArtworks(8),
    getMediums(),
    getAbout(),
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
        <Link
          href="/portfolio"
          className="w-fit rounded-full bg-accent px-6 py-3 text-sm text-accent-foreground hover:opacity-80"
        >
          View portfolio
        </Link>
      </section>

      {carouselItems.length > 0 ? (
        <section className="flex flex-col gap-6">
          <div className="mx-auto flex w-full max-w-6xl items-end justify-between px-6">
            <h2 className="text-xs uppercase tracking-widest text-muted">Featured work</h2>
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
          <h2 className="text-xs uppercase tracking-widest text-muted">Working mediums</h2>
          <ul className="flex flex-wrap gap-3">
            {mediums.map((medium) => (
              <li key={medium.slug}>
                <Link
                  href={`/portfolio/medium/${medium.slug}`}
                  className="inline-block rounded-full border border-foreground px-5 py-2 text-sm text-foreground hover:bg-foreground hover:text-background"
                >
                  {medium.name}
                </Link>
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
          <Link
            href="/contact"
            className="rounded-full bg-accent px-6 py-3 text-accent-foreground hover:opacity-80"
          >
            Get in touch
          </Link>
          {about?.socials?.instagram ? (
            <a
              href={about.socials.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-foreground px-6 py-3 text-foreground hover:bg-foreground hover:text-background"
            >
              Message on Instagram
            </a>
          ) : null}
        </div>
      </section>
    </main>
  );
}
