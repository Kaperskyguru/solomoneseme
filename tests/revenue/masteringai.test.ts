import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAsyncpay } from "@/lib/revenue/providers/asyncpay";
import p1 from "../fixtures/asyncpay/page-1.json";
import p2 from "../fixtures/asyncpay/page-2.json";

const src = {
  provider: "asyncpay",
  account: "mb_shared",
  filter: { field: "meta_data.source", values: ["scholarship_page", "ai_automation_scholarship"] },
} satisfies Parameters<typeof fetchAsyncpay>[0];
const since = new Date("2026-09-01T00:00:00Z");
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status });

let urls: string[];
let auth: unknown[];
const stub = (pages: Record<string, unknown>) =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      urls.push(url);
      auth.push((init?.headers as Record<string, string>)?.Authorization);
      const page = new URL(url).searchParams.get("page") ?? "1";
      return pages[page] ? json(pages[page]) : json({}, 500);
    }),
  );
beforeEach(() => {
  urls = [];
  auth = [];
  process.env.ASYNCPAY_SECRET_KEY = "ak_test_fake";
  stub({ "1": p1, "2": p2 });
});
afterEach(() => vi.unstubAllGlobals());

describe("fetchAsyncpay", () => {
  it("excludes MB transactions, unpaid rows and rows with no source", async () => {
    const out = await fetchAsyncpay(src, since);
    expect(out.map((t) => t.id).sort()).toEqual(["asyncpay-u1", "asyncpay-u3", "asyncpay-u6"]);
  });

  it("counts awaiting_verification only when the last transaction succeeded, in minor units", async () => {
    const out = await fetchAsyncpay(src, since);
    expect(out.find((t) => t.id === "asyncpay-u3")).toMatchObject({ amountMinor: 999900, currency: "NGN", kind: "payment" });
    expect(out.find((t) => t.id === "asyncpay-u1")!.amountMinor).toBe(1500000);
    expect(out.find((t) => t.id === "asyncpay-u4")).toBeUndefined();
  });

  it("dates a payment by its paid transaction, filters since on that date", async () => {
    const out = await fetchAsyncpay(src, new Date("2026-10-01T00:00:00Z"));
    const u6 = out.find((t) => t.id === "asyncpay-u6")!;
    expect(u6.at.toISOString()).toBe("2026-10-01T00:30:00.000Z"); // created in Sept, paid in Oct
    expect(out.find((t) => t.id === "asyncpay-u7")).toBeUndefined();
  });

  it("follows pagination with the bearer key", async () => {
    await fetchAsyncpay(src, since);
    expect(urls).toHaveLength(2);
    expect(urls[0]).toContain("per_page=50");
    expect(auth).toEqual(["Bearer ak_test_fake", "Bearer ak_test_fake"]);
  });

  it("refuses to follow next_page_url off the AsyncPay origin", async () => {
    const evil = structuredClone(p1);
    evil.data.payment_requests.next_page_url = "https://evil.example/v1/payment-requests?page=2";
    stub({ "1": evil });
    await expect(fetchAsyncpay(src, since)).rejects.toThrow(/origin/i);
    expect(urls).toHaveLength(1);
  });

  it("throws on a non-numeric amount without leaking row data", async () => {
    const bad = structuredClone(p1);
    bad.data.payment_requests.data[0].amount = "abc";
    stub({ "1": bad, "2": p2 });
    const err = (await fetchAsyncpay(src, since).catch((e) => e)) as Error;
    expect(err).toBeInstanceOf(Error);
    expect(err.message).not.toMatch(/Fake|example\.com/);
  });

  it("throws when the key is missing or the API fails, without echoing the key", async () => {
    stub({});
    await expect(fetchAsyncpay(src, since)).rejects.toThrow(/status 500/);
    delete process.env.ASYNCPAY_SECRET_KEY;
    await expect(fetchAsyncpay(src, since)).rejects.toThrow(/ASYNCPAY_SECRET_KEY/);
  });

  it("rejects a 200 with an unexpected shape instead of reporting $0", async () => {
    for (const body of [{}, { status: false }]) {
      stub({ "1": body });
      await expect(fetchAsyncpay(src, since)).rejects.toThrow(/unexpected response shape/);
    }
  });

  it("counts a uuid once when it appears on two pages", async () => {
    const dup = structuredClone(p2);
    dup.data.payment_requests.data.push(structuredClone(p1.data.payment_requests.data[0]));
    stub({ "1": p1, "2": dup });
    const out = await fetchAsyncpay(src, since);
    expect(out.filter((t) => t.id === "asyncpay-u1")).toHaveLength(1);
  });

  it.each(["1e3", "-5", "1.234", ""])("rejects amount %j", async (amt) => {
    const bad = structuredClone(p1);
    bad.data.payment_requests.data[0].amount = amt;
    stub({ "1": bad, "2": p2 });
    await expect(fetchAsyncpay(src, since)).rejects.toThrow(/non-numeric/);
  });

  it("stops after 500 pages", async () => {
    const loop = structuredClone(p1);
    loop.data.payment_requests.next_page_url = "https://api.asyncpay.io/v1/payment-requests?per_page=50&page=1";
    stub({ "1": loop });
    await expect(fetchAsyncpay(src, since)).rejects.toThrow(/500/);
  });
});
