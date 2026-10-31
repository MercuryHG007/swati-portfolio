"use client";

import { ChevronDown, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { buttonClasses } from "@/components/button/button";
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

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

type FilterDrawerProps = {
  applied: PortfolioFilters;
  facets: PortfolioFacets;
  onApply: (next: PortfolioFilters) => void;
  onClose: () => void;
};

// Mounted only while open, so every opening starts from the applied filters.
export function FilterDrawer({ applied, facets, onApply, onClose }: FilterDrawerProps) {
  const [draft, setDraft] = useState(applied);
  // Sections that already have a selection start open, so the user can see what is applied.
  const [expanded, setExpanded] = useState<FilterKey[]>(() =>
    visibleFilterKeys(facets).filter((key) => applied[key].length > 0)
  );
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const keys = visibleFilterKeys(facets);
  const draftQuery = portfolioSearchParams(draft).toString();
  const appliedQuery = portfolioSearchParams(applied).toString();
  // Counts for the draft come from the facets endpoint. Each result is tagged with its query, so a late response can't show stale counts.
  const [live, setLive] = useState<{ query: string; facets: PortfolioFacets } | null>(null);
  const shown = draftQuery === appliedQuery ? facets : (live?.facets ?? facets);
  const draftCount = keys.reduce((sum, key) => sum + draft[key].length, 0);
  const draftPills = (Object.keys(FILTER_LABELS) as FilterKey[]).flatMap((key) =>
    draft[key].map((value) => ({ key, value, text: pillText(key, value, shown) }))
  );

  useEffect(() => {
    if (draftQuery === appliedQuery) return;
    const controller = new AbortController();
    // Debounced so fast ticking sends one request, not one per click.
    const timer = window.setTimeout(() => {
      fetch(`/api/portfolio/facets?${draftQuery}`, { signal: controller.signal })
        .then((response) => {
          if (!response.ok) throw new Error(`Request failed with ${response.status}`);
          return response.json() as Promise<PortfolioFacets>;
        })
        .then((next) => setLive({ query: draftQuery, facets: next }))
        .catch(() => {
          // Keep the last known counts; the next change will try again.
        });
    }, 200);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [draftQuery, appliedQuery]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      // Keep Tab and Shift+Tab inside the dialog while it is open.
      const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  function toggleSection(key: FilterKey) {
    setExpanded((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
  }

  function toggleValue(key: FilterKey, value: string) {
    const current = draft[key];
    const values = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
    setDraft({ ...draft, [key]: values });
  }

  function removeValue(key: FilterKey, value: string) {
    setDraft({ ...draft, [key]: draft[key].filter((item) => item !== value) });
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex flex-col bg-background motion-safe:animate-[drawer-up_250ms_ease-out] md:hidden"
    >
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h2 id={titleId} className="text-lg font-medium text-foreground">
          Filters
        </h2>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close filters"
          className="cursor-pointer p-1 text-foreground hover:opacity-60"
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-6">
        {keys.map((key) => {
          const selected = draft[key];
          const isOpen = expanded.includes(key);
          const panelId = `filter-drawer-${key}`;
          return (
            <div key={key} className="border-b border-border">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggleSection(key)}
                className="flex w-full cursor-pointer items-center justify-between py-4 text-left"
              >
                <span className="text-sm font-medium text-foreground">
                  {FILTER_LABELS[key]}
                  {selected.length > 0 && <span className="ml-2 text-accent">· {selected.length}</span>}
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className={`h-4 w-4 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isOpen && (
                <div id={panelId} className="pb-5">
                  <FilterOptions
                    name={key}
                    options={optionsFor(key, shown)}
                    selected={selected}
                    onToggle={(value) => toggleValue(key, value)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-4 border-t border-border bg-background px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <ul className="flex flex-wrap gap-2" aria-label="Selected filters">
            {draftPills.map((pill) => (
              <li key={`${pill.key}-${pill.value}`}>
                <button
                  type="button"
                  onClick={() => removeValue(pill.key, pill.value)}
                  aria-label={`Remove filter: ${pill.text}`}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-accent px-3 py-1.5 text-xs text-accent hover:bg-accent hover:text-accent-foreground"
                >
                  {pill.text}
                  <X aria-hidden="true" className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
          {hasPortfolioFilters(draft) && (
            <button
              type="button"
              onClick={() => setDraft(EMPTY_PORTFOLIO_FILTERS)}
              className="shrink-0 cursor-pointer whitespace-nowrap text-sm text-accent underline underline-offset-4"
            >
              Clear all
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={onClose} className={`${buttonClasses({ variant: "inverse" })} justify-center`}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onApply(draft)}
            className={`${buttonClasses({ variant: "primary" })} justify-center`}
          >
            Apply ({draftCount})
          </button>
        </div>
      </div>
    </div>
  );
}
