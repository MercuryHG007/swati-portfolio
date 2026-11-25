"use client";

import { useEffect, useState, type ReactNode } from "react";

const HEADER_HEIGHT = 73; // matches --header-height
// Ignores small jitter from trackpads and touch so the header doesn't flicker.
const JITTER_PX = 4;

// Slides away on scroll down past the header, and comes back on any upward scroll or when focus enters it.
export function StickyHeader({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    let frame = 0;

    const update = () => {
      frame = 0;
      const y = window.scrollY;
      if (y <= HEADER_HEIGHT) {
        lastY = y;
        setHidden(false);
        return;
      }
      const dy = y - lastY;
      if (Math.abs(dy) < JITTER_PX) return;
      lastY = y;
      setHidden(dy > 0);
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <header
      onFocus={() => setHidden(false)}
      className={`sticky top-0 z-40 h-(--header-height) border-b border-border bg-background transition-transform duration-400 ease-out motion-reduce:transition-none ${
        hidden ? "-translate-y-full" : ""
      }`}
    >
      {children}
    </header>
  );
}
