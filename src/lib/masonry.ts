import type { PortfolioCard } from "@/lib/portfolio-filters";

// Matches the column sizing observed on Pinterest: fit as many ~220px columns as the container allows.
// Desktop uses wider columns and a cap, so a small catalogue doesn't spread over too many near-empty columns.
export const MASONRY_TARGET_WIDTH = 220;
export const DESKTOP_TARGET_WIDTH = 280;
export const DESKTOP_MIN_WIDTH = 1024;
export const DESKTOP_MAX_COLUMNS = 5;
export const MASONRY_GUTTER = 16;

// Height ÷ width. Keeps very narrow or very wide works from producing extreme tiles.
const MIN_HEIGHT_RATIO = 0.5;
const MAX_HEIGHT_RATIO = 2;
// The 4:5 box used before dimensions were available.
const FALLBACK_HEIGHT_RATIO = 1.25;

export function columnCountFor(containerWidth: number) {
  const desktop = containerWidth >= DESKTOP_MIN_WIDTH;
  const target = desktop ? DESKTOP_TARGET_WIDTH : MASONRY_TARGET_WIDTH;
  const count = Math.max(2, Math.floor((containerWidth + MASONRY_GUTTER) / (target + MASONRY_GUTTER)));
  return desktop ? Math.min(count, DESKTOP_MAX_COLUMNS) : count;
}

export function columnWidthFor(containerWidth: number, count: number) {
  return Math.max(0, (containerWidth - (count - 1) * MASONRY_GUTTER) / count);
}

export function heightRatio(artwork: Pick<PortfolioCard, "image">) {
  const width = artwork.image?.width;
  const height = artwork.image?.height;
  if (!width || !height) return FALLBACK_HEIGHT_RATIO;
  return Math.min(MAX_HEIGHT_RATIO, Math.max(MIN_HEIGHT_RATIO, height / width));
}

// Greedy shortest-column placement. Each item goes to the currently shortest column, so appending items
// never moves the ones already placed.
export function distributeIntoColumns<T>(items: T[], count: number, ratioOf: (item: T) => number) {
  const columns = Array.from({ length: count }, () => ({ height: 0, entries: [] as { item: T; index: number }[] }));
  items.forEach((item, index) => {
    let shortest = columns[0];
    for (const column of columns) {
      if (column.height < shortest.height) shortest = column;
    }
    shortest.entries.push({ item, index });
    shortest.height += ratioOf(item);
  });
  return columns.map((column) => column.entries);
}
