"use client";

import Script from "next/script";
import { Suspense, useEffect, useRef, useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { captureAttribution } from "@/lib/attribution";
import { GA_MEASUREMENT_ID, canTrackAnalytics, trackPageView } from "@/lib/analytics";

// The first page view comes from gtag's config call; this sends the page views after client navigation.
function RouteTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    const path = query ? `${pathname}?${query}` : pathname;
    if (lastPath.current === null) {
      lastPath.current = path;
      return;
    }
    if (lastPath.current === path) return;
    lastPath.current = path;
    trackPageView(path);
  }, [pathname, query]);

  return null;
}

const noopSubscribe = () => () => {};

export function SiteAnalytics() {
  const enabled = useSyncExternalStore(noopSubscribe, canTrackAnalytics, () => false);

  useEffect(() => {
    captureAttribution();
  }, []);

  if (!enabled) return null;

  return (
    <>
      <Script id="google-analytics-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
gtag('config', ${JSON.stringify(GA_MEASUREMENT_ID)}, { allow_google_signals: false, allow_ad_personalization_signals: false });`}
      </Script>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`}
        strategy="afterInteractive"
      />
      <Suspense fallback={null}>
        <RouteTracker />
      </Suspense>
    </>
  );
}
