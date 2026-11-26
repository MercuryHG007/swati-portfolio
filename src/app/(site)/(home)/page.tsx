import type { Metadata } from "next";
import { FeaturedCarousel, type CarouselItem } from "@/components/featured-carousel";
import { Button } from "@/components/button/button";
import { TextLink } from "@/components/text-link/text-link";
import { JsonLd } from "@/components/json-ld";
import { getAbout, getFeaturedArtworks, getHomeSettings, getMediumsWithWork } from "@/lib/queries";
import { r2MediaUrl } from "@/lib/media-storage";
import { artistJsonLd, mediaImageUrl, pageMetadata, websiteJsonLd } from "@/lib/seo";
import { getSiteCopy } from "@/lib/site-copy";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const [cover] = await getFeaturedArtworks(1);
  const image = cover?.images?.[0];
  const url = image ? mediaImageUrl(image.publicId) : undefined;
  const copy = await getSiteCopy();
  return pageMetadata({
    title: copy.title,
    description: copy.description,
    path: "/",
    image: url && cover ? { url, alt: `${cover.title} by Swati Garg` } : undefined,
  });
}

const PLACEHOLDER_WIDTH = 32;

function blurPlaceholder(image: { publicId: string; width: number; height: number }) {
  if (!image.width || !image.height) return undefined;
  return r2MediaUrl(image.publicId, PLACEHOLDER_WIDTH);
}

export default async function Home() {
  const [artworks, mediums, settings, about] = await Promise.all([
    getFeaturedArtworks(8),
    getMediumsWithWork(),
    getHomeSettings(),
    getAbout(),
  ]);

  const carouselItems: CarouselItem[] = artworks.map((artwork) => {
    const image = artwork.images?.[0] ?? null;
    return {
      href: `/artwork/${artwork.slug}`,
      title: artwork.title,
      image,
      placeholder: image ? blurPlaceholder(image) : undefined,
    };
  });

  return (
    <main className="flex flex-1 flex-col gap-16 py-10 md:gap-24 md:py-10">
      <JsonLd
        data={artistJsonLd({
          location: about?.location,
          bio: about?.bio,
          photoPublicId: about?.photo?.publicId,
          socials: about?.socials,
        })}
      />
      <JsonLd data={websiteJsonLd()} />
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 md:gap-8">
        <h1 className="max-w-4xl text-4xl font-medium leading-[1.02] tracking-tight text-foreground sm:text-5xl md:text-7xl">
          {settings.heroHeading}
        </h1>
        <Button href="/portfolio" size="lg">
          {settings.heroButtonLabel}
        </Button>
      </section>

      {carouselItems.length > 0 ? (
        <section className="flex flex-col gap-6">
          <div className="mx-auto flex w-full max-w-6xl items-end justify-between px-6">
        <h2 className="text-xs uppercase tracking-widest font-sans text-muted">{settings.featuredLabel}</h2>
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
          <h2 className="text-xs uppercase tracking-widest font-sans text-muted">{settings.mediumsLabel}</h2>
          <ul className="flex flex-wrap gap-3">
            {mediums.map((medium) => (
              <li key={medium.slug}>
                <Button href={`/portfolio?medium=${encodeURIComponent(medium.slug)}#portfolio`} variant="inverse" size="md">
                  {medium.name}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 border-t border-border px-6 pt-12">
        <h2 className="max-w-3xl text-3xl font-medium leading-tight tracking-tight text-foreground md:text-5xl">
          {settings.commissionsHeading}
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
