"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type HeaderFilterContextValue = {
  // True while a page's filter bar has scrolled above the header on desktop.
  active: boolean;
  setActive: (active: boolean) => void;
  // The header node that receives the filter bar while active.
  slot: HTMLElement | null;
  setSlot: (slot: HTMLElement | null) => void;
};

const HeaderFilterContext = createContext<HeaderFilterContextValue | null>(null);

export function HeaderFilterProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const value = useMemo(() => ({ active, setActive, slot, setSlot }), [active, slot]);
  return <HeaderFilterContext.Provider value={value}>{children}</HeaderFilterContext.Provider>;
}

export function useHeaderFilter() {
  const context = useContext(HeaderFilterContext);
  if (!context) throw new Error("useHeaderFilter must be used within HeaderFilterProvider");
  return context;
}

// Shows the site nav normally, and swaps it for an empty slot while the page's filter is in the header.
export function HeaderFilterSwap({ children }: { children: ReactNode }) {
  const { active, setSlot } = useHeaderFilter();
  if (active) {
    return <div ref={(node) => setSlot(node)} className="hidden min-w-0 flex-1 justify-end md:flex" />;
  }
  return children;
}
