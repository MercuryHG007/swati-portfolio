"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";

// Flip to "left" to have the drawer fly in from the opposite side.
const DRAWER_DIRECTION: "left" | "right" = "right";

export function MobileNavDrawer({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLElement>(null);

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
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className="text-foreground md:hidden"
      >
        {open ? <X size={24} /> : <Menu size={24} />}
      </button>

      {open ? (
        <div className="fixed inset-x-0 bottom-0 top-(--header-height) z-40 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-foreground/30"
          />
          <nav
            ref={panelRef}
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("a")) setOpen(false);
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
