import { AsyncLocalStorage } from "node:async_hooks";
import { connectToDatabase } from "@/lib/mongodb";
import { decodeSnapshotValue, readContentSnapshot } from "@/lib/snapshot-store";
import { Artwork } from "@/models";

// After a live failure, skip the database for this long and serve from the snapshot right away.
const BREAKER_MS = 60_000;
let breakerOpenUntil = 0;

const liveOnlyStore = new AsyncLocalStorage<true>();

// Used when building the snapshot: the live database must answer, and a stale snapshot must never be captured.
export function withLiveOnly<T>(fn: () => Promise<T>): Promise<T> {
  return liveOnlyStore.run(true, fn);
}

function isEmptyResult(value: unknown) {
  return value === null || value === undefined || (Array.isArray(value) && value.length === 0);
}

// A reachable database with no published artworks at all looks wiped. A single unpublished piece or an empty
// list does not, so those are honoured and admin changes show straight away.
export async function databaseHasNoPublishedArtworks() {
  try {
    await connectToDatabase();
    return !(await Artwork.exists({ status: "published" }));
  } catch {
    return false;
  }
}

// True while a recent database failure has the breaker open, so reads are served from the snapshot.
export function databaseBreakerOpen() {
  return Date.now() < breakerOpenUntil;
}

export type Fallback<T> = { found: true; value: T } | { found: false };

export async function readSnapshotEntry<T>(name: string, args: unknown[]): Promise<Fallback<T>> {
  const snapshot = await readContentSnapshot();
  const text = snapshot?.entries[`${name}:${JSON.stringify(args)}`];
  if (text === undefined) return { found: false };
  return { found: true, value: decodeSnapshotValue(text) as T };
}

// Shared by the single-record getters and the portfolio listings. The live query runs first. A failure opens
// the breaker, and the snapshot is served until it closes. A reachable database with no published artworks
// while the snapshot has content is treated as wiped, so the snapshot is served.
export async function serveWithFallback<T>(options: {
  label: string;
  live: () => Promise<T>;
  fromSnapshot: () => Promise<Fallback<T>>;
  isEmpty: (value: T) => boolean;
}): Promise<T> {
  if (liveOnlyStore.getStore()) return options.live();

  if (Date.now() < breakerOpenUntil) {
    const fallback = await options.fromSnapshot();
    if (fallback.found) return fallback.value;
    // Nothing to serve and the database is known to be down, so fail now rather than wait for another timeout.
    throw new Error(`${options.label}: database unavailable and no snapshot entry for these arguments`);
  }

  let live: T;
  try {
    live = await options.live();
  } catch (err) {
    breakerOpenUntil = Date.now() + BREAKER_MS;
    console.error(`[content] ${options.label} failed; serving snapshot if available.`, err);
    const fallback = await options.fromSnapshot();
    if (fallback.found) return fallback.value;
    throw err;
  }

  if (options.isEmpty(live)) {
    const fallback = await options.fromSnapshot();
    if (fallback.found && !options.isEmpty(fallback.value) && (await databaseHasNoPublishedArtworks())) {
      console.warn(`[content] ${options.label}: database has no published artworks; serving snapshot.`);
      return fallback.value;
    }
  }

  return live;
}

// Wraps a public read query. Live result first. If the database fails, the last snapshot is served.
// If the database answers but has no published artworks while the snapshot has content, it is treated as wiped
// and the snapshot is served instead.
export function resilient<A extends unknown[], R>(name: string, query: (...args: A) => Promise<R>) {
  return (...args: A): Promise<R> =>
    serveWithFallback<R>({
      label: name,
      live: () => query(...args),
      fromSnapshot: () => readSnapshotEntry<R>(name, args),
      isEmpty: isEmptyResult,
    });
}
