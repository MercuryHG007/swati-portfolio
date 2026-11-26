import type { ReactNode, SelectHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronDown } from "lucide-react";
import { buttonClasses } from "@/components/button/button";

export const inputClass = "rounded-md border border-border bg-surface px-3 py-2 text-foreground";
export const buttonClass = buttonClasses({ variant: "primary", size: "md" });
export const secondaryButtonClass = buttonClasses({ variant: "inverse", size: "md" });
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

// Renders as a block span so it can sit inside a <label> (where <p> is not valid).
export function FieldHint({ children }: { children: ReactNode }) {
  return <span className="block text-xs text-muted">{children}</span>;
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-foreground">
      {label}
      {hint ? <FieldHint>{hint}</FieldHint> : null}
      {children}
    </label>
  );
}

// Use for a group of controls, such as checkboxes or an uploader. A <label> must not wrap several
// controls: clicking its text would activate the first one.
export function FieldSet({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-1 text-sm text-foreground">
      <legend className="mb-1">{label}</legend>
      {hint ? <FieldHint>{hint}</FieldHint> : null}
      {children}
    </fieldset>
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

