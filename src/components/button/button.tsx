import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export type ButtonVariant = "primary" | "inverse";
export type ButtonSize = "sm" | "md" | "lg";

// Label size and padding scale together. Line height is fixed so the height comes from the padding.
const sizeClass: Record<ButtonSize, string> = {
  sm: "px-4 py-2 text-sm leading-5",
  md: "px-5 py-2 text-[15px] leading-5",
  lg: "px-6 py-3 text-base leading-6",
};

// Primary keeps its border on hover so the shape doesn't change when it switches to the outline look.
const variantClass: Record<ButtonVariant, string> = {
  primary: "border-accent bg-accent text-accent-foreground hover:bg-transparent hover:text-accent",
  inverse: "border-foreground text-foreground hover:bg-foreground hover:text-background",
};

export function buttonClasses({
  variant = "primary",
  size = "md",
}: { variant?: ButtonVariant; size?: ButtonSize } = {}) {
  // Tailwind's preflight sets native buttons to `cursor: default`, so set it explicitly.
  return `inline-flex cursor-pointer items-center whitespace-nowrap rounded-full border ${sizeClass[size]} ${variantClass[variant]}`;
}

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
};

type ButtonLinkProps = CommonProps &
  Omit<ComponentProps<"a">, "href" | "children" | "className"> & {
    href: string;
    prefetch?: boolean;
  };

type ButtonNativeProps = CommonProps &
  Omit<ComponentProps<"button">, "children" | "className"> & {
    href?: undefined;
  };

export type ButtonProps = ButtonLinkProps | ButtonNativeProps;

// Pass `href` to render a link (external URLs open in a new tab). Without it, renders a <button>.
export function Button({ variant = "primary", size = "md", className = "", ...props }: ButtonProps) {
  const classes = `${buttonClasses({ variant, size })} w-fit ${className}`.trim();

  if (props.href !== undefined) {
    const { href, prefetch, children, ...anchorProps } = props;
    const isInternal = href.startsWith("/") && !href.startsWith("//");

    if (isInternal) {
      return (
        <Link href={href} prefetch={prefetch} className={classes} {...anchorProps}>
          {children}
        </Link>
      );
    }

    const isWeb = /^https?:\/\//.test(href);
    return (
      <a
        href={href}
        className={classes}
        target={isWeb ? "_blank" : undefined}
        rel={isWeb ? "noopener noreferrer" : undefined}
        {...anchorProps}
      >
        {children}
      </a>
    );
  }

  const { children, type = "button", ...buttonProps } = props;
  return (
    <button type={type} className={classes} {...buttonProps}>
      {children}
    </button>
  );
}
