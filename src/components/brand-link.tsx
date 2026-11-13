"use client";

import { AppLink as Link } from "@/components/app-link";
import { usePathname } from "next/navigation";
import type { ComponentProps, MouseEvent } from "react";

// On the homepage, a click on the brand scrolls to the top. Navigating to the page you're already on re-requests it.
export function BrandLink(props: ComponentProps<typeof Link>) {
  const pathname = usePathname();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    const modified = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
    if (pathname !== "/" || modified) return;
    event.preventDefault();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }

  return <Link {...props} onClick={handleClick} />;
}
