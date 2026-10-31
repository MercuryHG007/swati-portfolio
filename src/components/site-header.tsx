import Link from "next/link";
import { MobileNavDrawer } from "@/components/mobile-nav-drawer";
import { Button } from "@/components/button/button";
import { TextLink } from "@/components/text-link/text-link";

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
        <Link href="/" className="font-serif text-base font-medium tracking-tight text-foreground">
          Swati Garg
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-foreground md:flex">
          {NAV_LINKS.map((link) => (
            <TextLink key={link.href} href={link.href} variant="inverse" prefetch={false}>
              {link.label}
            </TextLink>
          ))}
          <Button href={CTA.href} size="sm" prefetch={false}>
            {CTA.label}
          </Button>
        </nav>
        <MobileNavDrawer>
          {NAV_LINKS.map((link) => (
            <TextLink key={link.href} href={link.href} variant="inverse" prefetch={false} className="text-lg text-foreground">
              {link.label}
            </TextLink>
          ))}
          <Button href={CTA.href} size="sm" prefetch={false}>
            {CTA.label}
          </Button>
        </MobileNavDrawer>
      </div>
    </header>
  );
}
