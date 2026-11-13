"use client";

import { useSyncExternalStore } from "react";
import { Button } from "@/components/button/button";
import { TextLink } from "@/components/text-link/text-link";
import { canTrackAnalytics } from "@/lib/analytics";
import { captureAttribution } from "@/lib/attribution";
import { clearConsent, readConsent, subscribeConsent, writeConsent } from "@/lib/consent";

const noopSubscribe = () => () => {};
const noConsent = () => null;

// Shown only where GA4 would run. Rejecting keeps analytics off and stops attribution capture.
export function CookieConsent() {
  const trackable = useSyncExternalStore(noopSubscribe, canTrackAnalytics, () => false);
  const choice = useSyncExternalStore(subscribeConsent, readConsent, noConsent);

  if (!trackable || choice !== null) return null;

  return (
    <div
      role="region"
      aria-label="Cookie choices"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface px-6 py-4 text-sm text-foreground shadow-lg"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted">
          This website uses cookies. You can accept or reject them.{" "}
          <TextLink href="/privacy" variant="primary" className="text-accent">
            Privacy
          </TextLink>
        </p>
        <div className="flex shrink-0 gap-2">
          <Button type="button" variant="inverse" size="sm" onClick={() => writeConsent("denied")}>
            Reject
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              writeConsent("granted");
              captureAttribution();
            }}
          >
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}

// Lets visitors change their choice later. Reopens the banner.
export function CookieSettingsButton() {
  return (
    <Button type="button" variant="inverse" size="sm" onClick={clearConsent}>
      Cookie settings
    </Button>
  );
}
