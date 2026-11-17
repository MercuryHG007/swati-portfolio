import mongoose from "mongoose";
import { getR2Object, isR2Configured, putR2Object, R2_BACKUP_BUCKET } from "@/lib/r2";

const { EJSON } = mongoose.mongo.BSON;

export const SNAPSHOT_PREFIX = "content/";
const MEMO_MS = 5 * 60_000;

// Keyed by database name, so production and UAT (separate databases) can share one bucket without
// overwriting each other's snapshots. Taken from the URI because the snapshot is read while the DB is down.
function snapshotKey() {
  const dbName = (process.env.MONGODB_URI ?? "").split("?")[0].split("/").pop() || "default";
  return `${SNAPSHOT_PREFIX}${dbName}/snapshot.json`;
}

// Results of the public read queries, captured while the database was healthy. Each value is EJSON so
// ObjectIds and Dates come back with their original types.
export type ContentSnapshot = {
  generatedAt: string;
  artworkCount: number;
  entries: Record<string, string>;
};

let memo: { at: number; snapshot: ContentSnapshot | null } | null = null;

async function loadSnapshot(): Promise<ContentSnapshot | null> {
  if (!isR2Configured() || !R2_BACKUP_BUCKET) return null;
  const body = await getR2Object(R2_BACKUP_BUCKET, snapshotKey());
  if (!body) return null;
  return JSON.parse(body.toString("utf8")) as ContentSnapshot;
}

export async function readContentSnapshot(): Promise<ContentSnapshot | null> {
  if (memo && Date.now() - memo.at < MEMO_MS) return memo.snapshot;
  try {
    const snapshot = await loadSnapshot();
    memo = { at: Date.now(), snapshot };
    return snapshot;
  } catch (err) {
    console.error("Content snapshot unavailable:", err);
    return null;
  }
}

// Refuses to replace a snapshot that has published artworks with one that has none. That is the
// signature of an emptied database, and the last good snapshot is the copy we want to keep.
export async function writeContentSnapshot(snapshot: ContentSnapshot) {
  if (!R2_BACKUP_BUCKET) throw new Error("Missing R2_BACKUP_BUCKET environment variable");
  const previous = await loadSnapshot();
  if (previous && previous.artworkCount > 0 && snapshot.artworkCount === 0) {
    throw new Error("Refusing to overwrite a snapshot with published artworks by an empty one");
  }
  await putR2Object(R2_BACKUP_BUCKET, snapshotKey(), JSON.stringify(snapshot), "application/json");
  memo = { at: Date.now(), snapshot };
}

export function encodeSnapshotValue(value: unknown) {
  return EJSON.stringify(value);
}

export function decodeSnapshotValue(text: string): unknown {
  return EJSON.parse(text);
}
