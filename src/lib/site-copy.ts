import {
  getAbout,
  getMediumsWithWork,
  getPublishedExhibitions,
  getPublishedFaqs,
  getPublishedSeries,
  getSubjectsWithWork,
} from "@/lib/queries";
import {
  aboutDescription,
  contactDescription,
  exhibitionsDescription,
  faqDescription,
  portfolioDescription,
  seriesDescription,
  siteDescription,
} from "@/lib/descriptions";
import { ABOUT_TAGLINE_DEFAULT } from "@/models/About";

// Existing About documents predate the tagline field, so a missing or blank value falls back to the default.
export function taglineOf(about: { tagline?: string | null } | null | undefined): string {
  return about?.tagline?.trim() || ABOUT_TAGLINE_DEFAULT;
}

export async function getSiteCopy() {
  const [about, mediums] = await Promise.all([getAbout(), getMediumsWithWork()]);
  const tagline = taglineOf(about);
  return {
    title: `Swati Garg — ${tagline}`,
    description: siteDescription({
      tagline,
      location: about?.location,
      mediums: mediums.map((medium) => medium.name),
    }),
  };
}

export async function getAboutDescription() {
  const [about, exhibitions] = await Promise.all([getAbout(), getPublishedExhibitions()]);
  return aboutDescription({ tagline: taglineOf(about), location: about?.location, exhibitionCount: exhibitions.length });
}

export async function getContactDescription() {
  const about = await getAbout();
  return contactDescription({ tagline: taglineOf(about), location: about?.location });
}

export async function getFaqDescription() {
  const faqs = await getPublishedFaqs();
  return faqDescription({ questions: faqs.map((faq) => faq.question) });
}

export async function getPortfolioDescription() {
  const [mediums, subjects] = await Promise.all([getMediumsWithWork(), getSubjectsWithWork()]);
  return portfolioDescription({
    mediums: mediums.map((medium) => medium.name),
    subjects: subjects.map((subject) => subject.name),
  });
}

export async function getSeriesDescription() {
  const series = await getPublishedSeries();
  return seriesDescription({ titles: series.map((item) => item.title) });
}

export async function getExhibitionsDescription() {
  const exhibitions = await getPublishedExhibitions();
  const [latest] = exhibitions;
  return exhibitionsDescription({
    count: exhibitions.length,
    latest: latest ? { title: latest.title, venue: latest.venue } : undefined,
  });
}
