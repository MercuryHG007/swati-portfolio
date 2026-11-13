export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ?? "";

// Crawlers and headless browsers run JavaScript, so built-in bot filtering misses many of them.
const AUTOMATED_USER_AGENT = /bot\/|bot;|bot\)|crawl|spider|slurp|lighthouse|pagespeed|headless|phantomjs|puppeteer|playwright|selenium|webdriver|gtmetrix|facebookexternalhit/i;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function canTrackAnalytics(): boolean {
  if (typeof window === "undefined" || !GA_MEASUREMENT_ID) return false;
  if (navigator.webdriver || AUTOMATED_USER_AGENT.test(navigator.userAgent)) return false;
  return true;
}

export function trackEvent(name: string, parameters: Record<string, unknown> = {}): void {
  if (!canTrackAnalytics() || typeof window.gtag !== "function") return;
  window.gtag("event", name, parameters);
}

export function trackPageView(pagePath: string): void {
  trackEvent("page_view", {
    page_path: pagePath,
    page_location: window.location.href,
    page_title: document.title,
  });
}
