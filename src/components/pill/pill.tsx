import Link from "next/link";
import type { ReactNode } from "react";

// Small outline chip for browsing and filtering. Separate from Button, which is for calls to action.
export function Pill({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-full border border-border px-3 py-1 text-xs text-foreground hover:border-accent hover:text-accent"
    >
      {children}
    </Link>
  );
}
