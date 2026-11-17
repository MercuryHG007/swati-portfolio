import type { Metadata } from "next";
import type { AvailabilityStatus } from "@/models/shared";

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

export function absoluteUrl(path: string): string {
  // The root has no trailing slash, matching the canonical tag Next renders for the home page.
  if (path === "/") return getSiteUrl().origin;
  return new URL(path, getSiteUrl()).toString();
}

export function cloudinaryImageUrl(publicId: string, transform = "c_limit,w_1200"): string | undefined {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName || !publicId) return undefined;
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transform}/${publicId}`;
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

// sameAs links the site to profiles the artist controls. homeLocation tells search engines and AI tools which "Swati Garg" this is.
export function artistJsonLd({
  instagram,
  location,
}: { instagram?: string; location?: string } = {}) {
  const sameAs = [instagram].filter((url): url is string => Boolean(url));
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": absoluteUrl("/#artist"),
    name: "Swati Garg",
    jobTitle: "Artist",
    url: absoluteUrl("/"),
    ...(location && { homeLocation: { "@type": "Place", name: location } }),
    ...(sameAs.length > 0 && { sameAs }),
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
    .map((publicId) => cloudinaryImageUrl(publicId))
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
  const image = exhibition.images?.[0] ? cloudinaryImageUrl(exhibition.images[0].publicId) : undefined;
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
