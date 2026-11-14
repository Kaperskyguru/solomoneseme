import { existsSync } from "node:fs";
import { mkdir, open, readFile, rename, rm } from "node:fs/promises";
import path from "node:path";
import type { Snapshot } from "./types";

export const LOCAL_FILE = ".snapshot.local.json";

/** Production storage: a JSON file on a persistent volume (Coolify mounts /app/data). */
export function snapshotFile(): string {
  return process.env.SNAPSHOT_FILE || path.join(process.cwd(), "data", "snapshot.json");
}

export async function readSnapshot(): Promise<Snapshot | null> {
  // Dev only; SNAPSHOT_LOCAL beats SNAPSHOT_SAMPLE.
  if (process.env.NODE_ENV !== "production" && process.env.SNAPSHOT_LOCAL === "1") {
    const file = path.join(process.cwd(), LOCAL_FILE);
    if (existsSync(file)) return JSON.parse(await readFile(file, "utf8")) as Snapshot;
  }
  if (process.env.NODE_ENV !== "production" && process.env.SNAPSHOT_SAMPLE === "1") {
    const file = path.join(process.cwd(), "tests/fixtures/snapshot.sample.json");
    return JSON.parse(await readFile(file, "utf8")) as Snapshot;
  }
  try {
    return JSON.parse(await readFile(snapshotFile(), "utf8")) as Snapshot;
  } catch (err) {
    // Missing file is the normal first-run state; anything else is worth a log. The page must still render.
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") console.error("readSnapshot failed", err);
    return null;
  }
}

/** Atomic write: temp file in the same directory, then rename. */
export async function writeSnapshot(s: Snapshot): Promise<void> {
  const file = snapshotFile();
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}-${Date.now()}`;
  try {
    const fh = await open(tmp, "w", 0o644);
    try {
      await fh.writeFile(JSON.stringify(s));
      await fh.sync(); // durable before the rename makes it visible
    } finally {
      await fh.close();
    }
    await rename(tmp, file);
  } catch (err) {
    await rm(tmp, { force: true }).catch(() => {});
    throw err;
  }
}

export type RefreshRead = { status: "missing" } | { status: "ok"; snapshot: Snapshot };

/** For the refresh job: "missing" when the file does not exist or was corrupt (quarantined); other failures throw. */
export async function readSnapshotForRefresh(): Promise<RefreshRead> {
  let raw: string;
  try {
    raw = await readFile(snapshotFile(), "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return { status: "missing" };
    throw err;
  }
  try {
    return { status: "ok", snapshot: JSON.parse(raw) as Snapshot };
  } catch (err) {
    if (!(err instanceof SyntaxError)) throw err;
    // Quarantine so the next refresh rebuilds instead of failing forever; keep the bytes for inspection.
    const file = snapshotFile();
    const dest = `${file}.corrupt-${Date.now()}`;
    await rename(file, dest);
    console.error("snapshot-corrupt: quarantined", path.basename(dest));
    return { status: "missing" };
  }
}
