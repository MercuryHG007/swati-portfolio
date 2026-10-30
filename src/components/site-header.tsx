import Link from "next/link";
import { MobileNavDrawer } from "@/components/mobile-nav-drawer";

// Exhibitions live on the About page, so they're not a top-level link.
const NAV_LINKS = [
  { href: "/portfolio", label: "Portfolio" },
  { href: "/about", label: "About" },
];

const CTA = { href: "/contact", label: "Get in touch" };

export function SiteHeader() {
  return (
    <header className="h-(--header-height) border-b border-border">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-4 px-6">
        <Link href="/" className="text-base font-medium tracking-tight text-foreground">
          Swati Garg
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-foreground md:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} prefetch={false} className="hover:text-muted">
              {link.label}
            </Link>
          ))}
          <Link
            href={CTA.href}
            prefetch={false}
            className="rounded-full bg-accent px-4 py-2 text-accent-foreground hover:opacity-80"
          >
            {CTA.label}
          </Link>
        </nav>
        <MobileNavDrawer>
          {[...NAV_LINKS, CTA].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              prefetch={false}
              className="text-lg text-foreground hover:text-muted"
            >
              {link.label}
            </Link>
          ))}
        </MobileNavDrawer>
      </div>
    </header>
  );
}
