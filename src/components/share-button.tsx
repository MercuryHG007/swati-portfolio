"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

// Opens the native share sheet where available; otherwise copies the page link and confirms briefly.
export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // Dismissing the share sheet rejects the promise; there is nothing to report.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied; the button simply stays in its idle state.
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      aria-label={copied ? "Link copied" : "Share this work"}
      title={copied ? "Link copied" : "Share this work"}
      className="flex h-[38px] w-[38px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-foreground text-foreground hover:bg-foreground hover:text-background"
    >
      {copied ? <Check size={16} aria-hidden /> : <Share2 size={16} aria-hidden />}
    </button>
  );
}
