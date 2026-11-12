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
