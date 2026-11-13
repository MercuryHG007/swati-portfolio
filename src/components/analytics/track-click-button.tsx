"use client";

import { useRef, type ReactNode } from "react";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/button/button";
import { trackEvent } from "@/lib/analytics";

// External links skip the click lock, so a repeated tap within this window counts once.
const DUPLICATE_WINDOW_MS = 2_000;

export function TrackClickButton({
  href,
  event,
  params,
  variant,
  size,
  children,
}: {
  href: string;
  event: string;
  params?: Record<string, unknown>;
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}) {
  const lastTrackedAt = useRef(0);

  return (
    <Button
      href={href}
      variant={variant}
      size={size}
      onClick={() => {
        const now = Date.now();
        if (now - lastTrackedAt.current < DUPLICATE_WINDOW_MS) return;
        lastTrackedAt.current = now;
        trackEvent(event, params);
      }}
    >
      {children}
    </Button>
  );
}
