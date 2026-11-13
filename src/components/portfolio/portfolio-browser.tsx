"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useHeaderFilter } from "@/components/header-filter";
import { PortfolioFilterBar } from "@/components/portfolio/portfolio-filter-bar";

import { PortfolioGrid } from "@/components/portfolio/portfolio-grid";
import {
  EMPTY_PORTFOLIO_FILTERS,
  parsePortfolioFilters,
  portfolioSearchParams,
  type PortfolioCard,
  type PortfolioFacets,
  type PortfolioFilters,
  type PortfolioPageResponse,
} from "@/lib/portfolio-filters";

const BASE_PATH = "/portfolio";
const RETURN_KEY = "portfolio-return";
const RETURN_TTL_MS = 30 * 60 * 1000;
const TITLE_ID = "portfolio";
const ARTWORKS_ID = "portfolio-artworks";

type ReturnRecord = { index: number; slug: string; query: string; savedAt: number };

// Set by back/forward navigation. A visit from a link should start at the top, so the flag is checked on mount.
let arrivedByHistory = false;
if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    arrivedByHistory = true;
  });
}

// Deferred a frame so a mobile drawer has unlocked the page before scrolling.
function scrollToSection(id: string) {
  requestAnimationFrame(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(id)?.scrollIntoView({ block: "start", behavior: reduceMotion ? "auto" : "smooth" });
  });
}

async function fetchPage(
  filters: PortfolioFilters,
  page: number,
  signal: AbortSignal,
  seed: string
): Promise<PortfolioPageResponse> {
  const params = portfolioSearchParams(filters);
  params.set("page", String(page));
  params.set("seed", seed);
  const response = await fetch(`/api/portfolio/artworks?${params.toString()}`, { signal });
  if (!response.ok) throw new Error(`Request failed with ${response.status}`);
  return response.json();
}

async function fetchFacets(filters: PortfolioFilters, signal: AbortSignal): Promise<PortfolioFacets> {
  const response = await fetch(`/api/portfolio/facets?${portfolioSearchParams(filters).toString()}`, { signal });
  if (!response.ok) throw new Error(`Request failed with ${response.status}`);
  return response.json();
}

function appendUnique(current: PortfolioCard[], next: PortfolioCard[]) {
  const seen = new Set(current.map((item) => item.slug));
  return [...current, ...next.filter((item) => !seen.has(item.slug))];
}

function writeUrl(filters: PortfolioFilters) {
  const query = portfolioSearchParams(filters).toString();
  // Pass the router's current history state back in, otherwise back navigation stops working.
  window.history.replaceState(window.history.state, "", query ? `${BASE_PATH}?${query}` : BASE_PATH);
}

function readReturnRecord(): ReturnRecord | null {
  try {
    const raw = sessionStorage.getItem(RETURN_KEY);
    return raw ? (JSON.parse(raw) as ReturnRecord) : null;
  } catch {
    return null;
  }
}

function clearReturnRecord() {
  try {
    sessionStorage.removeItem(RETURN_KEY);
  } catch {
    // Storage can be unavailable (private mode); losing the saved position is harmless.
  }
}

type PortfolioBrowserProps = {
  initialFilters: PortfolioFilters;
  initialFacets: PortfolioFacets;
  initialPage: PortfolioPageResponse;
};

export function PortfolioBrowser({ initialFilters, initialFacets, initialPage }: PortfolioBrowserProps) {
  const { active: headerFilterActive } = useHeaderFilter();
  const [filters, setFilters] = useState(initialFilters);
  const [facets, setFacets] = useState(initialFacets);
  const [items, setItems] = useState(initialPage.items);
  const [hasMore, setHasMore] = useState(initialPage.hasMore);
  const [total, setTotal] = useState(initialPage.total);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  // The list lives in a ref as well, so callbacks always read the latest values without re-subscribing.
  const listRef = useRef({
    filters: initialFilters,
    items: initialPage.items,
    page: initialPage.page,
    hasMore: initialPage.hasMore,
  });
  const controllerRef = useRef<AbortController | null>(null);
  // Fixed for this visit so every page comes from the same order.
  const seedRef = useRef(initialPage.seed);
  const failedFilterRef = useRef(false);
  const mountedRef = useRef(false);
  const syncStartedRef = useRef(false);
  const pendingScrollRef = useRef<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Only one list request runs at a time. A filter change cancels whatever is in flight.
  const begin = useCallback(() => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    return controller;
  }, []);

  const release = useCallback((controller: AbortController) => {
    if (controllerRef.current === controller) controllerRef.current = null;
  }, []);

  const commitList = useCallback(
    (list: { filters: PortfolioFilters; items: PortfolioCard[]; page: number; hasMore: boolean }) => {
      listRef.current = list;
      setItems(list.items);
      setHasMore(list.hasMore);
    },
    []
  );

  // Fetches page 1 and the facets for a filter set. With a saved card, keeps paging until that card is loaded.
  const loadFrom = useCallback(
    async (next: PortfolioFilters, restore?: ReturnRecord) => {
      const controller = begin();
      try {
        const [first, nextFacets] = await Promise.all([
          fetchPage(next, 1, controller.signal, seedRef.current),
          fetchFacets(next, controller.signal),
        ]);
        let loaded = first.items;
        let page = 1;
        let more = first.hasMore;
        if (restore) {
          while (loaded.length <= restore.index && more) {
            const data = await fetchPage(next, page + 1, controller.signal, seedRef.current);
            page = data.page;
            loaded = appendUnique(loaded, data.items);
            more = data.hasMore;
          }
        }
        if (controller.signal.aborted || !mountedRef.current) return;
        failedFilterRef.current = false;
        // A copy forces a re-render even when nothing new loaded, so the scroll effect below always runs.
        commitList({ filters: next, items: [...loaded], page, hasMore: more });
        setFilters(next);
        setTotal(first.total);
        setFacets(nextFacets);
        if (restore) pendingScrollRef.current = restore.slug;
        setStatus("idle");
      } catch {
        if (!controller.signal.aborted) {
          failedFilterRef.current = true;
          setStatus("error");
        }
      } finally {
        release(controller);
      }
    },
    [begin, release, commitList]
  );

  const applyFilters = useCallback(
    (next: PortfolioFilters) => {
      setFilters(next);
      writeUrl(next);
      clearReturnRecord();
      setStatus("loading");
      void loadFrom(next);
      // While the desktop header shows the filter, scrolling up to the title would bring the chip row back under the header and close it. Scroll to the artworks instead.
      scrollToSection(headerFilterActive ? ARTWORKS_ID : TITLE_ID);
    },
    [loadFrom, headerFilterActive]
  );


  const loadMore = useCallback(async () => {
    if (controllerRef.current || !listRef.current.hasMore) return;
    const controller = begin();
    const current = listRef.current;
    const nextPage = current.page + 1;
    setStatus("loading");
    try {
      const data = await fetchPage(current.filters, nextPage, controller.signal, seedRef.current);
      if (controller.signal.aborted) return;
      failedFilterRef.current = false;
      commitList({
        filters: current.filters,
        items: appendUnique(current.items, data.items),
        page: nextPage,
        hasMore: data.hasMore,
      });
      setStatus("idle");
    } catch {
      if (!controller.signal.aborted) setStatus("error");
    } finally {
      release(controller);
    }
  }, [begin, release, commitList]);

  useEffect(() => {
    // Strict mode runs effects twice in development. Only the first run should sync.
    if (syncStartedRef.current) return;
    syncStartedRef.current = true;
    // Back navigation can show a cached render with the filters from the first visit. The URL is the source of truth.
    const urlFilters = parsePortfolioFilters(new URLSearchParams(window.location.search));
    const urlQuery = portfolioSearchParams(urlFilters).toString();
    const cameBack = arrivedByHistory;
    arrivedByHistory = false;
    const record = readReturnRecord();
    clearReturnRecord();
    const restore =
      cameBack && record && record.query === urlQuery && Date.now() - record.savedAt <= RETURN_TTL_MS
        ? record
        : undefined;
    const differs = urlQuery !== portfolioSearchParams(initialFilters).toString();
    if (!differs && !restore) return;
    // Deferred so the effect body doesn't set state synchronously.
    queueMicrotask(() => void loadFrom(urlFilters, restore));
  }, [loadFrom, initialFilters]);

  useEffect(() => {
    const slug = pendingScrollRef.current;
    if (!slug) return;
    pendingScrollRef.current = null;
    document.getElementById(`artwork-${slug}`)?.scrollIntoView({ block: "center" });
  }, [items]);

  const rememberArtwork = useCallback((index: number, slug: string) => {
    const record: ReturnRecord = {
      index,
      slug,
      query: portfolioSearchParams(listRef.current.filters).toString(),
      savedAt: Date.now(),
    };
    try {
      sessionStorage.setItem(RETURN_KEY, JSON.stringify(record));
    } catch {
      // Without storage the page still works; it just won't restore the position.
    }
  }, []);

  const onChange = useCallback(
    (next: PortfolioFilters) => {
      void applyFilters(next);
    },
    [applyFilters]
  );

  const onRetry = useCallback(() => {
    if (failedFilterRef.current) void applyFilters(listRef.current.filters);
    else void loadMore();
  }, [applyFilters, loadMore]);

  const onClearFilters = useCallback(() => {
    void applyFilters(EMPTY_PORTFOLIO_FILTERS);
  }, [applyFilters]);

  return (
    <div className="flex flex-col gap-8">
      <PortfolioFilterBar filters={filters} facets={facets} total={total} onChange={onChange} />
      <div id={ARTWORKS_ID} className="scroll-mt-24">
        <PortfolioGrid
          items={items}
          hasMore={hasMore}
          status={status}
          total={total}
          filters={filters}
          onLoadMore={loadMore}
          onRetry={onRetry}
          onSelect={rememberArtwork}
          onClearFilters={onClearFilters}
        />
      </div>
    </div>
  );
}
