import { clearAttribution } from "@/lib/attribution";

export const CONSENT_STORAGE_KEY = "swati:analytics-consent";
const CONSENT_CHANGE_EVENT = "swati:analytics-consent-change";

export type ConsentChoice = "granted" | "denied";

export function readConsent(): ConsentChoice | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

// Updates Google Consent Mode, so GA4 only sets cookies after the visitor accepts.
export function writeConsent(choice: ConsentChoice): void {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, choice);
  } catch {
    // Storage is unavailable in some private browsing modes; the choice then lasts for this page only.
  }
  if (choice === "denied") clearAttribution();
  window.gtag?.("consent", "update", { analytics_storage: choice });
  window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT));
}

// Removes the stored choice so the banner appears again.
export function clearConsent(): void {
  try {
    window.localStorage.removeItem(CONSENT_STORAGE_KEY);
  } catch {
    // Nothing to clear if storage is unavailable.
  }
  window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT));
}

export function subscribeConsent(onChange: () => void): () => void {
  window.addEventListener(CONSENT_CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CONSENT_CHANGE_EVENT, onChange);
}
