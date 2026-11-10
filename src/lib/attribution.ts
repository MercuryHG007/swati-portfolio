import { LEAD_SOURCE_FIELDS, type LeadAttribution } from "@/lib/lead-source";

const STORAGE_KEY = "swati:attribution";
const LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

interface StoredAttribution extends LeadAttribution {
  capturedAt: number;
}

const UTM_PARAMS = {
  utm_source: "utmSource",
  utm_medium: "utmMedium",
  utm_campaign: "utmCampaign",
  utm_term: "utmTerm",
  utm_content: "utmContent",
} as const;

function readStored(now: number): StoredAttribution | null {
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null") as StoredAttribution | null;
    if (!stored || typeof stored.capturedAt !== "number" || now - stored.capturedAt > LIFETIME_MS) return null;
    return stored;
  } catch {
    return null;
  }
}

// First touch wins: the first visit that arrives with a campaign or external referrer is kept for 30 days.
export function captureAttribution(now = Date.now()): void {
  if (typeof window === "undefined" || readStored(now)) return;

  const params = new URLSearchParams(window.location.search);
  const attribution: LeadAttribution = {};
  for (const [param, field] of Object.entries(UTM_PARAMS)) {
    const value = params.get(param)?.trim();
    if (value) attribution[field] = value.slice(0, 300);
  }

  const referrer = document.referrer ? new URL(document.referrer) : null;
  if (referrer && referrer.origin !== window.location.origin) {
    attribution.referrer = `${referrer.hostname}${referrer.pathname}`.slice(0, 300);
  }

  if (!Object.keys(attribution).length) return;
  attribution.landingPage = `${window.location.pathname}${window.location.search}`.slice(0, 300);
  try {
    const stored: StoredAttribution = { ...attribution, capturedAt: now };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Storage is unavailable in some private browsing modes; attribution is optional.
  }
}

export function readAttribution(now = Date.now()): LeadAttribution | null {
  if (typeof window === "undefined") return null;
  const stored = readStored(now);
  if (!stored) return null;
  const attribution: LeadAttribution = {};
  for (const field of LEAD_SOURCE_FIELDS) {
    const value = stored[field];
    if (value) attribution[field] = value;
  }
  return Object.keys(attribution).length ? attribution : null;
}
