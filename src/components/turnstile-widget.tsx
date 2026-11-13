"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

type TurnstileApi = {
  render: (container: HTMLElement, options: { sitekey: string }) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

// Explicit rendering, so the widget can be created again after a failed submit. Implicit rendering only
// runs when the script first loads, which is why the widget used to disappear after an error redirect.
// Turnstile adds its own cf-turnstile-response field inside the form, so the server receives the token.
export function TurnstileWidget({ siteKey }: { siteKey: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let widgetId: string | undefined;
    let timer: ReturnType<typeof setInterval> | undefined;

    const renderWidget = () => {
      if (!containerRef.current || !window.turnstile) return false;
      widgetId = window.turnstile.render(containerRef.current, { sitekey: siteKey });
      return true;
    };

    // The script may already be loaded from an earlier page view, so render now or wait for it.
    if (!renderWidget()) {
      timer = setInterval(() => {
        if (renderWidget()) clearInterval(timer);
      }, 100);
    }

    return () => {
      clearInterval(timer);
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [siteKey]);

  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" />
      <div ref={containerRef} />
    </>
  );
}
