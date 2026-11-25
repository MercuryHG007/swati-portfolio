"use client";

import { useState } from "react";
import { TextLink } from "@/components/text-link/text-link";

export type FooterNavLink = { href: string; label: string };

// Collapses on mobile. From md up the list is always shown and the toggle is inert.
export function FooterNav({ links }: { links: FooterNavLink[] }) {
  const [open, setOpen] = useState(false);

  return (
    <nav aria-labelledby="footer-nav-heading" className="flex flex-col gap-2 border-b border-border pb-2 md:border-0 md:pb-0">
      <h2 id="footer-nav-heading" className="text-sm font-medium text-muted">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="footer-nav-list"
          onClick={() => setOpen((value) => !value)}
          className="flex w-full cursor-pointer items-center justify-between gap-4 text-left md:pointer-events-none"
        >
          Explore
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`h-4 w-4 transition-transform md:hidden ${open ? "rotate-180" : ""}`}
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </h2>
      <ul id="footer-nav-list" className={`${open ? "flex" : "hidden"} flex-col gap-2 pl-4 md:flex md:pl-0`}>
        {links.map((link) => (
          <li key={link.href}>
            <TextLink href={link.href} variant="inverse" prefetch={false} className="w-fit">
              {link.label}
            </TextLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
