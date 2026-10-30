import Link from "next/link";
import type { ComponentProps } from "react";
import styles from "./text-link.module.css";

type TextLinkProps = Omit<ComponentProps<"a">, "href"> & {
  href: string;
  variant?: "primary" | "inverse";
  prefetch?: boolean;
};

// The underline is a 1px ::after line. Primary starts drawn and retracts on hover; inverse draws in on hover.
export function TextLink({ href, variant = "primary", className = "", prefetch, ...props }: TextLinkProps) {
  const classes = `${styles.textLink} ${styles[variant]} ${className}`.trim();
  const isInternal = href.startsWith("/") && !href.startsWith("//");

  if (isInternal) {
    return <Link href={href} prefetch={prefetch} className={classes} {...props} />;
  }

  const isWeb = /^https?:\/\//.test(href);
  return (
    <a
      href={href}
      className={classes}
      target={isWeb ? "_blank" : undefined}
      rel={isWeb ? "noopener noreferrer" : undefined}
      {...props}
    />
  );
}
