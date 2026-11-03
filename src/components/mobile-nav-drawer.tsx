"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

// Flip to "left" to have the drawer fly in from the opposite side.
const DRAWER_DIRECTION: "left" | "right" = "right";

// Full class names so Tailwind can detect them.
const HIDE_ABOVE: Record<"md" | "lg", string> = { md: "md:hidden", lg: "lg:hidden" };

export function MobileNavDrawer({ children, breakpoint = "md" }: { children: ReactNode; breakpoint?: "md" | "lg" }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [openedAt, setOpenedAt] = useState(pathname);
  const panelRef = useRef<HTMLElement>(null);
  const hideAbove = HIDE_ABOVE[breakpoint];

  // Links don't close the drawer on click: it stays up, showing the link's pending state, until the
  // route actually changes. The header lives in the layout, so it isn't remounted by navigation.
  if (open && openedAt !== pathname) {
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  const sideClass = DRAWER_DIRECTION === "right" ? "right-0" : "left-0";
  const hiddenTranslate = DRAWER_DIRECTION === "right" ? "translate-x-full" : "-translate-x-full";

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpenedAt(pathname);
          setOpen((value) => !value);
        }}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className={`cursor-pointer text-foreground ${hideAbove}`}
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {open ? (
        <div className={`fixed inset-x-0 bottom-0 top-(--header-height) z-40 ${hideAbove}`}>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-pointer bg-foreground/30"
          />
          <nav
            ref={panelRef}
            onClick={(event) => {
              const anchor = (event.target as HTMLElement).closest("a");
              // A link to the current page doesn't navigate, so there's no route change to wait for.
              if (anchor && new URL(anchor.href).pathname === pathname) setOpen(false);
            }}
            className={`absolute top-0 ${sideClass} flex h-full w-full max-w-xs flex-col gap-6 overflow-y-auto bg-background px-6 py-8 shadow-lg transition-transform duration-300 ${
              open ? "translate-x-0" : hiddenTranslate
            }`}
          >
            {children}
          </nav>
        </div>
      ) : null}
    </>
  );
}
