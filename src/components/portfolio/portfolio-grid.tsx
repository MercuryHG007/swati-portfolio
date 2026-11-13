"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArtworkCard } from "@/components/artwork-card";
import { measureWithoutDrift, useMasonryDrift } from "@/components/portfolio/use-masonry-drift";
import { columnCountFor, columnWidthFor, distributeIntoColumns, heightRatio } from "@/lib/masonry";
import { hasPortfolioFilters, type PortfolioCard, type PortfolioFilters } from "@/lib/portfolio-filters";

// Rounds the sizes hint up to this step so it only changes when the column width crosses a step.
const SIZES_STEP = 40;
const DEFAULT_SIZES = "50vw";

// The first card whose bottom edge is on screen. Used to keep the reader's place when the column count changes.
function findTopCard(root: HTMLElement) {
  for (const link of root.querySelectorAll<HTMLAnchorElement>("a[data-index]")) {
    const rect = link.getBoundingClientRect();
    if (rect.bottom > 0) return { id: link.id, top: rect.top };
  }
  return null;
}

type PortfolioGridProps = {
  items: PortfolioCard[];
  hasMore: boolean;
  status: "idle" | "loading" | "error";
  total: number;
  filters: PortfolioFilters;
  onLoadMore: () => void;
  onRetry: () => void;
  onSelect: (index: number, slug: string) => void;
  onClearFilters: () => void;
};

export function PortfolioGrid({
  items,
  hasMore,
  status,
  total,
  filters,
  onLoadMore,
  onRetry,
  onSelect,
  onClearFilters,
}: PortfolioGridProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isLoading = status === "loading";
  const filtered = hasPortfolioFilters(filters);
  const noun = total === 1 ? "painting" : "paintings";

  // Re-observe after each append. The sentinel may still be on screen after new items arrive, and it would not fire again otherwise.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) onLoadMore();
      },
      { rootMargin: "600px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore, items.length]);

  // Column count follows the grid's own width (the page padding and any side nav are excluded).
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [layout, setLayout] = useState({ count: 2, sizes: DEFAULT_SIZES });
  const countRef = useRef(2);
  // Sampled only when positions are settled. During a count change the DOM is mid-reflow, so reading it there gives wrong positions.
  const topCardRef = useRef<{ id: string; top: number } | null>(null);
  const pendingAnchorRef = useRef<{ id: string; top: number } | null>(null);
  useMasonryDrift(container, layout.count);

  useEffect(() => {
    if (!container) return;
    let frame = 0;
    const sample = () => {
      frame = 0;
      topCardRef.current = measureWithoutDrift(container, () => findTopCard(container));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(sample);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [container]);

  useEffect(() => {
    if (!container) return;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      const count = columnCountFor(width);
      const sizes = `${Math.ceil(columnWidthFor(width, count) / SIZES_STEP) * SIZES_STEP}px`;
      if (count !== countRef.current) {
        countRef.current = count;
        pendingAnchorRef.current = topCardRef.current;
      } else {
        topCardRef.current = measureWithoutDrift(container, () => findTopCard(container));
      }
      setLayout((prev) => (prev.count === count && prev.sizes === sizes ? prev : { count, sizes }));
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [container]);

  // After a count change the cards have moved. Put the card the reader was looking at back where it was.
  useLayoutEffect(() => {
    const anchor = pendingAnchorRef.current;
    pendingAnchorRef.current = null;
    if (!container) return;
    const node = anchor && document.getElementById(anchor.id);
    if (anchor && node) {
      const delta = measureWithoutDrift(container, () => node.getBoundingClientRect().top) - anchor.top;
      if (delta) window.scrollBy(0, delta);
    }
    topCardRef.current = measureWithoutDrift(container, () => findTopCard(container));
  }, [layout.count, container]);

  const columns = useMemo(
    () => distributeIntoColumns(items, layout.count, heightRatio),
    [items, layout.count]
  );

  if (items.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col gap-3 py-10 text-center">
        {status === "error" ? (
          <>
            <p className="text-muted">Couldn&apos;t load paintings.</p>
            <button
              type="button"
              onClick={onRetry}
              className="cursor-pointer text-sm text-accent underline underline-offset-4"
            >
              Try again
            </button>
          </>
        ) : (
          <>
            <p className="text-muted">{filtered ? "No paintings match these filters." : "New work coming soon."}</p>
            {filtered && (
              <button
                type="button"
                onClick={onClearFilters}
                className="cursor-pointer text-sm text-accent underline underline-offset-4"
              >
                Clear filters
              </button>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <div
        ref={setContainer}
        className="flex gap-4"
        aria-busy={isLoading}
        onClickCapture={(event) => {
          const link = (event.target as HTMLElement).closest<HTMLAnchorElement>("a[data-index]");
          if (!link) return;
          const index = Number(link.dataset.index);
          const artwork = items[index];
          if (artwork) onSelect(index, artwork.slug);
        }}
      >
        {columns.map((column, columnIndex) => (
          <div key={columnIndex} className="flex min-w-0 flex-1 flex-col gap-4 will-change-transform">
            {column.map(({ item: artwork, index }) => (
              <ArtworkCard
                key={artwork.slug}
                id={`artwork-${artwork.slug}`}
                dataIndex={index}
                slug={artwork.slug}
                title={artwork.title}
                image={artwork.image}
                priority={index === 0}
                aspectRatio={1 / heightRatio(artwork)}
                sizes={layout.sizes}
                showCaption={false}
                fadeIn
              />
            ))}
          </div>
        ))}
      </div>
      {isLoading && (
        <div className="flex gap-4" aria-hidden="true">
          {Array.from({ length: layout.count }, (_, index) => (
            <div key={`placeholder-${index}`} className="aspect-[4/5] min-w-0 flex-1 animate-pulse rounded-md bg-surface" />
          ))}
        </div>
      )}

      <div ref={sentinelRef} aria-hidden="true" />

      <div className="flex flex-col items-center gap-3 text-sm" aria-live="polite">
        {status === "error" && (
          <>
            <p className="text-muted">Couldn&apos;t load more paintings.</p>
            <button
              type="button"
              onClick={onRetry}
              className="cursor-pointer rounded-full border border-border px-4 py-2 text-foreground hover:border-accent hover:text-accent"
            >
              Try again
            </button>
          </>
        )}
        {status !== "error" && hasMore && (
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isLoading}
            className="cursor-pointer rounded-full border border-border px-4 py-2 text-foreground hover:border-accent hover:text-accent disabled:cursor-default disabled:opacity-50"
          >
            {isLoading ? "Loading…" : "Load more"}
          </button>
        )}
        {!hasMore && !isLoading && (
          <p className="text-muted">
            That&apos;s all {total} {noun}.
          </p>
        )}
      </div>
    </div>
  );
}
