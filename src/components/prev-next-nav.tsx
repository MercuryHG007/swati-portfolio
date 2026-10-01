import Link from "next/link";

type PrevNextItem = { href: string; label: string } | null;

export function PrevNextNav({ prev, next }: { prev: PrevNextItem; next: PrevNextItem }) {
  if (!prev && !next) return null;

  return (
    <nav aria-label="Pagination" className="flex items-start justify-between gap-4 border-t border-border pt-6 text-sm">
      {prev ? (
        <Link href={prev.href} className="flex flex-col gap-1 text-muted hover:text-accent">
          <span aria-hidden="true">← Previous</span>
          <span className="text-foreground">{prev.label}</span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link href={next.href} className="flex flex-col items-end gap-1 text-right text-muted hover:text-accent">
          <span aria-hidden="true">Next →</span>
          <span className="text-foreground">{next.label}</span>
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
