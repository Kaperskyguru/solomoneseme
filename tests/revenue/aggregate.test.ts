import { describe, it, expect } from "vitest";
import { aggregate } from "@/lib/revenue/aggregate";
import type { Txn } from "@/lib/revenue/types";

const NOW = new Date("2026-11-12T00:00:00Z");
let n = 0;
const txn = (at: string, amountMinor: number, currency = "USD"): Txn => ({ id: `t${n++}`, at: new Date(at), amountMinor, currency, kind: "payment" });
const refund = (at: string, amountMinor: number, currency = "USD"): Txn => ({ id: `t${n++}`, at: new Date(at), amountMinor, currency, kind: "refund" });
const month = (r: ReturnType<typeof aggregate>, m: string) => r.months.find((p) => p.month === m)?.totals;

describe("aggregate", () => {
  it("buckets by UTC month", () => {
    const r = aggregate([txn("2026-10-31T23:59:00Z", 1000)], new Date("2026-11-12T00:00:00Z"));
    expect(r.months.at(-2)).toEqual({ month: "2026-10", totals: { USD: 1000 }, partial: false });
    expect(r.months.at(-1)).toMatchObject({ month: "2026-11", partial: true });
    expect(r.months).toHaveLength(12);
    expect(r.months[0].month).toBe("2025-12");
  });
  it("refund counts in its own month", () => {
    const r = aggregate([txn("2026-09-10T00:00:00Z", 5000), refund("2026-10-02T00:00:00Z", 5000)], NOW);
    expect(month(r, "2026-09")).toEqual({ USD: 5000 });
    expect(month(r, "2026-10")).toEqual({ USD: -5000 });
  });
  it("last 30 days is rolling", () => {
    const r = aggregate([txn("2026-10-13T00:00:01Z", 100), txn("2026-10-12T23:59:59Z", 999)], new Date("2026-11-12T00:00:00Z"));
    expect(r.last30).toEqual({ USD: 100 });
  });
  it("keeps currencies separate", () => {
    const r = aggregate([txn("2026-11-01T00:00:00Z", 1000, "USD"), txn("2026-11-02T00:00:00Z", 500000, "NGN")], NOW);
    expect(r.last30).toEqual({ USD: 1000, NGN: 500000 });
  });
  it("omits zero totals, keeps negatives, ignores future txns", () => {
    const r = aggregate([txn("2026-11-01T00:00:00Z", 100), refund("2026-11-02T00:00:00Z", 100), refund("2026-11-03T00:00:00Z", 50, "EUR"), txn("2026-11-13T00:00:00Z", 999)], NOW);
    expect(r.last30).toEqual({ EUR: -50 });
    expect(month(r, "2026-08")).toEqual({});
  });
});

describe("aggregate lifetime", () => {
  it("includes pre-window txns and subtracts refunds, per currency", () => {
    const r = aggregate(
      [txn("2020-01-05T00:00:00Z", 10000), txn("2026-11-01T00:00:00Z", 500), refund("2021-03-01T00:00:00Z", 2500), txn("2022-02-02T00:00:00Z", 900000, "NGN"), txn("2023-01-01T00:00:00Z", 100, "EUR"), refund("2023-01-02T00:00:00Z", 100, "EUR")],
      NOW,
    );
    expect(r.lifetime).toEqual({ USD: 8000, NGN: 900000 });
    expect(r.last30).toEqual({ USD: 500 });
    expect(r.months.every((m) => m.totals.NGN === undefined)).toBe(true);
  });
});

describe("aggregate lifetime with a baseline", () => {
  const baseline = { asOf: "2026-11-05", totals: { USD: 146682 } };
  it("adds only txns after the asOf day; the asOf day itself is covered by the baseline", () => {
    const r = aggregate(
      [txn("2026-10-01T00:00:00Z", 1000), txn("2026-11-05T23:59:59Z", 2000), txn("2026-11-06T00:00:00Z", 300), refund("2026-11-07T00:00:00Z", 100), txn("2026-11-08T00:00:00Z", 50, "NGN")],
      NOW,
      baseline,
    );
    expect(r.lifetime).toEqual({ USD: 146682 + 300 - 100, NGN: 50 });
    expect(r.last30).toEqual({ USD: 2200, NGN: 50 }); // API-only, baseline not in the window
  });
  it("without a baseline every txn counts", () => {
    expect(aggregate([txn("2026-11-05T12:00:00Z", 2000), txn("2020-01-01T00:00:00Z", 10)], NOW).lifetime).toEqual({ USD: 2010 });
  });
});
