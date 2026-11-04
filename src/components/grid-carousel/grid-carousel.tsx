"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

// Stacked below `xl` (1280px) and side by side from `xl`. The row is a native scroll-snap track,
// so touch, trackpad and keyboard scrolling all work without custom motion code.
export function GridCarousel({ heading, body, ctaLabel, ctaHref, items }: GridCarouselProps) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const update = () => {
      const maxScroll = track.scrollWidth - track.clientWidth;
      setCanScrollPrev(track.scrollLeft > 1);
      setCanScrollNext(track.scrollLeft < maxScroll - 1);
    };

    update();
    track.addEventListener("scroll", update, { passive: true });
    // Observe the tiles as well as the track, so the arrow state updates when tile widths change.
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(track);
    Array.from(track.children).forEach((child) => resizeObserver.observe(child));
    return () => {
      track.removeEventListener("scroll", update);
      resizeObserver.disconnect();
    };
  }, [items.length]);

  function scrollByArrow(direction: 1 | -1) {
    const track = trackRef.current;
    const [first, second] = track ? Array.from(track.children) : [];
    if (!track || !first) return;
    // Measure the real tile pitch (tile width + gap) rather than recomputing it from CSS.
    const pitch = second
      ? second.getBoundingClientRect().left - first.getBoundingClientRect().left
      : first.getBoundingClientRect().width;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollBy({ left: direction * pitch * ARROW_STEP, behavior: reduced ? "auto" : "smooth" });
  }

  return (
    <section
      aria-label={heading}
      className="flex flex-col gap-8 xl:grid xl:grid-cols-[20rem_minmax(0,1fr)] xl:items-start xl:gap-x-10 xl:gap-y-0 xl:pl-6"
    >
      <div className="hidden items-center justify-end gap-1 xl:col-span-2 xl:col-start-1 xl:row-start-1 xl:flex xl:self-end xl:pb-3 xl:pr-6">
        <button
          type="button"
          aria-label="Previous"
          onClick={() => scrollByArrow(-1)}
          disabled={!canScrollPrev}
          className="cursor-pointer p-2 text-foreground transition-opacity hover:opacity-60 disabled:cursor-default disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          aria-label="Next"
          onClick={() => scrollByArrow(1)}
          disabled={!canScrollNext}
          className="cursor-pointer p-2 text-foreground transition-opacity hover:opacity-60 disabled:cursor-default disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <ul
        ref={trackRef}
        className="order-2 mx-6 flex min-w-0 snap-x snap-mandatory gap-4 overflow-x-auto pb-1 [scrollbar-width:none] xl:order-none xl:col-start-2 xl:row-start-2 xl:mx-0 xl:mr-6 [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item, index) => (
          <li key={item.href} className="w-[clamp(260px,70vw,340px)] shrink-0 snap-start xl:w-[31vw]">
            <Link href={item.href} className="group flex flex-col gap-3">
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
                    loading={index < 3 ? "eager" : "lazy"}
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

      {/* Title cell: fixed beside the row on desktop (stays put while the row scrolls). Its children
          flow directly into the section below `xl`, so the order on small screens is title, row, button. */}
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
