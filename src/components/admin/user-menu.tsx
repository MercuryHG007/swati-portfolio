"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, UserRound } from "lucide-react";

export function UserMenu({ signOut }: { signOut: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-surface"
      >
        <UserRound size={18} aria-hidden="true" />
        <span>Account</span>
        <ChevronDown size={16} aria-hidden="true" className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 flex w-44 flex-col gap-1 rounded-md border border-border bg-background p-2 shadow-lg"
        >
          <Link
            role="menuitem"
            href="/admin/account"
            prefetch={false}
            onClick={() => setOpen(false)}
            className="rounded-md px-3 py-2 text-sm text-foreground hover:bg-surface"
          >
            Account settings
          </Link>
          <form action={signOut}>
            <button
              role="menuitem"
              type="submit"
              className="w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-surface"
            >
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
