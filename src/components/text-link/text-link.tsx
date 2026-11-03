import Link from "next/link";
import type { ComponentProps } from "react";
import styles from "./text-link.module.css";

type TextLinkProps = Omit<ComponentProps<"a">, "href"> & {
  href: string;
  variant?: "primary" | "inverse";
  prefetch?: boolean;
};

export type TextLinkVariant = "primary" | "inverse";

// Shared with elements that aren't anchors (e.g. a submit button styled as a text link).
export function textLinkClasses(variant: TextLinkVariant = "primary") {
  return `${styles.textLink} ${styles[variant]}`;
}

// The underline is a 1px ::after line. Primary starts drawn and retracts on hover; inverse draws in on hover.
export function TextLink({ href, variant = "primary", className = "", prefetch, ...props }: TextLinkProps) {
  const classes = `${textLinkClasses(variant)} ${className}`.trim();
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
