import { afterEach, expect, it, vi } from "vitest";
import { fetchMbStats } from "@/lib/content/mbstats";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status });

it("returns learners only, ignoring extra fields", async () => {
  vi.stubEnv("MB_API_URL", "http://api.test/api/v3");
  const f = vi.fn().mockResolvedValue(json({ success: true, data: { learners: 12400, countries: 54, updatedAt: "x" } }));
  vi.stubGlobal("fetch", f);
  expect(await fetchMbStats()).toEqual({ learners: 12400 });
  expect(f.mock.calls[0][0]).toBe("http://api.test/api/v3/public/stats");
});

it("throws with the status only on non-2xx", async () => {
  vi.stubEnv("MB_API_URL", "http://secret-host.test/api/v3");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({}, 502)));
  const e = (await fetchMbStats().catch((x) => x)) as Error;
  expect(e.message).toBe("MasteringBackend stats failed with status 502");
  expect(e.message).not.toContain("secret-host");
});

it.each([
  ["missing data", { success: true }],
  ["negative", { data: { learners: -1 } }],
  ["string", { data: { learners: "5" } }],
  ["non-finite", { data: { learners: null } }],
])("rejects a bad shape: %s", async (_n, body) => {
  vi.stubEnv("MB_API_URL", "http://api.test/api/v3");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(body)));
  await expect(fetchMbStats()).rejects.toThrow("MasteringBackend stats returned an unexpected response");
});

it("rejects a non-JSON body", async () => {
  vi.stubEnv("MB_API_URL", "http://api.test/api/v3");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>", { status: 200 })));
  await expect(fetchMbStats()).rejects.toThrow("MasteringBackend stats returned an unexpected response");
});

it("throws a clear error when MB_API_URL is missing, without fetching", async () => {
  vi.stubEnv("MB_API_URL", "");
  const f = vi.fn();
  vi.stubGlobal("fetch", f);
  await expect(fetchMbStats()).rejects.toThrow("MB_API_URL is not set");
  expect(f).not.toHaveBeenCalled();
});
