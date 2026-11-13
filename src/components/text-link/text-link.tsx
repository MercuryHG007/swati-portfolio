import type { ComponentProps } from "react";
import styles from "./text-link.module.css";
import { AppLink } from "@/components/app-link";

type TextLinkProps = Omit<ComponentProps<"a">, "href"> & {
  href: string;
  variant?: "primary" | "inverse";
  prefetch?: boolean;
  current?: boolean;
};

export type TextLinkVariant = "primary" | "inverse";

// Shared with elements that aren't anchors (e.g. a submit button styled as a text link).
export function textLinkClasses(variant: TextLinkVariant = "primary") {
  return `${styles.textLink} ${styles[variant]}`;
}

// The underline is a 1px ::after line. Primary starts drawn and retracts on hover; inverse draws in on hover.
export function TextLink({ href, variant = "primary", className = "", prefetch, current, ...props }: TextLinkProps) {
  const classes = `${textLinkClasses(variant)} ${className}`.trim();
  const isInternal = href.startsWith("/") && !href.startsWith("//");

  if (isInternal) {
    return <AppLink href={href} prefetch={prefetch} current={current} className={classes} {...props} />;
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
