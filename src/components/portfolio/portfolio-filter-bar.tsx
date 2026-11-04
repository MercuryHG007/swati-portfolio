"use client";

import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { useHeaderFilter } from "@/components/header-filter";
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

const HEADER_HEIGHT = 73; // matches --header-height
const MOBILE_HEADER_OFFSET = 80;

// Reports whether an element has fully scrolled above the sticky header. A hidden element (display: none) has no height, so it never counts as passed.
// Measured on scroll and resize, not with IntersectionObserver: an instant jump from far above to far below changes no intersection state, so the observer would miss it.
function watchPassedHeader(node: HTMLElement, offset: number, onChange: (passed: boolean) => void) {
  let frame = 0;
  let last: boolean | null = null;
  const measure = () => {
    frame = 0;
    const rect = node.getBoundingClientRect();
    const passed = rect.height > 0 && rect.bottom <= offset;
    if (passed !== last) {
      last = passed;
      onChange(passed);
    }
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(measure);
  };
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  schedule();
  return () => {
    window.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", schedule);
    cancelAnimationFrame(frame);
  };
}

type FilterChipListProps = {
  keys: FilterKey[];
  filters: PortfolioFilters;
  facets: PortfolioFacets;
  placement: "inline" | "header";
  onToggle: (key: FilterKey, value: string) => void;
};

// One chip per filter, each opening a checkbox panel. The page and the header render separate copies with their own open state.
function FilterChipList({ keys, filters, facets, placement, onToggle }: FilterChipListProps) {
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
  const containersRef = useRef<Partial<Record<FilterKey, HTMLElement | null>>>({});

  // Close the open popover on outside click or Escape. Clicks inside its own chip or panel don't close it.
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

  // The header is a fixed-height bar, so its panel is centred under it rather than anchored to a chip near the edge.
  const panelClass =
    placement === "header"
      ? "fixed left-1/2 top-[calc(var(--header-height)+0.5rem)] z-50 w-max max-w-[min(56rem,calc(100vw-3rem))] -translate-x-1/2 rounded-md border border-border bg-background p-5 shadow-lg"
      : "absolute left-0 z-20 mt-2 w-max max-w-[min(56rem,calc(100vw-3rem))] rounded-md border border-border bg-background p-5 shadow-lg";

  return (
    <>
      {keys.map((key) => {
        const selected = filters[key];
        const isOpen = openFilter === key;
        const panelId = `portfolio-filter-${placement}-${key}`;
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
              aria-controls={panelId}
              onClick={() => setOpenFilter(isOpen ? null : key)}
              className={`cursor-pointer whitespace-nowrap rounded-full border px-4 py-2 text-sm transition-colors ${
                selected.length > 0
                  ? "border-accent text-accent"
                  : "border-foreground text-foreground hover:border-accent hover:text-accent"
              }`}
            >
              {FILTER_LABELS[key]}
              {selected.length > 0 && ` · ${selected.length}`}
              <span aria-hidden="true" className="ml-2 text-muted">
                {isOpen ? "▴" : "▾"}
              </span>
            </button>
            {isOpen && (
              <div id={panelId} className={panelClass}>
                <FilterOptions
                  name={key}
                  options={optionsFor(key, facets)}
                  selected={selected}
                  onToggle={(value) => onToggle(key, value)}
                />
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

export function PortfolioFilterBar({ filters, facets, total, onChange }: PortfolioFilterBarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  // True only once the inline button has scrolled above the header, so the floating one doesn't show before it is reached.
  const [inlineButtonPassed, setInlineButtonPassed] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);
  const { active: headerFilterActive, setActive: setHeaderFilterActive, slot: headerSlot } = useHeaderFilter();
  const desktopRowRef = useRef<HTMLDivElement>(null);
  const inlineButtonRef = useRef<HTMLButtonElement>(null);
  // The button that opened the drawer. Focus returns to it on close.
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  // Desktop only: once the chip row has fully scrolled above the header, the header takes over with its own copy.
  useEffect(() => {
    const node = desktopRowRef.current;
    if (!node) return;
    const stop = watchPassedHeader(node, HEADER_HEIGHT, setHeaderFilterActive);
    return () => {
      stop();
      setHeaderFilterActive(false);
    };
  }, [setHeaderFilterActive]);

  // The sticky header covers the top of the viewport, so the inline button only counts as visible below it.
  // "Passed" means it has left through the top; a button still below the fold is not passed.
  useEffect(() => {
    const node = inlineButtonRef.current;
    if (!node) return;
    return watchPassedHeader(node, MOBILE_HEADER_OFFSET, setInlineButtonPassed);
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
    // preventScroll keeps the page where it is; a plain focus() would scroll the trigger into view.
    triggerRef.current?.focus({ preventScroll: true });
  }, []);

  const applyDrawer = useCallback(
    (next: PortfolioFilters) => {
      setDrawerOpen(false);
      triggerRef.current?.focus({ preventScroll: true });
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
      <div ref={desktopRowRef} className="hidden flex-wrap items-center gap-2 md:flex">
        <FilterChipList keys={sections} filters={filters} facets={facets} placement="inline" onToggle={toggle} />
      </div>

      {/* Desktop: once the chip row scrolls past the header, the header shows the chips and Clear all. */}
      {headerFilterActive &&
        headerSlot &&
        createPortal(
          <div className="flex min-w-0 items-center gap-2">
            <FilterChipList keys={sections} filters={filters} facets={facets} placement="header" onToggle={toggle} />
            {/* Always rendered, so the chips don't shift when filters are added or removed. */}
            <button
              type="button"
              disabled={!hasFilters}
              onClick={() => onChange(EMPTY_PORTFOLIO_FILTERS)}
              className="ml-2 cursor-pointer whitespace-nowrap text-sm text-accent underline underline-offset-4 disabled:cursor-not-allowed disabled:text-muted disabled:no-underline"
            >
              Clear all
            </button>
          </div>,
          headerSlot
        )}

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
