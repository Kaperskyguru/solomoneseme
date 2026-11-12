import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { buildSnapshot } from "../lib/snapshot/build";
import { snapshotFile, writeSnapshot } from "../lib/snapshot/store";
import type { Snapshot } from "../lib/snapshot/types";

// Writes the same file the page reads (data/snapshot.json, or SNAPSHOT_FILE), so a dev server shows
// real data with no flags. Same atomic write the production refresh uses.
const file = snapshotFile();
const prev = existsSync(file) ? (JSON.parse(await readFile(file, "utf8")) as Snapshot) : null;
const snap = await buildSnapshot(new Date(), { prev });
await writeSnapshot(snap);

console.log(`wrote ${file}`);
console.log(`generatedAt: ${snap.generatedAt}`);
for (const [name, s] of Object.entries(snap.sections)) console.log(`${name}: ${s.error ? `error: ${s.error}` : "ok"}`);
