import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAllGumroadSales, fetchGumroad } from "@/lib/revenue/providers/gumroad";
import s1 from "../fixtures/gumroad/sales-1.json";
import s2 from "../fixtures/gumroad/sales-2.json";

const src = { provider: "gumroad", exclude: ["pX"] } satisfies Parameters<typeof fetchGumroad>[0];
const since = new Date("2026-10-01T00:00:00Z");
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status });
let urls: string[];
beforeEach(() => {
  urls = [];
  process.env.GUMROAD_ACCESS_TOKEN = "gr_secret";
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      urls.push(url);
      return json(new URL(url).searchParams.get("page_key") === "k2" ? s2 : s1);
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe("fetchGumroad", () => {
  it("follows next_page_key pagination", async () => {
    const out = await fetchGumroad(src, since);
    expect(urls).toHaveLength(2);
    expect(urls[0]).toContain("after=2026-10-01");
    expect(urls[1]).toContain("page_key=k2");
    expect(out.find((t) => t.id === "gumroad-s4")).toBeDefined();
  });
  it("excludes products in exclude", async () => {
    const out = await fetchGumroad(src, since);
    expect(out.find((t) => t.id === "gumroad-s3")).toBeUndefined();
  });
  it("free downloads are not revenue", async () => {
    const out = await fetchGumroad(src, since);
    expect(out.find((t) => t.id === "gumroad-s2")).toBeUndefined();
    const onlyFree = { ...s1, sales: [s1.sales[1]], next_page_key: undefined };
    vi.stubGlobal("fetch", vi.fn(async () => json(onlyFree)));
    expect(await fetchGumroad(src, since)).toEqual([]);
  });
  it("uppercases currency; refunded sale yields payment + refund", async () => {
    const out = await fetchGumroad(src, since);
    expect(out.find((t) => t.id === "gumroad-s1")).toMatchObject({ amountMinor: 1900, currency: "USD", kind: "payment" });
    expect(out.find((t) => t.id === "gumroad-s4")).toMatchObject({ kind: "payment" });
    expect(out.find((t) => t.id === "gumroad-refund-s4")).toMatchObject({ amountMinor: 1900, kind: "refund" });
  });
  it("chargedback, disputed, and partial refunds are conservative", async () => {
    const out = await fetchGumroad(src, since);
    const amt = (id: string) => out.find((t) => t.id === id)?.amountMinor;
    expect(amt("gumroad-refund-s5")).toBe(1000);
    expect(amt("gumroad-refund-s6")).toBe(1000);
    expect(amt("gumroad-refund-s7")).toBe(1000); // amount field ignored
    expect(amt("gumroad-refund-s8")).toBe(1000);
  });
  it("drops sales before since (date-granular after)", async () => {
    const out = await fetchGumroad(src, since);
    expect(out.find((t) => t.id === "gumroad-s9")).toBeUndefined();
  });
  it("throws past the max-page guard", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ sales: [], next_page_key: "k" })));
    await expect(fetchGumroad(src, since)).rejects.toThrow(/exceeded/);
  });
  it("errors never contain the token", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({}, 500)));
    const e = await fetchGumroad(src, since).catch((x) => x);
    expect(e.status).toBe(500);
    expect(e.message).not.toContain("gr_secret");
    delete process.env.GUMROAD_ACCESS_TOKEN;
    await expect(fetchGumroad(src, since)).rejects.toThrow("GUMROAD_ACCESS_TOKEN");
  });
});

describe("shared all-time crawl", () => {
  it("crawls once without `after`, and fetchGumroad filters the passed array by since without fetching", async () => {
    const sales = await fetchAllGumroadSales(src);
    expect(urls).toHaveLength(2);
    expect(urls.every((u) => !u.includes("after="))).toBe(true);
    urls.length = 0;
    const out = await fetchGumroad(src, since, sales);
    expect(urls).toHaveLength(0);
    expect(out.every((t) => t.at >= since)).toBe(true);
    expect(out.length).toBeGreaterThan(0);
  });
  it("the token never appears in a crawl error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({}, 500)));
    const e = await fetchAllGumroadSales(src).catch((x) => x);
    expect(e.message).not.toContain("gr_secret");
  });
});
