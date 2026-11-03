"use client";

import { useEffect, useRef } from "react";
import { ArtworkCard } from "@/components/artwork-card";
import { hasPortfolioFilters, type PortfolioCard, type PortfolioFilters } from "@/lib/portfolio-filters";

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
        className="grid grid-cols-2 gap-6 md:grid-cols-3 xl:grid-cols-4"
        aria-busy={isLoading}
        onClickCapture={(event) => {
          const link = (event.target as HTMLElement).closest<HTMLAnchorElement>("a[data-index]");
          if (!link) return;
          const index = Number(link.dataset.index);
          const artwork = items[index];
          if (artwork) onSelect(index, artwork.slug);
        }}
      >
        {items.map((artwork, index) => (
          <ArtworkCard
            key={artwork.slug}
            id={`artwork-${artwork.slug}`}
            dataIndex={index}
            slug={artwork.slug}
            title={artwork.title}
            year={artwork.year}
            image={artwork.image}
            priority={index === 0}
          />
        ))}
        {isLoading &&
          Array.from({ length: 4 }, (_, index) => (
            <div key={`placeholder-${index}`} aria-hidden="true" className="aspect-[4/5] animate-pulse rounded-md bg-surface" />
          ))}
      </div>

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
