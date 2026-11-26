export type AboutCompletenessInput = {
  photo?: { publicId?: string } | null;
  bio?: string | null;
  statement?: string | null;
  location?: string | null;
  footerLogo?: { publicId?: string } | null;
  resumeUrl?: string | null;
  contactEmail?: string | null;
  socials?: { instagram?: string | null } | null;
} | null;

export const ABOUT_COMPLETENESS_FIELDS = [
  { key: "photo", label: "Photo" },
  { key: "bio", label: "Bio" },
  { key: "statement", label: "Artist statement" },
  { key: "location", label: "Location" },
  { key: "footerLogo", label: "Footer logo" },
  { key: "resumeUrl", label: "CV download URL" },
  { key: "contactEmail", label: "Contact email" },
  { key: "instagram", label: "Instagram" },
] as const;

// Returns the labels of About fields that are still empty, in the order the About form shows them.
export function missingAboutFields(about: AboutCompletenessInput): string[] {
  const filled: Record<(typeof ABOUT_COMPLETENESS_FIELDS)[number]["key"], boolean> = {
    photo: Boolean(about?.photo?.publicId),
    bio: Boolean(about?.bio?.trim()),
    statement: Boolean(about?.statement?.trim()),
    location: Boolean(about?.location?.trim()),
    footerLogo: Boolean(about?.footerLogo?.publicId),
    resumeUrl: Boolean(about?.resumeUrl?.trim()),
    contactEmail: Boolean(about?.contactEmail?.trim()),
    instagram: Boolean(about?.socials?.instagram?.trim()),
  };
  return ABOUT_COMPLETENESS_FIELDS.filter((field) => !filled[field.key]).map((field) => field.label);
}
