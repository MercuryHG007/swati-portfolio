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
async function databaseHasNoPublishedArtworks() {
  try {
    await connectToDatabase();
    return !(await Artwork.exists({ status: "published" }));
  } catch {
    return false;
  }
}

async function fromSnapshot(key: string): Promise<{ found: true; value: unknown } | { found: false }> {
  const snapshot = await readContentSnapshot();
  const text = snapshot?.entries[key];
  if (text === undefined) return { found: false };
  return { found: true, value: decodeSnapshotValue(text) };
}

// Wraps a public read query. Live result first. If the database fails, the last snapshot is served.
// If the database answers but has no published artworks while the snapshot has content, it is treated as wiped
// and the snapshot is served instead.
export function resilient<A extends unknown[], R>(name: string, query: (...args: A) => Promise<R>) {
  return async (...args: A): Promise<R> => {
    if (liveOnlyStore.getStore()) return query(...args);

    const key = `${name}:${JSON.stringify(args)}`;

    if (Date.now() < breakerOpenUntil) {
      const fallback = await fromSnapshot(key);
      if (fallback.found) return fallback.value as R;
      // Nothing to serve and the database is known to be down, so fail now rather than wait for another timeout.
      throw new Error(`${name}: database unavailable and no snapshot entry for these arguments`);
    }

    let live: R;
    try {
      live = await query(...args);
    } catch (err) {
      breakerOpenUntil = Date.now() + BREAKER_MS;
      console.error(`[content] ${name} failed; serving snapshot if available.`, err);
      const fallback = await fromSnapshot(key);
      if (fallback.found) return fallback.value as R;
      throw err;
    }

    if (isEmptyResult(live)) {
      const fallback = await fromSnapshot(key);
      if (fallback.found && !isEmptyResult(fallback.value) && (await databaseHasNoPublishedArtworks())) {
        console.warn(`[content] ${name}: database has no published artworks; serving snapshot.`);
        return fallback.value as R;
      }
    }

    return live;
  };
}
