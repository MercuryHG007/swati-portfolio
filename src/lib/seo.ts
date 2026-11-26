import type { Metadata } from "next";
import type { AvailabilityStatus } from "@/models/shared";
import { r2MediaUrl } from "@/lib/media-storage";
import { toMetaDescription } from "@/lib/meta-description";

// Search description built from the artist's profile, so it changes when the profile changes.
// Reads as: "Swati Garg, <tagline>. Works in <mediums>. Based in <location>."
export function siteDescription({
  tagline,
  location,
  mediums,
}: {
  tagline?: string;
  location?: string;
  mediums: string[];
}): string {
  const sentences = [
    tagline ? `Swati Garg, ${tagline}.` : "Swati Garg.",
    mediums.length > 0 ? `Works in ${joinNames(mediums)}.` : "",
    location ? `Based in ${location}.` : "",
  ];
  return toMetaDescription(sentences.filter(Boolean).join(" ")) ?? "Swati Garg.";
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

// Derived from Vercel's system variables, so no domain is hardcoded. VERCEL_PROJECT_PRODUCTION_URL is
// the project's production domain, so preview and UAT deployments also point canonical links at the live site.
export function getSiteUrl(): URL {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  return new URL(host ? `https://${host}` : "http://localhost:3000");
}

// Only the live site (main branch) may be indexed. Preview and UAT copies duplicate the live content.
// The branch check also covers UAT if the develop branch is ever set as the project's production branch.
export function isIndexableDeployment(): boolean {
  if (!process.env.VERCEL_ENV) return true;
  const branch = process.env.VERCEL_GIT_COMMIT_REF;
  return process.env.VERCEL_ENV === "production" && (!branch || branch === "main");
}

// Content Signals: no AI training, search indexing allowed, and AI assistants may read pages to answer questions.
export const CONTENT_SIGNAL = "ai-train=no, search=yes, ai-input=yes";

export function absoluteUrl(path: string): string {
  // The root has no trailing slash, matching the canonical tag Next renders for the home page.
  if (path === "/") return getSiteUrl().origin;
  return new URL(path, getSiteUrl()).toString();
}

// Absolute URL of the image served from the R2 media domain, for OG, Twitter and JSON-LD. Crawlers need a plain URL.
export function mediaImageUrl(publicId: string, width = 1200): string | undefined {
  if (!publicId) return undefined;
  return r2MediaUrl(publicId, width);
}

type PageMetadataInput = {
  // Full document title, including the site name.
  title: string;
  description?: string;
  // Path without query string, so filtered URLs share one canonical page.
  path: string;
  image?: { url: string; alt: string };
};

export function pageMetadata({ title, description, path, image }: PageMetadataInput): Metadata {
  const images = image ? [{ url: image.url, alt: image.alt }] : undefined;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, type: "website", images },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title,
      description,
      images: images?.map((item) => item.url),
    },
  };
}

// Breadcrumb trail for JSON-LD. Paths must be the same pages the visible breadcrumbs link to.
export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function artistReference() {
  return { "@type": "Person", "@id": absoluteUrl("/#artist"), name: "Swati Garg" };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": absoluteUrl("/#website"),
    name: "Swati Garg",
    url: absoluteUrl("/"),
    inLanguage: "en",
    author: artistReference(),
  };
}

export type ArtistProfile = {
  location?: string;
  bio?: string;
  photoPublicId?: string;
  socials?: { instagram?: string; facebook?: string; linkedin?: string; youtube?: string };
};

// sameAs links the site to profiles the artist controls. homeLocation tells search engines and AI tools which "Swati Garg" this is.
export function artistJsonLd({ location, bio, photoPublicId, socials }: ArtistProfile = {}) {
  const sameAs = [socials?.instagram, socials?.facebook, socials?.linkedin, socials?.youtube].filter(
    (url): url is string => Boolean(url)
  );
  const description = toMetaDescription(bio);
  const image = photoPublicId ? mediaImageUrl(photoPublicId) : undefined;
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": absoluteUrl("/#artist"),
    name: "Swati Garg",
    jobTitle: "Artist",
    url: absoluteUrl("/"),
    ...(description && { description }),
    ...(image && { image }),
    ...(location && { homeLocation: { "@type": "Place", name: location } }),
    ...(sameAs.length > 0 && { sameAs }),
  };
}

// Listing pages (portfolio, series, exhibitions) describe a collection of the artist's work.
export function collectionJsonLd({ name, description, path }: { name: string; description: string; path: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: absoluteUrl(path),
    isPartOf: { "@id": absoluteUrl("/#website") },
  };
}

// schema.org offer availability. Works without a status get no offer.
const OFFER_AVAILABILITY: Partial<Record<AvailabilityStatus, string>> = {
  available: "https://schema.org/InStock",
  sold: "https://schema.org/SoldOut",
};

export function visualArtworkJsonLd(artwork: {
  title: string;
  slug: string;
  description?: string;
  mediumName?: string;
  year?: number | null;
  size?: string;
  availability?: AvailabilityStatus | null;
  imagePublicIds: string[];
  series?: { title: string; slug: string; linkable: boolean };
}) {
  const images = artwork.imagePublicIds
    .map((publicId) => mediaImageUrl(publicId))
    .filter((url): url is string => Boolean(url));
  const availability = artwork.availability ? OFFER_AVAILABILITY[artwork.availability] : undefined;
  return {
    "@context": "https://schema.org",
    "@type": "VisualArtwork",
    name: artwork.title,
    url: absoluteUrl(`/artwork/${artwork.slug}`),
    ...(images.length > 0 && { image: images }),
    ...(artwork.description && { description: artwork.description }),
    ...(artwork.mediumName && { artMedium: artwork.mediumName }),
    ...(artwork.year && { dateCreated: String(artwork.year) }),
    ...(artwork.size && { size: artwork.size }),
    ...(availability && {
      offers: {
        "@type": "Offer",
        availability,
        url: absoluteUrl(`/artwork/${artwork.slug}`),
        seller: artistReference(),
      },
    }),
    creator: artistReference(),
    ...(artwork.series?.linkable && {
      isPartOf: {
        "@type": "CreativeWorkSeries",
        name: artwork.series.title,
        url: absoluteUrl(`/portfolio/series/${artwork.series.slug}`),
      },
    }),
  };
}

export function faqJsonLd(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

// Exhibition dates are stored at UTC midnight (see lib/format.ts), so the UTC calendar day is the stored day.
function isoDay(date: Date | string | undefined): string | undefined {
  if (!date) return undefined;
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString().slice(0, 10);
}

export function exhibitionJsonLd(exhibition: {
  title: string;
  slug: string;
  venue: string;
  city?: string;
  country?: string;
  startDate: Date | string;
  endDate?: Date | string;
  images?: { publicId: string; alt?: string }[];
}) {
  const image = exhibition.images?.[0] ? mediaImageUrl(exhibition.images[0].publicId) : undefined;
  return {
    "@context": "https://schema.org",
    "@type": "ExhibitionEvent",
    name: exhibition.title,
    url: absoluteUrl(`/exhibitions/${exhibition.slug}`),
    startDate: isoDay(exhibition.startDate),
    ...(isoDay(exhibition.endDate) && { endDate: isoDay(exhibition.endDate) }),
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: exhibition.venue,
      address: {
        "@type": "PostalAddress",
        ...(exhibition.city && { addressLocality: exhibition.city }),
        ...(exhibition.country && { addressCountry: exhibition.country }),
      },
    },
    ...(image && { image: [image] }),
    performer: artistReference(),
  };
}
