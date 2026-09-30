import Link from "next/link";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/exhibitions", label: "Exhibitions" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-5">
        <Link href="/" className="font-mono text-sm tracking-wide text-accent">
          Swati Garg
        </Link>
        <nav className="flex flex-wrap gap-6 text-sm text-foreground">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-accent">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
