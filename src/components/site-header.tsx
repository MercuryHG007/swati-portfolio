import { BrandLink } from "@/components/brand-link";
import { MobileNavDrawer } from "@/components/mobile-nav-drawer";
import { NavButton, NavTextLink } from "@/components/nav-links";
import { HeaderFilterSwap } from "@/components/header-filter";

const NAV_LINKS = [
  { href: "/portfolio", label: "Portfolio" },
  { href: "/exhibitions", label: "Exhibitions" },
  { href: "/about", label: "About" },
];

const CTA = { href: "/contact", label: "Get in touch" };

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 h-(--header-height) border-b border-border bg-background">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-4 px-6">
        <BrandLink href="/" className="font-serif text-base font-medium tracking-tight text-foreground">
          Swati Garg
        </BrandLink>
        <HeaderFilterSwap>
          <nav className="hidden items-center gap-8 text-sm text-foreground md:flex">
            {NAV_LINKS.map((link) => (
              <NavTextLink key={link.href} href={link.href} variant="inverse" prefetch={false}>
                {link.label}
              </NavTextLink>
            ))}
            <NavButton href={CTA.href} size="sm" prefetch={false}>
              {CTA.label}
            </NavButton>
          </nav>
        </HeaderFilterSwap>
        <MobileNavDrawer>
          {NAV_LINKS.map((link) => (
            <NavTextLink key={link.href} href={link.href} variant="inverse" prefetch={false} className="text-lg text-foreground">
              {link.label}
            </NavTextLink>
          ))}
          <NavButton href={CTA.href} size="sm" prefetch={false}>
            {CTA.label}
          </NavButton>
        </MobileNavDrawer>
      </div>
    </header>
  );
}
