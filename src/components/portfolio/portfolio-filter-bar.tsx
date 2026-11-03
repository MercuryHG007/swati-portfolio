"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { FilterDrawer } from "@/components/portfolio/filter-drawer";
import {
  FILTER_LABELS,
  FilterOptions,
  optionsFor,
  pillText,
  visibleFilterKeys,
} from "@/components/portfolio/filter-options";
import {
  EMPTY_PORTFOLIO_FILTERS,
  hasPortfolioFilters,
  portfolioSearchParams,
  type FilterKey,
  type PortfolioFacets,
  type PortfolioFilters,
} from "@/lib/portfolio-filters";

type PortfolioFilterBarProps = {
  filters: PortfolioFilters;
  facets: PortfolioFacets;
  total: number;
  onChange: (next: PortfolioFilters) => void;
};

export function PortfolioFilterBar({ filters, facets, total, onChange }: PortfolioFilterBarProps) {
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // True only once the inline button has scrolled above the header, so the floating one doesn't show before it is reached.
  const [inlineButtonPassed, setInlineButtonPassed] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);
  const containersRef = useRef<Partial<Record<FilterKey, HTMLElement | null>>>({});
  const inlineButtonRef = useRef<HTMLButtonElement>(null);
  // The button that opened the drawer. Focus returns to it on close.
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  // Close the open desktop popover on outside click or Escape. Clicks inside its own chip or panel don't close it.
  useEffect(() => {
    if (!openFilter) return;
    function handlePointerDown(event: PointerEvent) {
      const container = containersRef.current[openFilter as FilterKey];
      if (container?.contains(event.target as Node)) return;
      setOpenFilter(null);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenFilter(null);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openFilter]);

  // The sticky header covers the top of the viewport, so the inline button only counts as visible below it.
  // "Passed" means it has left through the top; a button still below the fold is not passed.
  useEffect(() => {
    const node = inlineButtonRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) =>
        setInlineButtonPassed(
          !entry.isIntersecting && entry.boundingClientRect.bottom <= (entry.rootBounds?.top ?? 0)
        ),
      { rootMargin: "-80px 0px 0px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // The floating button would cover the footer's logo, so it steps aside while the footer is on screen.
  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!footer) return;
    const observer = new IntersectionObserver(([entry]) => setFooterVisible(entry.isIntersecting));
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  const openDrawer = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    triggerRef.current = event.currentTarget;
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    triggerRef.current?.focus();
  }, []);

  const applyDrawer = useCallback(
    (next: PortfolioFilters) => {
      setDrawerOpen(false);
      triggerRef.current?.focus();
      // Applying an unchanged selection closes the drawer without a request.
      if (portfolioSearchParams(next).toString() !== portfolioSearchParams(filters).toString()) onChange(next);
    },
    [filters, onChange]
  );

  function toggle(key: FilterKey, value: string) {
    const current = filters[key];
    const values = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
    onChange({ ...filters, [key]: values });
  }

  const pills = (Object.keys(FILTER_LABELS) as FilterKey[]).flatMap((key) =>
    filters[key].map((value) => ({ key, value, text: pillText(key, value, facets) }))
  );
  const activeCount = pills.length;
  const hasFilters = hasPortfolioFilters(filters);
  const noun = total === 1 ? "painting" : "paintings";
  const countLabel = activeCount > 0 ? ` (${activeCount})` : "";
  const sections = visibleFilterKeys(facets);

  return (
    <div className="flex flex-col gap-4">
      {/* Desktop: a chip per filter, each opening a checkbox panel. */}
      <div className="hidden flex-wrap items-center gap-2 md:flex">
        {sections.map((key) => {
          const selected = filters[key];
          const isOpen = openFilter === key;
          return (
            <div
              key={key}
              className="relative"
              ref={(element) => {
                containersRef.current[key] = element;
              }}
            >
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`portfolio-filter-${key}`}
                onClick={() => setOpenFilter(isOpen ? null : key)}
                className={`cursor-pointer rounded-full border px-4 py-2 text-sm transition-colors ${
                  selected.length > 0
                    ? "border-accent text-accent"
                    : "border-border text-foreground hover:border-accent hover:text-accent"
                }`}
              >
                {FILTER_LABELS[key]}
                {selected.length > 0 && ` · ${selected.length}`}
                <span aria-hidden="true" className="ml-2 text-muted">
                  {isOpen ? "▴" : "▾"}
                </span>
              </button>
              {isOpen && (
                <div
                  id={`portfolio-filter-${key}`}
                  className="absolute left-0 z-20 mt-2 w-max max-w-[min(56rem,calc(100vw-3rem))] rounded-md border border-border bg-background p-5 shadow-lg"
                >
                  <FilterOptions
                    name={key}
                    options={optionsFor(key, facets)}
                    selected={selected}
                    onToggle={(value) => toggle(key, value)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: one button opens the full-page drawer. The applied count stays visible on it. */}
      <div className="flex items-center gap-4 md:hidden">
        <button
          ref={inlineButtonRef}
          type="button"
          aria-haspopup="dialog"
          onClick={openDrawer}
          className="cursor-pointer rounded-full border border-border px-4 py-2 text-sm text-foreground hover:border-accent hover:text-accent"
        >
          Filters{countLabel}
        </button>
      </div>

      {/* Desktop only: the applied pills. On mobile they live in the drawer footer. */}
      {pills.length > 0 && (
        <ul className="hidden flex-wrap items-center gap-2 md:flex" aria-label="Active filters">
          {pills.map((pill) => (
            <li key={`${pill.key}-${pill.value}`}>
              <button
                type="button"
                onClick={() => onChange({ ...filters, [pill.key]: filters[pill.key].filter((item) => item !== pill.value) })}
                aria-label={`Remove filter: ${pill.text}`}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-accent px-3 py-1.5 text-xs text-accent transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {pill.text}
                <X aria-hidden="true" className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between gap-4 text-sm text-muted">
        <p aria-live="polite">
          {total} {noun}
        </p>
        {hasFilters && (
          <button
            type="button"
            onClick={() => onChange(EMPTY_PORTFOLIO_FILTERS)}
            className="cursor-pointer text-accent underline underline-offset-4"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Floats at the bottom centre once the inline button scrolls out of view. */}
      {inlineButtonPassed && !drawerOpen && !footerVisible && (
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={openDrawer}
          className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 cursor-pointer rounded-full border border-foreground bg-background px-5 py-2.5 text-sm text-foreground shadow-lg md:hidden"
        >
          Filters{countLabel}
        </button>
      )}

      {drawerOpen && (
        <FilterDrawer applied={filters} facets={facets} onApply={applyDrawer} onClose={closeDrawer} />
      )}
    </div>
  );
}
