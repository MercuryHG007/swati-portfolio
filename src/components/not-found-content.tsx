import { Button } from "@/components/button/button";
import { TextLink } from "@/components/text-link/text-link";

// Shared by the public 404 page and the app-wide fallback for unmatched URLs.
export function NotFoundContent() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center gap-6 px-6 py-16 md:py-24">
      <p aria-hidden="true" className="font-serif text-[7rem] leading-none tracking-tight text-foreground sm:text-[10rem] md:text-[12rem]">
        404
      </p>
      <span className="inline-flex w-fit items-center rounded-full border border-red-600 px-3 py-1 font-sans text-xs uppercase tracking-widest text-red-600">
        Error 404
      </span>
      <h1 className="max-w-3xl text-4xl font-medium leading-tight tracking-tight text-foreground md:text-6xl">
        This page isn&apos;t here!
      </h1>
      <p className="max-w-xl text-lg text-muted">
        The link may be out of date or mistyped, or the work may have moved. You can browse the portfolio, or get in
        touch about a specific piece.
      </p>
      <div className="flex flex-wrap gap-4">
        <Button href="/portfolio" size="lg">
          View the portfolio
        </Button>
        <Button href="/contact" size="lg" variant="inverse">
          Get in touch
        </Button>
      </div>
      <nav aria-label="Helpful pages" className="flex flex-wrap gap-6 text-sm">
        <TextLink href="/">Home</TextLink>
        <TextLink href="/exhibitions">Exhibitions</TextLink>
        <TextLink href="/about">About</TextLink>
      </nav>
    </main>
  );
}
