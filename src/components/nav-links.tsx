"use client";

import { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/button/button";
import { TextLink } from "@/components/text-link/text-link";

// Clicking the link for the page you're already on does nothing: no duplicate history entry, no
// refetch, no scroll reset. The link's `current` prop handles that, and the shared click lock handles the rest.

// Header links don't prefetch, so a click waits on the server. Pulse the label meanwhile so the tap
// gets an immediate response. Must render inside the <Link> to read its pending state.
function PendingLabel({ children }: { children: ReactNode }) {
  const { pending } = useLinkStatus();
  return <span className={pending ? "animate-pulse opacity-60" : undefined}>{children}</span>;
}

export function NavTextLink({ children, ...props }: ComponentProps<typeof TextLink>) {
  const pathname = usePathname();
  return (
    <TextLink {...props} current={pathname === props.href}>
      <PendingLabel>{children}</PendingLabel>
    </TextLink>
  );
}

type NavButtonProps = Extract<ComponentProps<typeof Button>, { href: string }>;

export function NavButton({ href, children, ...props }: NavButtonProps) {
  const pathname = usePathname();
  return (
    <Button href={href} current={pathname === href} {...props}>
      <PendingLabel>{children}</PendingLabel>
    </Button>
  );
}
