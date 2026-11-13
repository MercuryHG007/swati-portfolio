"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics";

// Fires once per distinct event and payload, so React Strict Mode's double effect doesn't count twice.
export function TrackOnMount({ event, params }: { event: string; params?: Record<string, unknown> }) {
  const payload = JSON.stringify(params ?? {});
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    const key = `${event}:${payload}`;
    if (lastSent.current === key) return;
    lastSent.current = key;
    trackEvent(event, JSON.parse(payload) as Record<string, unknown>);
  }, [event, payload]);

  return null;
}
