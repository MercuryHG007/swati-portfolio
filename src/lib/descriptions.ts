import { toMetaDescription } from "@/lib/meta-description";

// Joins names as an English list: "A, B and C".
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function plural(word: string, count: number): string {
  return count === 1 ? word : `${word}s`;
}

// Drops the sentences that have no data, then trims to a search snippet.
function compose(sentences: Array<string | false | undefined>): string {
  return toMetaDescription(sentences.filter(Boolean).join(" ")) ?? "";
}

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
  return compose([
    tagline ? `Swati Garg, ${tagline}.` : "Swati Garg.",
    mediums.length > 0 && `Works in ${joinNames(mediums)}.`,
    location && `Based in ${location}.`,
  ]);
}

export function aboutDescription({
  tagline,
  location,
  exhibitionCount,
}: {
  tagline: string;
  location?: string;
  exhibitionCount: number;
}): string {
  return compose([
    `About Swati Garg, ${tagline}.`,
    location && `Based in ${location}.`,
    exhibitionCount > 0
      ? `Education, awards and ${exhibitionCount} ${plural("exhibition", exhibitionCount)}.`
      : "Education and awards.",
  ]);
}

export function contactDescription({ tagline, location }: { tagline: string; location?: string }): string {
  return compose([
    `Contact Swati Garg, ${tagline}.`,
    location && `Based in ${location}.`,
    "Enquire about commissions and works.",
  ]);
}

export function faqDescription({ questions }: { questions: string[] }): string {
  return compose([
    "Common questions about Swati Garg and her paintings.",
    ...questions.slice(0, 2),
  ]);
}

export function portfolioDescription({ mediums, subjects }: { mediums: string[]; subjects: string[] }): string {
  return compose([
    mediums.length > 0 ? `Browse paintings by Swati Garg in ${joinNames(mediums)}.` : "Browse paintings by Swati Garg.",
    subjects.length > 0 && `Subjects include ${joinNames(subjects.slice(0, 4))}.`,
    "Filter by medium and subject.",
  ]);
}

export function seriesDescription({ titles }: { titles: string[] }): string {
  if (titles.length === 0) return "Painting series by Swati Garg.";
  return compose([`${titles.length} painting series by Swati Garg, including ${joinNames(titles.slice(0, 3))}.`]);
}

// Exhibitions are sorted newest-first, so the first entry is the one named in the description.
export function exhibitionsDescription({
  count,
  latest,
}: {
  count: number;
  latest?: { title: string; venue?: string };
}): string {
  if (count === 0) return "Solo and group exhibitions by Swati Garg.";
  const including = latest ? `, including ${latest.title}${latest.venue ? ` at ${latest.venue}` : ""}` : "";
  return compose([`${count} solo and group ${plural("exhibition", count)} by Swati Garg${including}.`]);
}
