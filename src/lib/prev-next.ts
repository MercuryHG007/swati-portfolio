// Pure helper: given an ordered list and the current item's index, find its
// immediate neighbors. No wraparound — the first item has no prev, the last
// has no next. Returns null when there's nothing to page through at all.
export function getPrevNext<T>(items: T[], currentIndex: number): { prev: T | null; next: T | null } | null {
  if (items.length <= 1 || currentIndex === -1) return null;
  const prev = currentIndex > 0 ? items[currentIndex - 1] : null;
  const next = currentIndex < items.length - 1 ? items[currentIndex + 1] : null;
  return { prev, next };
}
