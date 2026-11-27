import { databaseBreakerOpen, databaseHasNoPublishedArtworks } from "@/lib/resilient-read";
import { Artwork, Exhibition, Medium, Series, Subject } from "@/models";

// The detail pages render inside a loading.tsx Suspense boundary, so notFound() runs after the 200 has started
// streaming and missing slugs were served as soft 404s. These rules run in the proxy, before streaming starts.
export type SlugTarget = { kind: "moved"; location: string; status: 308 } | { kind: "gone" };

type SlugRule = {
  pattern: RegExp;
  lookup: (slug: string) => Promise<SlugTarget | null>;
};

type PublishedModel = typeof Artwork | typeof Series | typeof Exhibition;

// Published records: null when the slug is live, a redirect when it's in the slug history, otherwise gone.
function publishedRule(pattern: RegExp, model: PublishedModel, toPath: (slug: string) => string): SlugRule {
  return {
    pattern,
    async lookup(slug) {
      if (await model.exists({ slug, status: "published" })) return null;
      const current = await model
        .findOne({ slugHistory: slug, status: "published" })
        .select("slug")
        .lean<{ slug: string }>();
      return current ? { kind: "moved", location: toPath(current.slug), status: 308 } : { kind: "gone" };
    },
  };
}

// Legacy filter URLs (no publish status): existing means redirect to the portfolio filter, otherwise gone.
function legacyFilterRule(pattern: RegExp, model: typeof Medium | typeof Subject, param: string): SlugRule {
  return {
    pattern,
    async lookup(slug) {
      if (!(await model.exists({ slug }))) return { kind: "gone" };
      return { kind: "moved", location: `/portfolio?${param}=${encodeURIComponent(slug)}#portfolio`, status: 308 };
    },
  };
}

const SLUG_RULES: SlugRule[] = [
  publishedRule(/^\/artwork\/([^/]+)\/?$/, Artwork, (slug) => `/artwork/${slug}`),
  publishedRule(/^\/portfolio\/series\/([^/]+)\/?$/, Series, (slug) => `/portfolio/series/${slug}`),
  publishedRule(/^\/exhibitions\/([^/]+)\/?$/, Exhibition, (slug) => `/exhibitions/${slug}`),
  legacyFilterRule(/^\/portfolio\/medium\/([^/]+)\/?$/, Medium, "medium"),
  legacyFilterRule(/^\/portfolio\/subject\/([^/]+)\/?$/, Subject, "subject"),
];

export function matchSlugRoute(pathname: string): { rule: SlugRule; slug: string } | null {
  for (const rule of SLUG_RULES) {
    const match = rule.pattern.exec(pathname);
    if (match) return { rule, slug: match[1] };
  }
  return null;
}

// Returns null to serve the page as usual. That covers live slugs, unknown paths, a database that is down
// (the page then falls back to the content snapshot), and a database with no published artworks at all,
// which the snapshot fallback treats as wiped.
export async function resolveSlugRoute(pathname: string): Promise<SlugTarget | null> {
  const match = matchSlugRoute(pathname);
  if (!match || databaseBreakerOpen()) return null;
  try {
    const target = await match.rule.lookup(match.slug);
    if (target?.kind === "gone" && (await databaseHasNoPublishedArtworks())) return null;
    return target;
  } catch (error) {
    console.error(`[slug-routing] lookup failed for ${pathname}; serving the page as usual.`, error);
    return null;
  }
}
