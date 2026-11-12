import { afterEach, expect, it, vi } from "vitest";

vi.mock("@/lib/snapshot/build", () => ({ buildSnapshot: vi.fn() }));
vi.mock("@/lib/snapshot/store", () => ({ writeSnapshot: vi.fn() }));

import { buildSnapshot } from "@/lib/snapshot/build";
import { writeSnapshot } from "@/lib/snapshot/store";
import { GET } from "@/app/api/refresh/route";

afterEach(() => { vi.clearAllMocks(); vi.unstubAllEnvs(); });
const req = (auth?: string) => new Request("http://x/api/refresh", { headers: auth ? { authorization: auth } : {} });
const snap = { generatedAt: "x", revenue: {}, books: [], newsletter: [], blog: [], sections: { blog: { updatedAt: "", error: "secret detail" } } };
const settleAll = () => new Promise((r) => setTimeout(r, 0));

it("rejects a missing or wrong secret with 401 and does nothing", async () => {
  vi.stubEnv("CRON_SECRET", "s3");
  expect((await GET(req())).status).toBe(401);
  expect((await GET(req("Bearer wrong"))).status).toBe(401);
  expect(buildSnapshot).not.toHaveBeenCalled();
});

it("rejects everything when CRON_SECRET is unset or empty", async () => {
  vi.stubEnv("CRON_SECRET", "");
  expect((await GET(req("Bearer "))).status).toBe(401);
  expect((await GET(req("Bearer undefined"))).status).toBe(401);
});

it("202 started, then alreadyRunning while the run is in flight; runs build then write", async () => {
  vi.stubEnv("CRON_SECRET", "s3");
  let release!: () => void;
  vi.mocked(buildSnapshot).mockImplementation(() => new Promise((r) => { release = () => r(snap as never); }));
  const first = await GET(req("Bearer s3"));
  expect(first.status).toBe(202);
  expect(await first.json()).toEqual({ ok: true, started: true });
  const second = await GET(req("Bearer s3"));
  expect(second.status).toBe(202);
  expect(await second.json()).toEqual({ ok: true, alreadyRunning: true });
  expect(buildSnapshot).toHaveBeenCalledOnce();
  release();
  await settleAll();
  expect(writeSnapshot).toHaveBeenCalledOnce();
  // finished: a new request starts a new run
  vi.mocked(buildSnapshot).mockResolvedValue(snap as never);
  expect(await (await GET(req("Bearer s3"))).json()).toEqual({ ok: true, started: true });
  await settleAll();
});

it("a write error does not crash the process and clears the in-flight flag", async () => {
  vi.stubEnv("CRON_SECRET", "s3");
  const err = vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(buildSnapshot).mockResolvedValue(snap as never);
  vi.mocked(writeSnapshot).mockRejectedValue(new Error("EACCES /secret/path"));
  expect((await GET(req("Bearer s3"))).status).toBe(202);
  await settleAll();
  expect(err).toHaveBeenCalledWith("refresh: snapshot-write");
  expect(JSON.stringify(err.mock.calls)).not.toContain("secret/path");
  vi.mocked(writeSnapshot).mockResolvedValue(undefined);
  expect(await (await GET(req("Bearer s3"))).json()).toEqual({ ok: true, started: true });
  await settleAll();
  err.mockRestore();
});

it("a build error is logged with a fixed label and nothing is written", async () => {
  vi.stubEnv("CRON_SECRET", "s3");
  const err = vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(buildSnapshot).mockRejectedValue(new Error("boom"));
  expect((await GET(req("Bearer s3"))).status).toBe(202);
  await settleAll();
  expect(err).toHaveBeenCalledWith("refresh: snapshot-read");
  expect(writeSnapshot).not.toHaveBeenCalled();
  err.mockRestore();
});
