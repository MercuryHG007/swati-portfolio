"use client";

import { useSyncExternalStore } from "react";
import { readAttribution } from "@/lib/attribution";

const noopSubscribe = () => () => {};

// Sends the first-touch campaign data with the contact form. It is empty during server rendering and until hydration.
export function ContactAttributionField() {
  const value = useSyncExternalStore(
    noopSubscribe,
    () => {
      const attribution = readAttribution();
      return attribution ? JSON.stringify(attribution) : "";
    },
    () => "",
  );

  return <input type="hidden" name="attribution" value={value} readOnly />;
}

