import { getAbout, getMediumsWithWork } from "@/lib/queries";
import { siteDescription } from "@/lib/seo";
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
