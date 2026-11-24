import { getLlmsContent, getPublishedFaqs } from "@/lib/queries";
import { absoluteUrl, isIndexableDeployment } from "@/lib/seo";
import { formatDimensions, getYear } from "@/lib/format";
import { toMetaDescription } from "@/lib/meta-description";

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

  // Spec format: one list item per work, with the facts and the artist's own description on the same line.
  const workLines = artworks.map((item) => {
    const details = [
      item.medium?.name,
      getYear(item.dateMade),
      formatDimensions(item.dimensions),
      item.availability ? AVAILABILITY_TEXT[item.availability] : undefined,
    ].filter(Boolean);
    const facts = details.length > 0 ? `${details.join(", ")}.` : "";
    const description = toMetaDescription(item.description, 200);
    const notes = [facts, description].filter(Boolean).join(" ");
    return `- [${item.title}](${absoluteUrl(`/artwork/${item.slug}`)})${notes ? `: ${notes}` : ""}`;
  });

  // Each series lists its paintings in the same order as the series page.
  const seriesLines = series.map((item) => {
    const paintings = artworks
      .filter((artwork) => artwork.series && String(artwork.series) === String(item._id))
      .sort((a, b) => (a.seriesOrder ?? 0) - (b.seriesOrder ?? 0))
      .map((artwork) => `[${artwork.title}](${absoluteUrl(`/artwork/${artwork.slug}`)})`);
    const description = toMetaDescription(item.description, 200);
    const paintingsNote = paintings.length > 0 ? `Paintings: ${paintings.join(", ")}.` : "";
    const notes = [description, paintingsNote].filter(Boolean).join(" ");
    return `- [${item.title}](${absoluteUrl(`/portfolio/series/${item.slug}`)})${notes ? `: ${notes}` : ""}`;
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
    `## Works (${artworks.length})`,
    "",
    "Each work has its own page. Works marked sold remain listed.",
    "Contact the artist to enquire about a work.",
    "",
    ...(workLines.length > 0 ? workLines : ["No works are published yet."]),
    "",
    `## Series (${series.length})`,
    "",
    ...(seriesLines.length > 0 ? seriesLines : ["No series are published yet."]),
    "",
    "## Frequently asked questions",
    "",
    ...faqs.flatMap((item) => [`### ${oneLine(item.question)}`, "", item.answer.trim(), ""]),
    ...(faqs.length === 0 ? ["No questions are published yet.", ""] : []),
    "## Optional",
    "",
    `Exhibitions: ${exhibitions.length}, most recent first.`,
    "",
    ...(exhibitionLines.length > 0 ? exhibitionLines : ["No exhibitions are published yet."]),
  ];

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
