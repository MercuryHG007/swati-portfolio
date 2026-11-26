export const PAGE_SIZES = [20, 50] as const;
export type PageSize = (typeof PAGE_SIZES)[number];
export const DEFAULT_PAGE_SIZE: PageSize = 20;

// Invalid URL values fall back to the default instead of breaking the list.
export function parseChoice<T extends string>(value: string | null, choices: readonly T[], fallback: T): T {
  return value !== null && (choices as readonly string[]).includes(value) ? (value as T) : fallback;
}

export function parsePage(value: string | null) {
  const page = Number(value);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

export function parsePageSize(value: string | null): PageSize {
  const size = Number(value);
  return (PAGE_SIZES as readonly number[]).includes(size) ? (size as PageSize) : DEFAULT_PAGE_SIZE;
}

// Clamps the requested page so a page emptied by a delete or filter change still shows real results.
export function paginate<T>(items: T[], requestedPage: number, size: number) {
  const pageCount = Math.max(1, Math.ceil(items.length / size));
  const page = Math.min(Math.max(1, requestedPage), pageCount);
  const start = (page - 1) * size;
  return {
    pageItems: items.slice(start, start + size),
    page,
    pageCount,
    rangeStart: items.length === 0 ? 0 : start + 1,
    rangeEnd: Math.min(start + size, items.length),
  };
}
