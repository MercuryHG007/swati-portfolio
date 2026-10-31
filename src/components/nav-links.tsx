"use client";

import { usePathname } from "next/navigation";
import type { ComponentProps, MouseEvent } from "react";
import { Button } from "@/components/button/button";
import { TextLink } from "@/components/text-link/text-link";

// Clicking the link for the page you're already on does nothing: no duplicate history entry, no
// refetch, no scroll reset. Only preventDefault is called, so the mobile drawer still closes on click.
function useCurrentPageGuard(href: string) {
  const pathname = usePathname();
  return (event: MouseEvent<HTMLAnchorElement>) => {
    if (pathname === href) event.preventDefault();
  };
}

export function NavTextLink(props: ComponentProps<typeof TextLink>) {
  const onClick = useCurrentPageGuard(props.href);
  return <TextLink {...props} onClick={onClick} />;
}

type NavButtonProps = Extract<ComponentProps<typeof Button>, { href: string }>;

export function NavButton({ href, children, ...props }: NavButtonProps) {
  const onClick = useCurrentPageGuard(href);
  return (
    <Button href={href} onClick={onClick} {...props}>
      {children}
    </Button>
  );
}
