import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchLemonSqueezy } from "@/lib/revenue/providers/lemonsqueezy";
import o1 from "../fixtures/lemonsqueezy/orders-1.json";
import o2 from "../fixtures/lemonsqueezy/orders-2.json";

const src = { provider: "lemonsqueezy", storeId: "82309", productIds: ["257073", "654164"] } satisfies Parameters<typeof fetchLemonSqueezy>[0];
const since = new Date("2026-10-01T00:00:00Z");
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status });
let urls: string[];
let headers: Record<string, string>[];
beforeEach(() => {
  urls = [];
  headers = [];
  process.env.LEMONSQUEEZY_API_KEY = "ls_secret";
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      urls.push(url);
      headers.push(init?.headers as Record<string, string>);
      return json(new URL(url).searchParams.get("page[number]") === "2" ? o2 : o1);
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe("fetchLemonSqueezy", () => {
  it("follows pagination, sends auth, keeps paging within since-90d and emits no payment for orders before since", async () => {
    const out = await fetchLemonSqueezy(src, since);
    expect(urls).toHaveLength(2);
    expect(urls[0]).toContain("filter%5Bstore_id%5D=82309");
    expect(headers[0].Authorization).toBe("Bearer ls_secret");
    expect(out.find((t) => t.id === "lemonsqueezy-1003")).toBeDefined();
    expect(out.find((t) => t.id === "lemonsqueezy-1004")).toBeUndefined();
  });
  it("partial refund produces refund txn", async () => {
    const out = await fetchLemonSqueezy(src, since);
    expect(out.find((t) => t.id === "lemonsqueezy-1002")).toMatchObject({ amountMinor: 9000, kind: "payment", currency: "USD" });
    expect(out.find((t) => t.id === "lemonsqueezy-refund-1002")).toMatchObject({
      amountMinor: 2273, kind: "refund", at: new Date("2026-10-22T08:00:00Z"),
    });
  });
  it("full refund falls back to updated_at and nets to zero", async () => {
    const out = await fetchLemonSqueezy(src, since);
    const r = out.find((t) => t.id === "lemonsqueezy-refund-1003")!;
    expect(r).toMatchObject({ amountMinor: 4500, currency: "EUR", at: new Date("2026-10-11T09:00:00Z") });
  });
  it("order before since refunded inside window emits the refund only", async () => {
    const out = await fetchLemonSqueezy(src, since);
    expect(out.find((t) => t.id === "lemonsqueezy-1006")).toBeUndefined();
    expect(out.find((t) => t.id === "lemonsqueezy-refund-1006")).toMatchObject({ amountMinor: 1371, kind: "refund" });
  });
  it("skips failed, pending and fraudulent orders entirely", async () => {
    const ids = (await fetchLemonSqueezy(src, since)).map((t) => t.id);
    for (const id of ["2001", "2002", "2003"]) {
      expect(ids).not.toContain(`lemonsqueezy-${id}`);
      expect(ids).not.toContain(`lemonsqueezy-refund-${id}`);
    }
  });
  it("excludes tax and discount from payments; pro-rates refunds to the net share", async () => {
    const out = await fetchLemonSqueezy(src, since);
    expect(out.find((t) => t.id === "lemonsqueezy-2004")).toMatchObject({ amountMinor: 8000, kind: "payment" });
    expect(out.find((t) => t.id === "lemonsqueezy-refund-2004")).toMatchObject({ amountMinor: 800, kind: "refund" });
  });
  it("excludes test_mode orders", async () => {
    const out = await fetchLemonSqueezy(src, since);
    expect(out.find((t) => t.id === "lemonsqueezy-1005")).toBeUndefined();
  });
  it("throws past the max-page guard", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ data: [], links: { next: "https://api.lemonsqueezy.com/v1/orders?x=1" } })));
    await expect(fetchLemonSqueezy(src, since)).rejects.toThrow(/exceeded/);
  });
  it("fixed message when the body is not JSON", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>secret-ish</html>")));
    await expect(fetchLemonSqueezy(src, since)).rejects.toThrow(/^Lemon Squeezy returned an unexpected response$/);
  });
  it("sends an abort signal", async () => {
    await fetchLemonSqueezy(src, since);
    expect((fetch as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });
  it("throws without key, on non-2xx without leaking key, and on foreign pagination host", async () => {
    delete process.env.LEMONSQUEEZY_API_KEY;
    await expect(fetchLemonSqueezy(src, since)).rejects.toThrow("LEMONSQUEEZY_API_KEY");
    process.env.LEMONSQUEEZY_API_KEY = "ls_secret";
    vi.stubGlobal("fetch", vi.fn(async () => json({}, 500)));
    const e = await fetchLemonSqueezy(src, since).catch((x) => x);
    expect(e.status).toBe(500);
    expect(e.message).not.toContain("ls_secret");
    vi.stubGlobal("fetch", vi.fn(async () => json({ data: [], links: { next: "https://evil.example/x" } })));
    await expect(fetchLemonSqueezy(src, since)).rejects.toThrow(/non-Lemon/);
  });
  const order = (attrs: Record<string, unknown>) => ({
    data: [{ id: "9001", attributes: { total: 1200, subtotal: 1000, discount_total: 0, currency: "USD", test_mode: false, first_order_item: { product_id: 257073, price: 1000 }, created_at: "2026-10-05T00:00:00Z", ...attrs } }],
  });
  it("status refunded with missing/zero refunded_amount refunds the full net", async () => {
    for (const refunded_amount of [null, undefined, 0]) {
      vi.stubGlobal("fetch", vi.fn(async () => json(order({ status: "refunded", refunded_amount, updated_at: "2026-10-09T00:00:00Z" }))));
      const out = await fetchLemonSqueezy(src, since);
      expect(out.find((t) => t.id === "lemonsqueezy-9001")).toMatchObject({ amountMinor: 1000, kind: "payment" });
      expect(out.find((t) => t.id === "lemonsqueezy-refund-9001")).toMatchObject({
        amountMinor: 1000, kind: "refund", at: new Date("2026-10-09T00:00:00Z"),
      });
    }
  });
  it("status partial_refund without amount throws", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json(order({ status: "partial_refund", refunded_amount: null }))));
    await expect(fetchLemonSqueezy(src, since)).rejects.toThrow("Lemon Squeezy partial refund without amount");
  });
});

describe("fetchLemonSqueezy shared-store product filter", () => {
  const order = (id: string, item: unknown, extra: Record<string, unknown> = {}) => ({
    id,
    attributes: { total: 5000, subtotal: 5000, discount_total: 0, currency: "USD", status: "paid", created_at: "2026-10-10T00:00:00Z", first_order_item: item, ...extra },
  });
  const serve = (data: unknown[]) => vi.stubGlobal("fetch", vi.fn(async () => json({ data })));
  it("excludes an MB product in the same store, counts a matching one", async () => {
    serve([order("m1", { product_id: 274650, price: 5000 }), order("b1", { product_id: 257073, price: 5000 }), order("b2", { product_id: "654164", price: 5000 })]);
    const ids = (await fetchLemonSqueezy(src, since)).map((t) => t.id);
    expect(ids).toEqual(["lemonsqueezy-b1", "lemonsqueezy-b2"]);
  });
  it("fails closed when first_order_item or product_id is missing", async () => {
    serve([order("x1", undefined), order("x2", null), order("x3", {})]);
    expect(await fetchLemonSqueezy(src, since)).toEqual([]);
  });
  it("excludes refunds of non-matching products", async () => {
    serve([
      order("r1", { product_id: 274650, price: 5000 }, { status: "refunded", refunded_amount: 5000, refunded_at: "2026-10-12T00:00:00Z" }),
      order("r2", { product_id: 257073, price: 5000 }, { status: "refunded", refunded_amount: 5000, refunded_at: "2026-10-12T00:00:00Z" }),
    ]);
    const ids = (await fetchLemonSqueezy(src, since)).map((t) => t.id);
    expect(ids).not.toContain("lemonsqueezy-refund-r1");
    expect(ids).toContain("lemonsqueezy-refund-r2");
  });

  it("multi-item guard: subtotal larger than first item is skipped; matching (incl. quantity) is counted", async () => {
    const order = (id: string, subtotal: number, item: Record<string, unknown>) => ({
      id, attributes: { total: subtotal, subtotal, discount_total: 0, currency: "USD", status: "paid", test_mode: false,
        created_at: "2026-10-10T00:00:00Z", first_order_item: { product_id: 257073, ...item } },
    });
    const data = [order("m1", 9000, { price: 4500 }), order("m2", 4500, { price: 4500 }), order("m3", 9000, { price: 4500, quantity: 2 }), order("m4", 4500, {})];
    vi.stubGlobal("fetch", vi.fn(async () => json({ data })));
    const ids = (await fetchLemonSqueezy(src, since)).map((t) => t.id);
    expect(ids).toEqual(["lemonsqueezy-m2", "lemonsqueezy-m3"]);
  });
});
