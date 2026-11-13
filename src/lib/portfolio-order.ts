// Shared by the server queries and the client, so this module must not import server-only code.

const SEED_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// The order changes at midnight in the site's timezone. Every request on the same day gets the same order,
// which keeps paging, caching, and back-navigation consistent.
export function dailySeed(now: Date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function parseSeed(value: string | null | undefined) {
  return value && SEED_PATTERN.test(value) ? value : undefined;
}

// FNV-1a hash of the seed, used to start the generator below.
function hashSeed(seed: string) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

// mulberry32: a small seeded generator, so the same seed always produces the same sequence.
function createRandom(seed: string) {
  let state = hashSeed(seed);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Returns a new array in a seeded random order. The input is sorted first, so the result depends only on the
// set of items and the seed, not on the order they were fetched in.
export function seededShuffle<T>(items: readonly T[], seed: string, key: (item: T) => string): T[] {
  const result = [...items].sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));
  const random = createRandom(seed);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
