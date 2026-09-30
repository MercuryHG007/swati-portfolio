import type { ReactNode } from "react";

export const inputClass = "rounded-md border border-border bg-surface px-3 py-2 text-foreground";
export const buttonClass = "rounded-md bg-accent px-4 py-2 text-accent-foreground";
export const secondaryButtonClass = "rounded-md border border-border px-4 py-2 text-foreground";
export const dangerButtonClass = "rounded-md border border-red-300 px-4 py-2 text-red-600";
export const cardClass = "rounded-md border border-border bg-surface p-4";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-foreground">
      {label}
      {children}
    </label>
  );
}
