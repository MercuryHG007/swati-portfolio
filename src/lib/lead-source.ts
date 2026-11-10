// Shared by the browser (capturing first-touch attribution) and the server (validating what
// the contact form submits). Keep this module free of imports so it runs in both places.

export const LEAD_SOURCE_FIELDS = [
  "utmSource",
  "utmMedium",
  "utmCampaign",
  "utmTerm",
  "utmContent",
  "referrer",
  "landingPage",
] as const;

export type LeadAttribution = Partial<Record<(typeof LEAD_SOURCE_FIELDS)[number], string>>;

export interface LeadSource extends LeadAttribution {
  artworkSlug?: string;
}

const MAX_VALUE_LENGTH = 300;
const ARTWORK_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function parseArtworkSlug(raw: unknown): string {
  const slug = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  return slug.length <= 200 && ARTWORK_SLUG_PATTERN.test(slug) ? slug : "";
}

export function parseAttribution(raw: unknown): LeadAttribution | undefined {
  if (typeof raw !== "string" || !raw) return undefined;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;

  const record = value as Record<string, unknown>;
  const result: LeadAttribution = {};
  for (const key of LEAD_SOURCE_FIELDS) {
    const field = record[key];
    if (typeof field === "string" && field.trim()) result[key] = field.trim().slice(0, MAX_VALUE_LENGTH);
  }
  return Object.keys(result).length ? result : undefined;
}

// One readable line per source, e.g. "Artwork: sunrise-study · utm: instagram / story / spring".
export function describeLeadSource(source: LeadSource): string {
  const parts: string[] = [];
  if (source.artworkSlug) parts.push(`Artwork: ${source.artworkSlug}`);
  const campaign = [source.utmSource, source.utmMedium, source.utmCampaign].filter(Boolean).join(" / ");
  if (campaign) parts.push(`Campaign: ${campaign}`);
  if (source.referrer) parts.push(`Referrer: ${source.referrer}`);
  return parts.join(" · ");
}
