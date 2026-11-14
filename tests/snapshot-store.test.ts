import { writeFileSync, rmSync, existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";

import { readSnapshot } from "@/lib/snapshot/store";

// Isolate from any real data/snapshot.json in the working tree: point the default store at a path that never exists.
beforeEach(() => { vi.stubEnv("SNAPSHOT_FILE", path.join(mkdtempSync(path.join(tmpdir(), "snap-")), "none.json")); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

const LOCAL = ".snapshot.local.json";
describe("readSnapshot local snapshot", () => {
  const had = existsSync(LOCAL);
  afterEach(() => { if (!had) rmSync(LOCAL, { force: true }); });
  it("dev + flag returns the local file, beating the sample flag", async () => {
    if (had) return; // never clobber the owner's real snapshot
    writeFileSync(LOCAL, JSON.stringify({ generatedAt: "local-marker" }));
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("SNAPSHOT_LOCAL", "1");
    vi.stubEnv("SNAPSHOT_SAMPLE", "1");
    expect((await readSnapshot())?.generatedAt).toBe("local-marker");
  });
  it("production + flag never reads it", async () => {
    if (had) return;
    writeFileSync(LOCAL, JSON.stringify({ generatedAt: "local-marker" }));
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SNAPSHOT_LOCAL", "1");
    expect(await readSnapshot()).toBeNull();
  });
  it("dev + flag + missing file falls through to the sample", async () => {
    if (had) return;
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("SNAPSHOT_LOCAL", "1");
    vi.stubEnv("SNAPSHOT_SAMPLE", "1");
    expect((await readSnapshot())?.youtube?.subscribers).toBe(12345);
  });
});

describe("readSnapshot", () => {
  it("returns sample in non-production with flag", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("SNAPSHOT_SAMPLE", "1");
    const s = await readSnapshot();
    expect(s?.youtube?.subscribers).toBe(12345);
  });
  it("does not return sample in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SNAPSHOT_SAMPLE", "1");
    expect(await readSnapshot()).toBeNull();
  });
  it("returns null with no token", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("SNAPSHOT_SAMPLE", "");
    expect(await readSnapshot()).toBeNull();
  });
  it("returns null when the snapshot file is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SNAPSHOT_FILE", path.join(tmpdir(), "no-such-dir-xyz", "snapshot.json"));
    expect(await readSnapshot()).toBeNull();
  });
  it("returns null (and logs) on corrupt JSON, never throws", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "snap-"));
    writeFileSync(path.join(dir, "s.json"), "not json");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SNAPSHOT_FILE", path.join(dir, "s.json"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await readSnapshot()).toBeNull();
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });
  it("reads the snapshot file in production", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "snap-"));
    writeFileSync(path.join(dir, "s.json"), JSON.stringify({ generatedAt: "from-file" }));
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SNAPSHOT_FILE", path.join(dir, "s.json"));
    expect((await readSnapshot())?.generatedAt).toBe("from-file");
  });
});
