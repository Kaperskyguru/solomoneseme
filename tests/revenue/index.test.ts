import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Product } from "@/config/schema";

vi.mock("@/lib/revenue/providers/paystack", () => ({ fetchPaystack: vi.fn(async () => []) }));
vi.mock("@/lib/revenue/providers/paddle", () => ({ fetchPaddle: vi.fn(async () => []) }));
vi.mock("@/lib/revenue/providers/lemonsqueezy", () => ({ fetchLemonSqueezy: vi.fn(async () => []) }));
vi.mock("@/lib/revenue/providers/gumroad", () => ({ fetchGumroad: vi.fn(async () => []) }));
vi.mock("@/lib/revenue/providers/asyncpay", () => ({ fetchAsyncpay: vi.fn(async () => []) }));

import { fetchAllRevenue } from "@/lib/revenue";
import { fetchPaystack } from "@/lib/revenue/providers/paystack";
import { fetchPaddle } from "@/lib/revenue/providers/paddle";
import { fetchLemonSqueezy } from "@/lib/revenue/providers/lemonsqueezy";
import { fetchGumroad } from "@/lib/revenue/providers/gumroad";
import { fetchAsyncpay } from "@/lib/revenue/providers/asyncpay";

const now = new Date("2026-11-12T12:00:00Z");
const base = { name: "n", url: "https://x.example", icon: "/i.png", tagline: "t" };
const mk = (id: string, group: "mb" | "solo", sources: Product["sources"]): Product => ({ ...base, id, group, sources });
const ls: Product["sources"][number] = { provider: "lemonsqueezy", storeId: "1", productIds: ["1"] };
const ps: Product["sources"][number] = { provider: "paystack", account: "mb_shared", planCodes: ["P"] };

beforeEach(() => {
  vi.resetAllMocks();
  for (const f of [fetchPaystack, fetchPaddle, fetchLemonSqueezy, fetchGumroad, fetchAsyncpay]) vi.mocked(f).mockResolvedValue([]);
});

describe("fetchAllRevenue", () => {
  it("$0 product has 12 zero months", async () => {
    const r = await fetchAllRevenue([mk("empty", "solo", [])], now);
    const p = r.empty;
    if (p instanceof Error) throw p;
    expect(p.last30).toEqual({});
    expect(p.months).toHaveLength(12);
    expect(p.months.every((m) => Object.keys(m.totals).length === 0)).toBe(true);
    expect(p.updatedAt).toBe(now.toISOString());
    expect(p.productId).toBe("empty");
  });

  it("one-off products fetch Lemon Squeezy all-time and lifetime keeps pre-window orders; recurring keeps 13 months", async () => {
    vi.mocked(fetchLemonSqueezy).mockResolvedValue([{ id: "old", at: new Date("2022-01-01T00:00:00Z"), amountMinor: 700, currency: "USD", kind: "payment" }]);
    const r = await fetchAllRevenue([{ ...mk("oo", "solo", [ls]), revenueModel: "one-off" }, mk("rec", "solo", [ls])], now);
    const oo = r.oo;
    if (oo instanceof Error) throw oo;
    expect(oo.lifetime).toEqual({ USD: 700 });
    expect(oo.last30).toEqual({});
    const sinces = vi.mocked(fetchLemonSqueezy).mock.calls.map((c) => c[1].getTime());
    expect(sinces).toContain(0);
    expect(sinces).toContain(new Date("2025-10-12T12:00:00.000Z").getTime());
  });

  it("one failing source makes the product an Error, others unaffected", async () => {
    vi.mocked(fetchPaystack).mockRejectedValueOnce(new Error("boom"));
    vi.mocked(fetchLemonSqueezy).mockResolvedValue([{ id: "a", at: new Date("2026-11-01T00:00:00Z"), amountMinor: 500, currency: "USD", kind: "payment" }]);
    const r = await fetchAllRevenue([mk("bad", "solo", [ls, ps]), mk("good", "solo", [ls])], now);
    expect(r.bad).toBeInstanceOf(Error);
    const good = r.good;
    if (good instanceof Error) throw good;
    expect(good.last30).toEqual({ USD: 500 });
  });

  it("mb products are never fetched", async () => {
    const r = await fetchAllRevenue([mk("mbp", "mb", [ls, ps, { provider: "asyncpay", account: "mb_shared", filter: { field: "meta_data.source", values: ["x"] } }])], now);
    expect(r.mbp).toBeUndefined();
    for (const f of [fetchPaystack, fetchPaddle, fetchLemonSqueezy, fetchAsyncpay]) {
      expect(f).not.toHaveBeenCalled();
    }
    expect(fetchGumroad).toHaveBeenCalledTimes(1); // the books pseudo-product only
  });

  it("reads asyncpay all-time, includes books, routes asyncpay", async () => {
    const asyncSrc: Product["sources"][number] = { provider: "asyncpay", account: "mb_shared", filter: { field: "meta_data.source", values: ["x"] } };
    const r = await fetchAllRevenue([mk("ai", "solo", [asyncSrc])], now);
    expect(r.books).toBeDefined();
    expect(fetchGumroad).toHaveBeenCalledTimes(1);
    const since = vi.mocked(fetchAsyncpay).mock.calls[0][1];
    expect(since.getTime()).toBe(0); // AsyncPay reads every page; lifetime needs pre-window payments
  });

  it("an unconfigured REPLACE_ME product is an Error and is never fetched", async () => {
    const r = await fetchAllRevenue(
      [
        mk("p1", "solo", [{ provider: "paddle", account: "mb_shared", priceIds: ["REPLACE_ME_x"] }]),
        mk("p2", "solo", [{ provider: "lemonsqueezy", storeId: "1", productIds: ["REPLACE_ME_p"] }]),
        mk("p3", "solo", [{ provider: "asyncpay", account: "mb_shared", filter: { field: "f", values: ["REPLACE_ME_v"] } }]),
        mk("p4", "solo", [ps]),
      ],
      now,
    );
    expect(r.p1).toBeInstanceOf(Error);
    expect((r.p1 as Error).message).toBe("p1 is not configured yet");
    expect(r.p2).toBeInstanceOf(Error);
    expect(r.p3).toBeInstanceOf(Error);
    expect(r.p4).not.toBeInstanceOf(Error);
    expect(fetchPaddle).not.toHaveBeenCalled();
    expect(fetchLemonSqueezy).not.toHaveBeenCalled();
    expect(fetchAsyncpay).not.toHaveBeenCalled();
  });
});
