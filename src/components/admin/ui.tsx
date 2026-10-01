import type { ReactNode, SelectHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronDown } from "lucide-react";

export const inputClass = "rounded-md border border-border bg-surface px-3 py-2 text-foreground";
export const buttonClass = "rounded-md bg-accent px-4 py-2 text-accent-foreground";
export const secondaryButtonClass = "rounded-md border border-border px-4 py-2 text-foreground";
export const dangerButtonClass = "rounded-md border border-red-300 px-4 py-2 text-red-600";
export const cardClass = "rounded-md border border-border bg-surface p-4";

type IconVariant = "default" | "primary" | "danger";

const iconVariantClass: Record<IconVariant, string> = {
  default: "border border-border text-foreground hover:border-accent hover:text-accent",
  primary: "bg-accent text-accent-foreground",
  danger: "border border-red-300 text-red-600 hover:bg-red-50",
};

export function ActionIcon({ icon: IconComp, variant = "default" }: { icon: LucideIcon; variant?: IconVariant }) {
  return (
    <span className={`inline-flex items-center justify-center rounded-md p-2 ${iconVariantClass[variant]}`}>
      <IconComp className="h-4 w-4" />
    </span>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-foreground">
      {label}
      {children}
    </label>
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        className="w-full appearance-none rounded-md border border-border bg-surface px-3 py-2 pr-9 text-foreground"
      />
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
      />
    </div>
  );
}

