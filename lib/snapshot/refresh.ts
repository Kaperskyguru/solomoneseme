import { readFile } from "node:fs/promises";
import path from "node:path";
import { buildSnapshot } from "./build";
import { readSnapshot, writeSnapshot } from "./store";
import type { Snapshot } from "./types";

/** Data older than this is rebuilt in the background on the next visit. */
export const MAX_AGE_MS = 60 * 60 * 1000;

/** Committed copy of the data, shipped in the image: shown until the first live build finishes. */
export const SEED_FILE = path.join(process.cwd(), "seed", "snapshot.json");

/** After any rebuild attempt (success or failure), visits do not start another one for this long. */
export const RETRY_AFTER_MS = 10 * 60 * 1000;

let inflight: Promise<void> | null = null;
let lastAttemptAt = 0;

async function run(): Promise<void> {
  let snapshot;
  try {
    snapshot = await buildSnapshot(new Date());
  } catch {
    // Previous snapshot unreadable: never overwrite good data with a partial one.
    console.error("refresh: snapshot-read");
    return;
  }
  try {
    await writeSnapshot(snapshot);
  } catch {
    console.error("refresh: snapshot-write"); // writeSnapshot already removed its temp file
    return;
  }
  const failed = Object.entries(snapshot.sections).filter(([, s]) => s.error).map(([name]) => name);
  console.log(`refresh: done, failed sections: ${failed.length ? failed.join(",") : "none"}`);
}

/** Rebuild the data from the providers. At most one build at a time; never throws. */
export function refreshSnapshot(): Promise<void> {
  if (inflight) return inflight;
  lastAttemptAt = Date.now();
  inflight = run().finally(() => {
    inflight = null;
  });
  return inflight;
}

async function readSeed(): Promise<Snapshot | null> {
  try {
    return JSON.parse(await readFile(SEED_FILE, "utf8")) as Snapshot;
  } catch {
    return null;
  }
}

/**
 * What the page renders. Never waits on the providers: returns the stored data (or the seed when none
 * exists yet) and, in production, starts a background rebuild when it is missing or older than MAX_AGE_MS.
 */
export async function getSnapshot(): Promise<Snapshot | null> {
  if (process.env.NODE_ENV !== "production") return readSnapshot();
  const stored = await readSnapshot();
  const age = stored ? Date.now() - Date.parse(stored.generatedAt) : Infinity;
  // Bounded: a failing or unwritable build (or a bad generatedAt) retries at most every RETRY_AFTER_MS.
  if (!(age < MAX_AGE_MS) && Date.now() - lastAttemptAt >= RETRY_AFTER_MS) void refreshSnapshot();
  return stored ?? (await readSeed());
}
