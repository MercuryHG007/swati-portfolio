import { getLlmsContent, getPublishedFaqs } from "@/lib/queries";
import { absoluteUrl, isIndexableDeployment } from "@/lib/seo";
import { formatDimensions, getYear } from "@/lib/format";

// Rendered per request so new works and exhibitions appear without a redeploy.
export const dynamic = "force-dynamic";

const oneLine = (value: string) => value.replace(/\s+/g, " ").trim();
const isoDay = (date: Date) => date.toISOString().slice(0, 10);
const AVAILABILITY_TEXT: Record<string, string> = { available: "Available", sold: "Sold" };
const joinList = (items: string[]) =>
  items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

export async function GET() {
  // Matches the sitemap: preview and UAT deployments publish nothing.
  if (!isIndexableDeployment()) return new Response("Not found", { status: 404 });

  const [{ series, exhibitions, artworks, statement }, faqs] = await Promise.all([
    getLlmsContent(),
    getPublishedFaqs(),
  ]);

  // Built from published works so the summary never names a medium the portfolio doesn't show.
  const mediumNames = [
    ...new Set(artworks.map((item) => item.medium?.name).filter((name): name is string => Boolean(name))),
  ].map((name) => name.toLowerCase());
  const mediumSentence = mediumNames.length > 0 ? ` The portfolio presents ${joinList(mediumNames)} works.` : "";

  const artworkLines = artworks.map((item) => {
    const details = [
      item.medium?.name,
      getYear(item.dateMade),
      formatDimensions(item.dimensions),
      item.availability ? AVAILABILITY_TEXT[item.availability] : undefined,
    ].filter(Boolean);
    const suffix = details.length > 0 ? `: ${details.join(", ")}.` : "";
    return `- [${item.title}](${absoluteUrl(`/artwork/${item.slug}`)})${suffix}`;
  });

  const seriesLines = series.map((item) => {
    const description = item.description ? `: ${oneLine(item.description)}` : "";
    return `- [${item.title}](${absoluteUrl(`/portfolio/series/${item.slug}`)})${description}`;
  });

  const exhibitionLines = exhibitions.map((item) => {
    const place = [item.venue, item.city, item.country].filter(Boolean).join(", ");
    const dates = `${isoDay(item.startDate)}${item.endDate ? ` to ${isoDay(item.endDate)}` : ""}`;
    const kind = item.type === "solo" ? "Solo exhibition" : "Group exhibition";
    return `- [${item.title}](${absoluteUrl(`/exhibitions/${item.slug}`)}): ${kind} at ${place}, ${dates}.`;
  });

  const lines = [
    "# Swati Garg",
    "",
    `> Swati Garg is an artist.${mediumSentence}`,
    "",
    "## About the artist",
    "",
    statement.trim() || "Read the artist's biography and education on the About page.",
    "",
    `- [About](${absoluteUrl("/about")}): biography, education and exhibition history.`,
    "",
    "## Pages",
    "",
    `- [Home](${absoluteUrl("/")}): featured works.`,
    `- [Portfolio](${absoluteUrl("/portfolio")}): every published work, with filters by medium and subject.`,
    `- [Series](${absoluteUrl("/series")}): works grouped by series.`,
    `- [Exhibitions](${absoluteUrl("/exhibitions")}): solo and group exhibitions.`,
    `- [Contact](${absoluteUrl("/contact")}): enquiries about works.`,
    `- [FAQ](${absoluteUrl("/faq")}): common questions about the artist and works.`,
    `- [API](${absoluteUrl("/api-docs")}): read-only JSON access to published works, described by OpenAPI at ${absoluteUrl("/openapi.json")}.`,
    "",
    "## Works",
    "",
    "Each work has its own page. Works marked sold remain listed.",
    "Contact the artist to enquire about a work.",
    "",
    ...(artworkLines.length > 0 ? artworkLines : ["No works are published yet."]),
    "",
    "## Series",
    "",
    ...(seriesLines.length > 0 ? seriesLines : ["No series are published yet."]),
    "",
    "## Exhibitions",
    "",
    ...(exhibitionLines.length > 0 ? exhibitionLines : ["No exhibitions are published yet."]),
    "",
    "## Frequently asked questions",
    "",
    ...faqs.flatMap((item) => [`### ${oneLine(item.question)}`, "", item.answer.trim(), ""]),
    ...(faqs.length === 0 ? ["No questions are published yet.", ""] : []),
  ];

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
