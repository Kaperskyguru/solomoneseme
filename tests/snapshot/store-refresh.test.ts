import { mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { readSnapshotForRefresh, writeSnapshot } from "@/lib/snapshot/store";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "snap-"));
  vi.stubEnv("SNAPSHOT_FILE", path.join(dir, "nested", "snapshot.json"));
});
afterEach(() => { vi.unstubAllEnvs(); });

it("missing only when the file does not exist", async () => {
  expect(await readSnapshotForRefresh()).toEqual({ status: "missing" });
});
it("quarantines a corrupt file and reports missing", async () => {
  const bad = path.join(dir, "bad.json");
  vi.stubEnv("SNAPSHOT_FILE", bad);
  writeFileSync(bad, "not json");
  const err = vi.spyOn(console, "error").mockImplementation(() => {});
  expect(await readSnapshotForRefresh()).toEqual({ status: "missing" });
  err.mockRestore();
  const files = readdirSync(dir);
  expect(files).not.toContain("bad.json");
  const q = files.find((f) => f.startsWith("bad.json.corrupt-"))!;
  expect(readFileSync(path.join(dir, q), "utf8")).toBe("not json");
});
it("throws on non-ENOENT read errors", async () => {
  // A directory at the file path yields EISDIR, not ENOENT.
  vi.stubEnv("SNAPSHOT_FILE", dir);
  await expect(readSnapshotForRefresh()).rejects.toThrow();
});
it("write creates the directory, is atomic (no temp left) and round-trips", async () => {
  await writeSnapshot({ generatedAt: "g" } as never);
  const file = path.join(dir, "nested", "snapshot.json");
  expect(JSON.parse(readFileSync(file, "utf8"))).toEqual({ generatedAt: "g" });
  expect(statSync(file).mode & 0o777).toBe(0o644);
  expect(readdirSync(path.join(dir, "nested"))).toEqual(["snapshot.json"]);
  expect(await readSnapshotForRefresh()).toEqual({ status: "ok", snapshot: { generatedAt: "g" } });
});
it("a failed write leaves no temp file behind", async () => {
  const file = path.join(dir, "nested", "snapshot.json");
  mkdirSync(file, { recursive: true }); // rename onto a directory fails
  await expect(writeSnapshot({ generatedAt: "g" } as never)).rejects.toThrow();
  expect(readdirSync(path.join(dir, "nested")).filter((f) => f.includes(".tmp-"))).toEqual([]);
});
