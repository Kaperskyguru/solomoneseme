import { afterEach, beforeEach, expect, it, vi } from "vitest";

vi.mock("@/lib/snapshot/build", () => ({ buildSnapshot: vi.fn() }));
vi.mock("@/lib/snapshot/store", () => ({ writeSnapshot: vi.fn(), readSnapshot: vi.fn() }));
vi.mock("node:fs/promises", () => ({ readFile: vi.fn() }));

import { readFile } from "node:fs/promises";
import { buildSnapshot } from "@/lib/snapshot/build";
import { readSnapshot, writeSnapshot } from "@/lib/snapshot/store";
import { getSnapshot, MAX_AGE_MS, refreshSnapshot, RETRY_AFTER_MS } from "@/lib/snapshot/refresh";

const snap = (generatedAt: string) => ({ generatedAt, revenue: {}, books: [], newsletter: [], blog: [], sections: {} });
let clock = Date.now();
const settleAll = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  // Each test starts past the retry window of the previous test's attempt.
  clock += 2 * RETRY_AFTER_MS;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(clock);
  vi.mocked(buildSnapshot).mockResolvedValue(snap("new") as never);
  vi.mocked(writeSnapshot).mockResolvedValue(undefined);
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(async () => {
  await settleAll();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

it("a failed or unwritable build is not retried on every visit: at most once per retry window", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(readSnapshot).mockResolvedValue(null);
  vi.mocked(readFile).mockResolvedValue(JSON.stringify(snap("seed")) as never);
  vi.mocked(writeSnapshot).mockRejectedValue(new Error("EACCES"));
  await getSnapshot();
  await settleAll();
  await getSnapshot();
  await getSnapshot();
  expect(buildSnapshot).toHaveBeenCalledOnce();
  vi.setSystemTime(Date.now() + RETRY_AFTER_MS);
  await getSnapshot();
  expect(buildSnapshot).toHaveBeenCalledTimes(2);
});

it("an unparseable generatedAt is treated as stale but still bounded by the retry window", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.mocked(readSnapshot).mockResolvedValue(snap("garbage") as never);
  await getSnapshot();
  await settleAll();
  await getSnapshot();
  expect(buildSnapshot).toHaveBeenCalledOnce();
});

it("runs one build at a time, then build → write; a later call starts a new run", async () => {
  let release!: () => void;
  vi.mocked(buildSnapshot).mockImplementation(() => new Promise((r) => { release = () => r(snap("x") as never); }));
  const a = refreshSnapshot();
  const b = refreshSnapshot();
  expect(a).toBe(b);
  expect(buildSnapshot).toHaveBeenCalledOnce();
  release();
  await a;
  expect(writeSnapshot).toHaveBeenCalledOnce();
  vi.mocked(buildSnapshot).mockResolvedValue(snap("y") as never);
  await refreshSnapshot();
  expect(buildSnapshot).toHaveBeenCalledTimes(2);
});

it("a write error is logged with a fixed label (no path leak) and never throws", async () => {
  const err = vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(writeSnapshot).mockRejectedValue(new Error("EACCES /secret/path"));
  await expect(refreshSnapshot()).resolves.toBeUndefined();
  expect(err).toHaveBeenCalledWith("refresh: snapshot-write");
  expect(JSON.stringify(err.mock.calls)).not.toContain("secret/path");
});

it("a build error is logged and nothing is written", async () => {
  const err = vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(buildSnapshot).mockRejectedValue(new Error("boom"));
  await refreshSnapshot();
  expect(err).toHaveBeenCalledWith("refresh: snapshot-read");
  expect(writeSnapshot).not.toHaveBeenCalled();
});

it("production, no stored data: returns the seed at once and starts a build", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.mocked(readSnapshot).mockResolvedValue(null);
  let release!: () => void;
  vi.mocked(buildSnapshot).mockImplementation(() => new Promise((r) => { release = () => r(snap("new") as never); })); // page must not wait on it
  vi.mocked(readFile).mockResolvedValue(JSON.stringify(snap("seed")) as never);
  expect((await getSnapshot())?.generatedAt).toBe("seed");
  expect(buildSnapshot).toHaveBeenCalledOnce();
  release();
  await refreshSnapshot();
});

it("production, fresh data: returned as is, no build", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.mocked(readSnapshot).mockResolvedValue(snap(new Date().toISOString()) as never);
  await getSnapshot();
  expect(buildSnapshot).not.toHaveBeenCalled();
});

it("production, stale data: returned as is and a background build starts", async () => {
  vi.stubEnv("NODE_ENV", "production");
  const old = new Date(Date.now() - MAX_AGE_MS - 1000).toISOString();
  vi.mocked(readSnapshot).mockResolvedValue(snap(old) as never);
  expect((await getSnapshot())?.generatedAt).toBe(old);
  expect(buildSnapshot).toHaveBeenCalledOnce();
});

it("development never calls the providers", async () => {
  vi.stubEnv("NODE_ENV", "development");
  vi.mocked(readSnapshot).mockResolvedValue(null);
  expect(await getSnapshot()).toBeNull();
  expect(buildSnapshot).not.toHaveBeenCalled();
});
