"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

// Copies the text and confirms briefly. If clipboard access is denied, the button stays in its idle state.
export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied; there is nothing else to do.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Copied" : label}
      title={copied ? "Copied" : label}
      className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-foreground px-3 py-1 text-sm text-foreground hover:bg-foreground hover:text-background"
    >
      {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
      <span>{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}
