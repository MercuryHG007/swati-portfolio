"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLink = { href: string; label: string };
type NavGroup = { label?: string; links: NavLink[] };

const ADMIN_NAV_GROUPS: NavGroup[] = [
  { links: [{ href: "/admin", label: "Dashboard" }] },
  {
    label: "Content",
    links: [
      { href: "/admin/artworks", label: "Artworks" },
      { href: "/admin/series", label: "Series" },
      { href: "/admin/exhibitions", label: "Exhibitions" },
      { href: "/admin/mediums", label: "Mediums" },
      { href: "/admin/subjects", label: "Subjects" },
    ],
  },
  {
    label: "Site",
    links: [
      { href: "/admin/home", label: "Home" },
      { href: "/admin/about", label: "About" },
      { href: "/admin/messages", label: "Messages" },
    ],
  },
  {
    label: "Insights",
    links: [
      { href: "/admin/analytics", label: "Analytics" },
      { href: "/admin/ai-assistant", label: "AI assistant" },
    ],
  },
];

// The dashboard is only active on its exact path; other links also match their sub-pages.
function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNavLinks() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-6">
      {ADMIN_NAV_GROUPS.map((group, groupIndex) => (
        <div key={group.label ?? groupIndex} className="flex flex-col gap-1">
          {group.label ? (
            <p className="mb-1 border-b border-border px-3 pb-2 text-xs font-semibold tracking-wide text-foreground uppercase">
              {group.label}
            </p>
          ) : null}
          {group.links.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                prefetch={false}
                aria-current={active ? "page" : undefined}
                className={`rounded-md py-2 pr-3 text-sm transition-colors ${
                  group.label ? "pl-6" : "px-3"
                } ${
                  active
                    ? "bg-surface font-semibold text-foreground"
                    : "text-muted hover:bg-surface hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}
