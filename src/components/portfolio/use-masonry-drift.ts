import { useLayoutEffect, useRef } from "react";
import { DRIFT_TRAVEL, driftFactor } from "@/lib/masonry";

// Share of the remaining gap closed per second, about 12% per frame at 60fps.
const EASE_RATE = 8;
const SETTLE_EPSILON = 0.05;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function columnsOf(container: HTMLElement) {
  return Array.from(container.children) as HTMLElement[];
}

function applyDrift(container: HTMLElement, travel: number) {
  const columns = columnsOf(container);
  columns.forEach((column, index) => {
    const offset = driftFactor(index, columns.length) * travel;
    column.style.transform = offset ? `translate3d(0, ${offset}px, 0)` : "";
  });
}

// Scroll distance past the grid's top edge, clamped to the travel range.
function targetTravel(container: HTMLElement) {
  const top = container.getBoundingClientRect().top;
  return Math.min(DRIFT_TRAVEL, Math.max(0, -top));
}

// Runs a measurement with the drift cleared, so card positions reflect the layout and not the current offset.
export function measureWithoutDrift<T>(container: HTMLElement, measure: () => T): T {
  const columns = columnsOf(container);
  const saved = columns.map((column) => column.style.transform);
  columns.forEach((column) => {
    column.style.transform = "";
  });
  try {
    return measure();
  } finally {
    columns.forEach((column, index) => {
      column.style.transform = saved[index];
    });
  }
}

export function useMasonryDrift(container: HTMLElement | null, columnCount: number) {
  const travelRef = useRef(0);

  useLayoutEffect(() => {
    if (!container) return;
    if (window.matchMedia(REDUCED_MOTION_QUERY).matches) {
      applyDrift(container, 0);
      return;
    }

    let frame = 0;
    let last = 0;
    const tick = (now: number) => {
      const target = targetTravel(container);
      const dt = last ? (now - last) / 1000 : 1 / 60;
      last = now;
      let travel = travelRef.current + (target - travelRef.current) * (1 - Math.exp(-EASE_RATE * dt));
      if (Math.abs(target - travel) < SETTLE_EPSILON) travel = target;
      travelRef.current = travel;
      applyDrift(container, travel);
      frame = travel === target ? 0 : requestAnimationFrame(tick);
    };
    const start = () => {
      if (frame) return;
      last = 0;
      frame = requestAnimationFrame(tick);
    };

    applyDrift(container, travelRef.current);
    start();
    window.addEventListener("scroll", start, { passive: true });
    window.addEventListener("resize", start);
    return () => {
      window.removeEventListener("scroll", start);
      window.removeEventListener("resize", start);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [container, columnCount]);
}
