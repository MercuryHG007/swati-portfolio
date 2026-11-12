import { getLlmsContent } from "@/lib/queries";
import { absoluteUrl, isIndexableDeployment } from "@/lib/seo";

export const revalidate = 60;

const oneLine = (value: string) => value.replace(/\s+/g, " ").trim();
const isoDay = (date: Date) => date.toISOString().slice(0, 10);

export async function GET() {
  // Matches the sitemap: preview and UAT deployments publish nothing.
  if (!isIndexableDeployment()) return new Response("Not found", { status: 404 });

  const { series, exhibitions, statement } = await getLlmsContent();

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
    "> Swati Garg is a watercolor artist. The portfolio presents watercolor, acrylic, pencil and oil works.",
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
    "",
    "## Works and availability",
    "",
    "Each work has its own page with its title, medium, dimensions and availability. Works marked sold remain listed.",
    "Contact the artist to enquire about a work.",
    "",
    "## Series",
    "",
    ...(seriesLines.length > 0 ? seriesLines : ["No series are published yet."]),
    "",
    "## Exhibitions",
    "",
    ...(exhibitionLines.length > 0 ? exhibitionLines : ["No exhibitions are published yet."]),
    "",
  ];

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
