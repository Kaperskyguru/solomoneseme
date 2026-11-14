import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchPaddle } from "@/lib/revenue/providers/paddle";
import t1 from "../fixtures/paddle/transactions-1.json";
import t2 from "../fixtures/paddle/transactions-2.json";
import old from "../fixtures/paddle/transaction-old.json";
import adj from "../fixtures/paddle/adjustments.json";

const src = { provider: "paddle", account: "mb_shared", priceIds: ["pri_prof"] } satisfies Parameters<typeof fetchPaddle>[0];
const since = new Date("2026-10-01T00:00:00Z");
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status });

let urls: string[];
beforeEach(() => {
  urls = [];
  process.env.PADDLE_API_KEY = "pdl_secret";
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      urls.push(url);
      const u = new URL(url);
      if (u.pathname === "/transactions") return json(u.searchParams.get("after") ? t2 : t1);
      if (u.pathname === "/transactions/txn_old") return json(old);
      if (u.pathname === "/adjustments") return json(adj);
      return json({}, 404);
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe("fetchPaddle", () => {
  it("old original is fetched by id; lookup 404 skips, 500 rejects", async () => {
    const out = await fetchPaddle(src, since);
    expect(out.find((t) => t.id === "paddle-adj-adj_old")).toMatchObject({ amountMinor: 1000, kind: "refund" });
    const orig = globalThis.fetch as unknown as (u: string) => Promise<Response>;
    const base = (u: string) => orig(u);
    const mk = (code: number) =>
      vi.fn(async (u: string) => (new URL(u).pathname === "/transactions/txn_old" ? json({}, code) : base(u)));
    vi.stubGlobal("fetch", mk(404));
    expect((await fetchPaddle(src, since)).find((t) => t.id === "paddle-adj-adj_old")).toBeUndefined();
    vi.stubGlobal("fetch", mk(500));
    await expect(fetchPaddle(src, since)).rejects.toThrow(/500/);
  });
  it("throws past the 500-page guard", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ data: [], meta: { pagination: { next: "https://api.paddle.com/transactions?after=x", has_more: true } } })));
    await expect(fetchPaddle(src, since)).rejects.toThrow(/exceeded 500 pages/);
  });
  it("refuses pagination links to another host", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ data: [], meta: { pagination: { next: "https://evil.example/x", has_more: true } } })));
    await expect(fetchPaddle(src, since)).rejects.toThrow(/non-Paddle/);
  });
  it("excludes MB transactions and refunds", async () => {
    const ids = (await fetchPaddle(src, since)).map((t) => t.id);
    expect(ids).not.toContain("paddle-txn_mb");
    expect(ids).not.toContain("paddle-adj-adj_2");
    expect(ids).toContain("paddle-txn_prof");
  });
  it("follows pagination via meta.pagination.next", async () => {
    const out = await fetchPaddle(src, since);
    expect(urls.filter((u) => new URL(u).pathname === "/transactions")).toHaveLength(2);
    expect(out.map((t) => t.id)).toContain("paddle-txn_prof2");
  });
  it("mixed basket counts only the Profaily line, payment and refund", async () => {
    const out = await fetchPaddle(src, since);
    expect(out.find((t) => t.id === "paddle-txn_mix")).toMatchObject({ amountMinor: 1500, currency: "EUR", kind: "payment" });
    expect(out.find((t) => t.id === "paddle-adj-adj_3")).toMatchObject({ amountMinor: 1500, currency: "EUR", kind: "refund" });
  });
  it("throws on non-2xx without leaking the key; missing key; Classic ids", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({}, 403)));
    await expect(fetchPaddle(src, since)).rejects.toThrow(/403/);
    await expect(fetchPaddle(src, since)).rejects.not.toThrow(/pdl_secret/);
    delete process.env.PADDLE_API_KEY;
    await expect(fetchPaddle(src, since)).rejects.toThrow(/PADDLE_API_KEY/);
    process.env.PADDLE_API_KEY = "x";
    await expect(fetchPaddle({ ...src, priceIds: ["12345"] }, since)).rejects.toThrow(/Classic/);
  });
});
