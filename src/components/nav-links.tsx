"use client";

import { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps, MouseEvent, ReactNode } from "react";
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

// Header links don't prefetch, so a click waits on the server. Pulse the label meanwhile so the tap
// gets an immediate response. Must render inside the <Link> to read its pending state.
function PendingLabel({ children }: { children: ReactNode }) {
  const { pending } = useLinkStatus();
  return <span className={pending ? "animate-pulse opacity-60" : undefined}>{children}</span>;
}

export function NavTextLink({ children, ...props }: ComponentProps<typeof TextLink>) {
  const onClick = useCurrentPageGuard(props.href);
  return (
    <TextLink {...props} onClick={onClick}>
      <PendingLabel>{children}</PendingLabel>
    </TextLink>
  );
}

type NavButtonProps = Extract<ComponentProps<typeof Button>, { href: string }>;

export function NavButton({ href, children, ...props }: NavButtonProps) {
  const onClick = useCurrentPageGuard(href);
  return (
    <Button href={href} onClick={onClick} {...props}>
      <PendingLabel>{children}</PendingLabel>
    </Button>
  );
}
