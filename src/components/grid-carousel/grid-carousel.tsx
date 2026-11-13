"use client";

import { AppLink as Link } from "@/components/app-link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { ProtectedImage } from "@/components/cloudinary-image";
import { Button } from "@/components/button/button";
import { CardTitle } from "@/components/card-title/card-title";

export type GridCarouselItem = {
  href: string;
  title: string;
  image?: { publicId: string; alt?: string } | null;
};

type GridCarouselProps = {
  heading: string;
  body?: string;
  ctaLabel?: string;
  ctaHref: string;
  items: GridCarouselItem[];
};

// Arrows move the row by this many tiles.
const ARROW_STEP = 2;
// How long each series stays active before the row moves on. Also the length of the progress fill.
const SLIDE_INTERVAL_MS = 3000;
// Autoplay resumes this long after the last pointer or wheel input inside the carousel.
const INTERACTION_RESUME_MS = 4000;
// Quiet time after the last scroll event before the row counts as settled. The active series and the loop jump wait for it.
const SCROLL_SETTLE_MS = 150;
// Copies needed for the loop itself: one before the real copy and one after it. Extra copies are added on top to cover the viewport.
const BASE_COPIES = 3;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );
}

function scrollBehavior(): ScrollBehavior {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches ? "auto" : "smooth";
}

// Distance from the first tile to the given tile, in scroll coordinates. Taken as a difference of
// viewport positions, so it doesn't depend on the current scroll position.
function tileOffset(track: HTMLElement, index: number) {
  return track.children[index].getBoundingClientRect().left - track.children[0].getBoundingClientRect().left;
}

// Index (within one copy of the series) of the tile whose left edge is closest to the track's left edge.
function nearestTileIndex(track: HTMLElement, count: number) {
  const trackLeft = track.getBoundingClientRect().left;
  let nearest = 0;
  let nearestDistance = Infinity;
  Array.from(track.children).forEach((child, index) => {
    const distance = Math.abs(child.getBoundingClientRect().left - trackLeft);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = index;
    }
  });
  return nearest % count;
}

// Stacked below `xl` (1280px) and side by side from `xl`. The row is a native scroll-snap track,
// so touch, trackpad and keyboard scrolling all work without custom motion code.
export function GridCarousel({ heading, body, ctaLabel, ctaHref, items }: GridCarouselProps) {
  const count = items.length;
  const loop = count > 1;
  const reducedMotion = usePrefersReducedMotion();

  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLUListElement>(null);
  // Rendered copies of the series. Grows with the track width so the viewport is always covered.
  const [copies, setCopies] = useState(BASE_COPIES + 1);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeRef = useRef(0);
  const copyWidthRef = useRef(0);
  // Set while a scroll we started is running. Loop jumps wait for it, since a jump would cancel the scroll.
  const targetIndexRef = useRef<number | null>(null);
  const settleTimerRef = useRef(0);

  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [offscreen, setOffscreen] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const interactionTimerRef = useRef(0);

  const playing =
    loop && !reducedMotion && !paused && !hovered && !keyboardFocus && !interacting && !offscreen && !tabHidden;

  // Moves the scroll position back into the middle copy's range. The copies are identical, so this is invisible.
  const normalize = useCallback(() => {
    const track = trackRef.current;
    const width = copyWidthRef.current;
    if (!track || !width) return;
    const left = track.scrollLeft;
    if (left < width) track.scrollLeft = left + width;
    else if (left >= 2 * width) track.scrollLeft = left - width;
  }, []);

  const settle = useCallback(() => {
    window.clearTimeout(settleTimerRef.current);
    const track = trackRef.current;
    if (!track) return;
    const index = targetIndexRef.current ?? nearestTileIndex(track, count);
    targetIndexRef.current = null;
    activeRef.current = index;
    setActiveIndex(index);
    normalize();
  }, [count, normalize]);

  // `targetIndex` is the series a slide is moving to. Arrow moves pass null and settle on the nearest series.
  const scrollRowTo = useCallback(
    (left: number, targetIndex: number | null = null) => {
      const track = trackRef.current;
      if (!track) return;
      targetIndexRef.current = targetIndex;
      if (Math.abs(left - track.scrollLeft) < 1) {
        settle();
        return;
      }
      window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = window.setTimeout(settle, SCROLL_SETTLE_MS);
      track.scrollTo({ left, behavior: scrollBehavior() });
    },
    [settle],
  );

  const scrollToIndex = useCallback(
    (index: number) => {
      const track = trackRef.current;
      const width = copyWidthRef.current;
      if (!track || !width) return;
      const offset = tileOffset(track, index);
      // Use the copy of this tile nearest the current position, so the row never travels a full copy.
      const copy = Math.round((track.scrollLeft - offset) / width);
      scrollRowTo(offset + copy * width, index);
    },
    [scrollRowTo],
  );

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track || !loop) return;
    const width = tileOffset(track, count);
    if (width <= 0) return;
    setCopies(BASE_COPIES + Math.max(1, Math.ceil(track.clientWidth / width)));
    if (Math.abs(width - copyWidthRef.current) >= 0.5) {
      copyWidthRef.current = width;
      // The layout changed, so return to the series that was active rather than an arbitrary offset.
      track.scrollLeft = width + tileOffset(track, Math.min(activeRef.current, count - 1));
    }
  }, [count, loop]);

  useLayoutEffect(() => {
    if (!loop) return;
    measure();
    const track = trackRef.current;
    if (!track) return;
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(track);
    return () => resizeObserver.disconnect();
  }, [loop, measure]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    track.addEventListener("scrollend", settle);
    return () => track.removeEventListener("scrollend", settle);
  }, [settle]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || !loop) return;
    const observer = new IntersectionObserver(([entry]) => setOffscreen(!entry.isIntersecting), { threshold: 0.5 });
    observer.observe(section);
    return () => observer.disconnect();
  }, [loop]);

  useEffect(() => {
    const onVisibilityChange = () => setTabHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  // The progress fill is the only clock. Pausing it pauses the countdown, so the row moves exactly when the fill completes.
  function handleSlideComplete() {
    scrollToIndex((activeIndex + 1) % count);
  }

  function releaseAutoplayAfterInteraction() {
    window.clearTimeout(interactionTimerRef.current);
    interactionTimerRef.current = window.setTimeout(() => setInteracting(false), INTERACTION_RESUME_MS);
  }

  function handleScroll() {
    // Scroll events keep pushing the settle timer back, so the active series only changes once the row has stopped.
    window.clearTimeout(settleTimerRef.current);
    settleTimerRef.current = window.setTimeout(settle, SCROLL_SETTLE_MS);
  }

  function scrollByArrow(direction: 1 | -1) {
    const track = trackRef.current;
    const [first, second] = track ? Array.from(track.children) : [];
    if (!track || !first) return;
    // Measure the real tile pitch (tile width + gap) rather than recomputing it from CSS.
    const pitch = second
      ? second.getBoundingClientRect().left - first.getBoundingClientRect().left
      : first.getBoundingClientRect().width;
    scrollRowTo(track.scrollLeft + direction * pitch * ARROW_STEP);
  }

  const primaryCopy = loop ? 1 : 0;
  const tiles = Array.from({ length: loop ? copies : 1 }, (_, copy) =>
    items.map((item, index) => ({ copy, index, item })),
  ).flat();

  return (
    <section
      ref={sectionRef}
      aria-label={heading}
      onWheel={() => {
        setInteracting(true);
        releaseAutoplayAfterInteraction();
      }}
      onFocus={(event) => setKeyboardFocus(event.target.matches(":focus-visible"))}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setKeyboardFocus(false);
      }}
      className="flex flex-col gap-8 xl:grid xl:grid-cols-[20rem_minmax(0,1fr)] xl:items-start xl:gap-x-10 xl:gap-y-0 xl:pl-6"
    >
      {loop ? (
        <div className="hidden items-center justify-end gap-1 xl:col-span-2 xl:col-start-1 xl:row-start-1 xl:flex xl:self-end xl:pb-3 xl:pr-6">
          <button
            type="button"
            aria-label="Previous"
            onClick={() => scrollByArrow(-1)}
            className="cursor-pointer p-2 text-foreground transition-opacity hover:opacity-60"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={() => scrollByArrow(1)}
            className="cursor-pointer p-2 text-foreground transition-opacity hover:opacity-60"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ) : null}

      <ul
        ref={trackRef}
        onScroll={handleScroll}
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") setHovered(true);
        }}
        onPointerLeave={() => setHovered(false)}
        // Touch panning holds autoplay until the finger lifts. Mouse clicks elsewhere in the carousel don't.
        onPointerDown={(event) => {
          if (event.pointerType !== "touch") return;
          window.clearTimeout(interactionTimerRef.current);
          setInteracting(true);
        }}
        onPointerUp={(event) => {
          if (event.pointerType === "touch") releaseAutoplayAfterInteraction();
        }}
        onPointerCancel={releaseAutoplayAfterInteraction}
        className="order-2 mx-6 flex min-w-0 snap-x snap-mandatory gap-4 overflow-x-auto pb-1 [scrollbar-width:none] xl:order-none xl:col-start-2 xl:row-start-2 xl:mx-0 xl:mr-6 [&::-webkit-scrollbar]:hidden"
      >
        {tiles.map(({ copy, index, item }) => (
          <li
            key={`${copy}-${item.href}`}
            // Clones stay tappable: a tap on any visible copy must open the series, and the row can be
            // resting on a clone on load. They are hidden from assistive tech and the tab order instead.
            aria-hidden={copy !== primaryCopy || undefined}
            className="w-[clamp(260px,70vw,340px)] shrink-0 snap-start xl:w-[31vw]"
          >
            <Link href={item.href} tabIndex={copy !== primaryCopy ? -1 : undefined} className="group flex flex-col gap-3">
              <span className="relative block aspect-[4/3] overflow-hidden rounded-md bg-surface">
                {item.image ? (
                  <ProtectedImage
                    src={item.image.publicId}
                    alt={item.image.alt || item.title}
                    fill
                    crop="fill"
                    gravity="auto"
                    sizes="(min-width: 1280px) 31vw, 70vw"
                    // The first three tiles are above the fold on desktop, so they must not be lazy-loaded.
                    loading={copy === primaryCopy && index < 3 ? "eager" : "lazy"}
                    className="scale-[1.05] object-cover transition duration-500 ease-out group-hover:scale-100 group-focus-visible:scale-100 motion-reduce:scale-100 motion-reduce:transition-none"
                  />
                ) : null}
              </span>
              <span className="font-sans text-base font-semibold text-foreground">
                <CardTitle>{item.title}</CardTitle>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {loop ? (
        <div className="order-2 -mt-4 flex items-center justify-center gap-3 xl:order-none xl:col-start-2 xl:row-start-3 xl:mr-6 xl:mt-0 xl:pt-5">
          <ol className="flex items-center">
            {items.map((item, index) => {
              const active = index === activeIndex;
              return (
                <li key={item.href}>
                  <button
                    type="button"
                    aria-label={`Show ${item.title}`}
                    aria-current={active || undefined}
                    onClick={() => scrollToIndex(index)}
                    className="flex h-6 w-5 cursor-pointer items-center justify-center"
                  >
                    <span
                      className={`relative block h-1.5 overflow-hidden rounded-full bg-muted/40 transition-[width] duration-300 ${active ? "w-4" : "w-1.5"}`}
                    >
                      {active ? (
                        <span
                          className="absolute inset-0 origin-left rounded-full bg-foreground"
                          onAnimationEnd={handleSlideComplete}
                          style={{
                            animation: `carousel-progress ${SLIDE_INTERVAL_MS}ms linear forwards`,
                            animationPlayState: playing ? "running" : "paused",
                          }}
                        />
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          {reducedMotion ? null : (
            <button
              type="button"
              onClick={() => setPaused((value) => !value)}
              aria-label={paused ? "Play carousel" : "Pause carousel"}
              className="cursor-pointer p-1 text-foreground transition-opacity hover:opacity-60"
            >
              {paused ? <Play className="h-3.5 w-3.5" aria-hidden /> : <Pause className="h-3.5 w-3.5" aria-hidden />}
            </button>
          )}
        </div>
      ) : null}

      {/* Title cell: fixed beside the row on desktop (stays put while the row scrolls). Its children          flow directly into the section below `xl`, so the order on small screens is title, row, button. */}
      <div className="contents xl:flex xl:flex-col xl:col-start-1 xl:row-start-2 xl:self-stretch">
        <header className="order-1 flex flex-col gap-4 px-6 xl:px-0 xl:pt-10">
          <h2 className="text-3xl font-medium leading-tight text-foreground">{heading}</h2>
          {body ? <p className="text-muted">{body}</p> : null}
        </header>
        {ctaLabel ? (
          <div className="order-3 px-6 xl:px-0 xl:pt-8">
            <Button href={ctaHref} variant="primary" size="md">
              {ctaLabel}
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
