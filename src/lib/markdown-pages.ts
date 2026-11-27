import {
  getAbout,
  getArtworkBySlug,
  getArtworksBySeriesId,
  getExhibitionBySlug,
  getExhibitionsForArtwork,
  getFeaturedArtworks,
  getHomeSettings,
  getMediums,
  getPortfolioCatalogue,
  getPublishedExhibitions,
  getPublishedFaqs,
  getPublishedSeries,
  getSeriesBySlug,
} from "@/lib/queries";
import { formatDateRange, formatDimensions, getYear } from "@/lib/format";
import { toMetaDescription } from "@/lib/meta-description";
import { getPortfolioDescription, getSiteCopy, taglineOf } from "@/lib/site-copy";
import { aboutDescription, exhibitionsDescription, faqDescription, seriesDescription } from "@/lib/descriptions";
import { absoluteUrl, mediaImageUrl } from "@/lib/seo";
import { escapeLinkText, frontMatter } from "@/lib/markdown";

// Markdown counterparts of the public HTML pages. They read the same queries, so content matches the site.
type Page = {
  path: string;
  title: string;
  heading: string;
  description?: string;
  image?: string;
  lines: string[];
};

const AVAILABILITY_TEXT: Record<string, string> = { available: "Available", sold: "Sold" };

const oneLine = (value?: string) => value?.replace(/\s+/g, " ").trim() ?? "";
const link = (title: string, path: string) => `[${escapeLinkText(title)}](${absoluteUrl(path)})`;
const artworkLink = (artwork: { title: string; slug: string }) => link(artwork.title, `/artwork/${artwork.slug}`);
const coverUrl = (publicId?: string) => (publicId ? mediaImageUrl(publicId) : undefined);

// Joins the values that exist, so missing fields don't leave stray separators.
function details(parts: (string | null | undefined | false)[]): string {
  const values = parts.filter((part): part is string => Boolean(part));
  return values.length > 0 ? `: ${values.join(", ")}` : "";
}

function exhibitionPlace(exhibition: { venue: string; city?: string; country?: string }): string {
  return [exhibition.venue, exhibition.city, exhibition.country].filter(Boolean).join(", ");
}

// A titled list, or nothing when there are no items.
function section(title: string, items: string[]): string[] {
  return items.length > 0 ? [`## ${title}`, "", ...items, ""] : [];
}

function renderPage(page: Page): string {
  const head = frontMatter({
    title: page.title,
    description: page.description,
    canonical: absoluteUrl(page.path),
    image: page.image,
  });
  return `${head}# ${page.heading}\n\n${page.lines.join("\n")}\n`;
}

async function homePage(): Promise<Page> {
  const [settings, featured, copy] = await Promise.all([getHomeSettings(), getFeaturedArtworks(8), getSiteCopy()]);
  return {
    path: "/",
    title: copy.title,
    heading: "Swati Garg",
    description: copy.description,
    lines: [
      settings.heroHeading,
      "",
      ...section("Featured works", featured.map((artwork) => `- ${artworkLink(artwork)}`)),
      "## Explore",
      "",
      `- ${link("Portfolio", "/portfolio")}`,
      `- ${link("Series", "/series")}`,
      `- ${link("Exhibitions", "/exhibitions")}`,
      `- ${link("About", "/about")}`,
      `- ${link("Frequently asked questions", "/faq")}`,
      "",
    ],
  };
}

async function aboutPage(): Promise<Page> {
  const [about, exhibitions] = await Promise.all([getAbout(), getPublishedExhibitions()]);
  const entry = (item: { title: string; detail?: string; date?: string }) =>
    `- ${[item.title, item.detail, item.date].filter(Boolean).join(", ")}`;
  return {
    path: "/about",
    title: "About — Swati Garg",
    heading: "Swati Garg",
    description: aboutDescription({
      tagline: taglineOf(about),
      location: about?.location,
      exhibitionCount: exhibitions.length,
    }),
    lines: [
      taglineOf(about) + (about?.location ? `. Lives and works in ${about.location}.` : "."),
      "",
      ...(about?.bio ? [about.bio.trim(), ""] : []),
      ...(about?.statement ? [`> ${about.statement.trim()}`, ""] : []),
      ...section("Education", (about?.education ?? []).map(entry)),
      ...section(
        "Exhibitions",
        exhibitions.map(
          (item) =>
            `- ${link(item.title, `/exhibitions/${item.slug}`)}${details([
              exhibitionPlace(item),
              formatDateRange(item.startDate, item.endDate),
            ])}`
        )
      ),
      ...section("Awards", (about?.awards ?? []).map(entry)),
      ...section("Achievements", (about?.achievements ?? []).map(entry)),
      ...section("Public collections", (about?.publicCollections ?? []).map((name: string) => `- ${name}`)),
    ],
  };
}

async function faqPage(): Promise<Page> {
  const faqs = await getPublishedFaqs();
  return {
    path: "/faq",
    title: "Frequently asked questions — Swati Garg",
    heading: "Frequently asked questions",
    description: faqDescription({ questions: faqs.map((faq) => faq.question) }),
    lines: faqs.flatMap((item) => [`## ${item.question}`, "", item.answer.trim(), ""]),
  };
}

async function portfolioPage(): Promise<Page> {
  const [artworks, mediums] = await Promise.all([getPortfolioCatalogue(), getMediums()]);
  const mediumNames = new Map(mediums.map((medium) => [String(medium._id), medium.name]));
  return {
    path: "/portfolio",
    title: "Portfolio — Swati Garg",
    heading: "Portfolio",
    description: await getPortfolioDescription(),
    lines: [
      `${artworks.length} published works.`,
      "",
      ...artworks.map(
        (artwork) =>
          `- ${artworkLink(artwork)}${details([
            artwork.medium ? mediumNames.get(artwork.medium) : undefined,
            formatDimensions(artwork.dimensions),
          ])}`
      ),
      "",
    ],
  };
}

async function seriesIndexPage(): Promise<Page> {
  const series = await getPublishedSeries();
  return {
    path: "/series",
    title: "Series — Swati Garg",
    heading: "Series",
    description: seriesDescription({ titles: series.map((item) => item.title) }),
    lines: series.map((item) => `- ${link(item.title, `/portfolio/series/${item.slug}`)}${details([oneLine(item.description)])}`),
  };
}

async function seriesPage(slug: string): Promise<Page | null> {
  const series = await getSeriesBySlug(slug);
  if (!series) return null;
  const artworks = await getArtworksBySeriesId(series._id);
  return {
    path: `/portfolio/series/${slug}`,
    title: `${series.title} — Swati Garg`,
    heading: series.title,
    description: toMetaDescription(series.description) ?? `${series.title}, a series of paintings by Swati Garg.`,
    image: coverUrl(series.coverImage?.publicId),
    lines: [
      series.description?.trim() ?? "",
      "",
      ...section(
        "Works",
        artworks.map((artwork) => `- ${artworkLink(artwork)}${details([formatDimensions(artwork.dimensions)])}`)
      ),
    ],
  };
}

async function exhibitionsIndexPage(): Promise<Page> {
  const exhibitions = await getPublishedExhibitions();
  return {
    path: "/exhibitions",
    title: "Exhibitions — Swati Garg",
    heading: "Exhibitions",
    description: exhibitionsDescription({
      count: exhibitions.length,
      latest: exhibitions[0] ? { title: exhibitions[0].title, venue: exhibitions[0].venue } : undefined,
    }),
    lines: exhibitions.map(
      (item) =>
        `- ${link(item.title, `/exhibitions/${item.slug}`)}${details([
          exhibitionPlace(item),
          formatDateRange(item.startDate, item.endDate),
        ])}`
    ),
  };
}

async function exhibitionPage(slug: string): Promise<Page | null> {
  const exhibition = await getExhibitionBySlug(slug);
  if (!exhibition) return null;
  const place = exhibitionPlace(exhibition);
  const artworks = (exhibition.artworks ?? []) as { title: string; slug: string }[];
  return {
    path: `/exhibitions/${slug}`,
    title: `${exhibition.title} — Swati Garg`,
    heading: exhibition.title,
    description: toMetaDescription(exhibition.description) ?? `${exhibition.title} at ${place}.`,
    image: coverUrl(exhibition.images?.[0]?.publicId),
    lines: [
      `${exhibition.type === "solo" ? "Solo exhibition" : "Group exhibition"} at ${place}, ${formatDateRange(
        exhibition.startDate,
        exhibition.endDate
      )}.`,
      "",
      exhibition.description?.trim() ?? "",
      "",
      ...section("Works shown", artworks.map((artwork) => `- ${artworkLink(artwork)}`)),
    ],
  };
}

async function artworkPage(slug: string): Promise<Page | null> {
  const artwork = await getArtworkBySlug(slug);
  if (!artwork) return null;
  const exhibitions = await getExhibitionsForArtwork(artwork._id);
  const medium = artwork.medium?.name;
  const year = getYear(artwork.dateMade);
  const facts = [
    medium,
    year ? String(year) : undefined,
    formatDimensions(artwork.dimensions),
    artwork.availability ? AVAILABILITY_TEXT[artwork.availability] : undefined,
  ];
  const seriesLine = artwork.series
    ? `Part of the ${
        artwork.series.status === "published"
          ? link(artwork.series.title, `/portfolio/series/${artwork.series.slug}`)
          : artwork.series.title
      } series.`
    : "";
  return {
    path: `/artwork/${slug}`,
    title: `${artwork.title} — Swati Garg`,
    heading: artwork.title,
    description:
      toMetaDescription(artwork.description) ??
      `${artwork.title}${medium ? `, ${medium.toLowerCase()}` : ""} by Swati Garg.`,
    image: coverUrl(artwork.images?.[0]?.publicId),
    lines: [
      facts.filter(Boolean).join(", "),
      "",
      artwork.description?.trim() ?? "",
      "",
      ...(seriesLine ? [seriesLine, ""] : []),
      ...section(
        "Exhibitions",
        exhibitions.map((item) => `- ${link(item.title, `/exhibitions/${item.slug}`)}`)
      ),
    ],
  };
}

type Route = { pattern: RegExp; render: (match: RegExpMatchArray) => Promise<Page | null> };

const ROUTES: Route[] = [
  { pattern: /^\/$/, render: () => homePage() },
  { pattern: /^\/about$/, render: () => aboutPage() },
  { pattern: /^\/faq$/, render: () => faqPage() },
  { pattern: /^\/portfolio$/, render: () => portfolioPage() },
  { pattern: /^\/series$/, render: () => seriesIndexPage() },
  { pattern: /^\/portfolio\/series\/([a-z0-9-]+)$/, render: (match) => seriesPage(match[1] ?? "") },
  { pattern: /^\/exhibitions$/, render: () => exhibitionsIndexPage() },
  { pattern: /^\/exhibitions\/([a-z0-9-]+)$/, render: (match) => exhibitionPage(match[1] ?? "") },
  { pattern: /^\/artwork\/([a-z0-9-]+)$/, render: (match) => artworkPage(match[1] ?? "") },
];

// Returns null for paths without a markdown version, including unknown slugs.
export async function renderMarkdownPage(pathname: string): Promise<string | null> {
  for (const route of ROUTES) {
    const match = pathname.match(route.pattern);
    if (!match) continue;
    const page = await route.render(match);
    return page ? renderPage(page) : null;
  }
  return null;
}
