import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchPaystack } from "@/lib/revenue/providers/paystack";
import t1 from "../fixtures/paystack/transactions-1.json";
import t2 from "../fixtures/paystack/transactions-2.json";
import refunds from "../fixtures/paystack/refunds.json";
import t600 from "../fixtures/paystack/transaction-600.json";
import t500 from "../fixtures/paystack/transaction-500.json";

const src = { provider: "paystack", account: "mb_shared", planCodes: ["PLN_prof"] } satisfies Parameters<typeof fetchPaystack>[0];
const since = new Date("2026-10-01T00:00:00Z");
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status });

let urls: string[];
let headers: Record<string, string>[];
beforeEach(() => {
  urls = [];
  headers = [];
  process.env.PAYSTACK_SECRET_KEY = "sk_test_secret";
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      urls.push(url);
      headers.push(init?.headers as Record<string, string>);
      const u = new URL(url);
      if (u.pathname === "/transaction/500") return json(t500);
      if (u.pathname === "/transaction/verify/ref-0600") return json(t600);
      if (u.pathname === "/transaction") return json(u.searchParams.get("page") === "2" ? t2 : t1);
      if (u.pathname === "/refund") return json(refunds);
      return json({}, 404);
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe("fetchPaystack", () => {
  it("counts a reversed (refunded) payment so payment + refund nets to 0", async () => {
    const out = await fetchPaystack(src, since);
    const pay = out.find((t) => t.id === "paystack-1004")!;
    const ref = out.find((t) => t.id === "paystack-refund-80")!;
    expect(pay.amountMinor - ref.amountMinor).toBe(0);
    expect(out.find((t) => t.id === "paystack-1005")).toBeUndefined();
  });
  it("links a reference-only refund via /transaction/verify/:reference", async () => {
    const out = await fetchPaystack(src, since);
    expect(out.find((t) => t.id === "paystack-refund-81")).toMatchObject({ amountMinor: 4000, kind: "refund" });
    expect(urls.some((u) => u.includes("/transaction/verify/ref-0600"))).toBe(true);
  });
  it("lookup 404 skips the refund; lookup 500 rejects", async () => {
    const base = (globalThis.fetch as unknown as (u: string) => Promise<Response>);
    for (const [code, rejects] of [[404, false], [500, true]] as const) {
      vi.stubGlobal("fetch", vi.fn(async (u: string) => {
        const p = new URL(u).pathname;
        return p.startsWith("/transaction/") ? json({}, code) : base(u);
      }));
      const run = fetchPaystack(src, since);
      if (rejects) await expect(run).rejects.toThrow(/500/);
      else {
        const out = await run;
        expect(out.find((t) => t.id === "paystack-refund-79")).toBeUndefined();
      }
    }
  });
  it("excludes MB transactions and their refunds", async () => {
    const ids = (await fetchPaystack(src, since)).map((t) => t.id);
    expect(ids).not.toContain("paystack-1002");
    expect(ids).not.toContain("paystack-refund-78");
    expect(ids).toContain("paystack-1001");
  });
  it("follows pagination", async () => {
    const out = await fetchPaystack(src, since);
    expect(urls.filter((u) => new URL(u).pathname === "/transaction")).toHaveLength(2);
    expect(out.map((t) => t.id)).toContain("paystack-1003");
  });
  it("maps amounts, currency and positive refunds; fetches old original by id", async () => {
    const out = await fetchPaystack(src, since);
    expect(out.find((t) => t.id === "paystack-1001")).toMatchObject({ amountMinor: 500000, currency: "NGN", kind: "payment" });
    expect(out.find((t) => t.id === "paystack-refund-77")).toMatchObject({ amountMinor: 500000, currency: "NGN", kind: "refund" });
    expect(out.find((t) => t.id === "paystack-refund-79")).toMatchObject({ amountMinor: 3000, currency: "USD", kind: "refund" });
    expect(out.find((t) => t.id === "paystack-500")).toBeUndefined();
  });
  it("sends bearer auth; throws on non-2xx without leaking the key", async () => {
    await fetchPaystack(src, since);
    expect(headers[0].Authorization).toBe("Bearer sk_test_secret");
    vi.stubGlobal("fetch", vi.fn(async () => json({}, 401)));
    await expect(fetchPaystack(src, since)).rejects.toThrow(/401/);
    await expect(fetchPaystack(src, since)).rejects.not.toThrow(/sk_test_secret/);
  });
  it("throws when the key is missing", async () => {
    delete process.env.PAYSTACK_SECRET_KEY;
    await expect(fetchPaystack(src, since)).rejects.toThrow(/PAYSTACK_SECRET_KEY/);
  });
});
