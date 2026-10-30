import Link from "next/link";
import { MobileNavDrawer } from "@/components/mobile-nav-drawer";

const NAV_LINKS = [
  { href: "/portfolio", label: "Portfolio" },
  { href: "/exhibitions", label: "Exhibitions" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  return (
    <header className="h-(--header-height) border-b border-border">
      <div className="mx-auto flex h-full max-w-5xl items-center justify-between gap-4 px-6">
        <Link href="/" className="font-mono text-sm tracking-wide text-accent">
          Swati Garg
        </Link>
        <nav className="hidden flex-wrap gap-6 text-sm text-foreground md:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} prefetch={false} className="hover:text-accent">
              {link.label}
            </Link>
          ))}
        </nav>
        <MobileNavDrawer>
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              prefetch={false}
              className="text-lg text-foreground hover:text-accent"
            >
              {link.label}
            </Link>
          ))}
        </MobileNavDrawer>
      </div>
    </header>
  );
}
