"use client";

import Link from "next/link";
import type { ComponentProps, MouseEvent } from "react";
import { claimLinkClick } from "@/components/current-page-click";

type AppLinkProps = ComponentProps<typeof Link> & {
  // Set for the page you're already on, so the link does nothing when clicked.
  current?: boolean;
};

// Next.js Link that takes part in the click lock, so repeated taps can't stack navigations.
export function AppLink({ current = false, onClick, ...props }: AppLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (claimLinkClick(event, current)) onClick?.(event);
  }

  return <Link {...props} onClick={handleClick} />;
}
