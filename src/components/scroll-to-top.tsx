"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

// Shown once the reader has scrolled about one screen down. Sits under the mobile drawer (z-40).
export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > window.innerHeight);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function scrollToTop() {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  }

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Back to top"
      tabIndex={visible ? 0 : -1}
      className={`fixed bottom-6 right-6 z-30 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-foreground bg-background text-foreground transition-opacity duration-300 hover:bg-foreground hover:text-background ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <ArrowUp size={20} aria-hidden />
    </button>
  );
}
