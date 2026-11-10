"use client";

import type { ReactNode } from "react";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/button/button";
import { trackEvent } from "@/lib/analytics";

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
  return (
    <Button href={href} variant={variant} size={size} onClick={() => trackEvent(event, params)}>
      {children}
    </Button>
  );
}
