import type { ReactNode } from "react";

// Building blocks for the route loading states. Each block mirrors the size of the real element it
// stands in for, using the same responsive classes, so the page doesn't shift when content arrives.

const PULSE = "animate-pulse motion-reduce:animate-none";

// Image areas use the surface tone, like the real placeholders. Text, buttons and pills use the
// slightly darker border tone so they stay visible on the white page.
const TONE = { surface: "bg-surface", border: "bg-border" } as const;

export function Bone({ className = "", tone = "surface" }: { className?: string; tone?: keyof typeof TONE }) {
  return <div aria-hidden="true" className={`${TONE[tone]} ${PULSE} ${className}`} />;
}

// One line of text. The box has the real line height (pass it as `h`) and the bar is shorter, so
// stacked lines read as a paragraph.
export function Line({ h = "h-6", width = "w-full", className = "" }: { h?: string; width?: string; className?: string }) {
  return (
    <div aria-hidden="true" className={`flex items-center ${h} ${width} ${className}`}>
      <div className={`h-3/5 w-full bg-border ${PULSE}`} />
    </div>
  );
}

// Button heights come from Button's padding and line height: md and sm are 38px, lg is 50px.
export function ButtonBone({ large = false, width = "w-40" }: { large?: boolean; width?: string }) {
  return <Bone tone="border" className={`rounded-full ${large ? "h-[50px]" : "h-[38px]"} ${width}`} />;
}

export function SkeletonPage({
  label,
  className,
  children,
}: {
  label: string;
  className: string;
  children: ReactNode;
}) {
  return (
    <main aria-busy="true" className={className}>
      <p role="status" className="sr-only">
        {label}
      </p>
      {children}
    </main>
  );
}

export function BreadcrumbBone() {
  return <Line h="h-4" width="w-44" />;
}

// Matches ArtworkCard: a 4/5 image, a title line, then a year line.
export function ArtworkCardBone({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <Bone className="aspect-[4/5] rounded-md" />
      <Line h="h-5" width="w-3/4" className="mt-2" />
      <Line h="h-4" width="w-1/4" />
    </div>
  );
}

export function PrevNextBone() {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-border pt-6">
      <div className="flex flex-col gap-1">
        <Line h="h-5" width="w-16" />
        <Line h="h-5" width="w-28 sm:w-44" />
      </div>
      <div className="flex flex-col items-end gap-1">
        <Line h="h-5" width="w-12" />
        <Line h="h-5" width="w-28 sm:w-44" />
      </div>
    </div>
  );
}
