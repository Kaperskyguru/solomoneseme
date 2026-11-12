import { describe, expect, it } from "vitest";
import { mergeSnapshot } from "@/lib/snapshot/merge";
import type { Snapshot } from "@/lib/snapshot/types";
import type { ProductRevenue } from "@/lib/revenue/types";

const now = new Date("2026-11-12T10:00:00Z");
const rev = (id: string, at: string): ProductRevenue =>
  ({ productId: id, last30: { USD: 100 } as never, months: [], updatedAt: at }) as ProductRevenue;
const post = { title: "t", url: "https://x/y", date: "2026-11-01" };
const prev: Snapshot = {
  generatedAt: "2026-11-12T09:00:00Z",
  revenue: { profaily: rev("profaily", "2026-11-12T09:00:00Z"), other: rev("other", "2026-11-12T09:00:00Z") },
  books: [],
  newsletter: [post],
  blog: [post],
  sections: {
    books: { updatedAt: "2026-11-12T09:00:00Z" },
    newsletter: { updatedAt: "2026-11-12T09:00:00Z" },
    blog: { updatedAt: "2026-11-12T09:00:00Z" },
    "revenue:profaily": { updatedAt: "2026-11-12T09:00:00Z" },
    "revenue:other": { updatedAt: "2026-11-12T09:00:00Z" },
  },
};
const ok = {
  revenue: {},
  books: [],
  newsletter: [post],
  blog: [post],
  youtube: { subscribers: 1, latest: { id: "a", title: "b", thumbnail: "c", publishedAt: "d", views: 2 } },
  github: { username: "kaperskyguru", total: 3, days: [{ date: "2026-11-12", level: 2 }] },
  mbStats: { learners: 12400 },
};

describe("mergeSnapshot", () => {
  it("keeps previous section on failure and records the error", () => {
    const next = { ...ok, revenue: { profaily: new Error("Paystack failed with status 500"), other: rev("other", now.toISOString()) }, blog: new Error("boom") };
    const m = mergeSnapshot(prev, next, now);
    expect(m.revenue.profaily).toEqual(prev.revenue.profaily);
    expect(m.sections["revenue:profaily"]).toEqual({ updatedAt: "2026-11-12T09:00:00Z", error: "Paystack failed with status 500" });
    expect(m.revenue.other.updatedAt).toBe(now.toISOString());
    expect(m.sections["revenue:other"]).toEqual({ updatedAt: now.toISOString() });
    expect(m.blog).toEqual(prev.blog);
    expect(m.sections.blog.error).toBe("boom");
    expect(m.sections.newsletter.error).toBeUndefined();
    expect(m.generatedAt).toBe(now.toISOString());
  });

  it("first run with failure leaves the section absent", () => {
    const m = mergeSnapshot(null, { ...ok, youtube: new Error("no key"), blog: new Error("x"), revenue: { a: new Error("e") } }, now);
    expect(m.youtube).toBeUndefined();
    expect(m.blog).toEqual([]);
    expect(m.revenue.a).toBeUndefined();
    expect(m.sections.youtube).toEqual({ updatedAt: "", error: "no key" });
    expect(m.sections["revenue:a"].error).toBe("e");
  });

  it("truncates error messages to 200 chars", () => {
    const m = mergeSnapshot(null, { ...ok, blog: new Error("a".repeat(500)) }, now);
    expect(m.sections.blog.error).toHaveLength(200);
  });

  it("drops retired products and their section entries", () => {
    const m = mergeSnapshot(prev, { ...ok, revenue: { profaily: rev("profaily", now.toISOString()) } }, now);
    expect(m.revenue.other).toBeUndefined();
    expect(m.sections["revenue:other"]).toBeUndefined();
    expect(m.revenue.profaily).toBeDefined();
  });

  it("github: stores on success, keeps the last good value with a fixed error on failure", () => {
    const first = mergeSnapshot(null, ok, now);
    expect(first.github).toEqual(ok.github);
    expect(first.sections.github).toEqual({ updatedAt: now.toISOString() });
    const later = new Date("2026-11-12T11:00:00Z");
    const failed = mergeSnapshot(first, { ...ok, github: new Error("GitHub contributions failed with status 429") }, later);
    expect(failed.github).toEqual(ok.github);
    expect(failed.sections.github).toEqual({ updatedAt: now.toISOString(), error: "GitHub contributions failed with status 429" });
    const never = mergeSnapshot(null, { ...ok, github: new Error("x") }, now);
    expect(never.github).toBeUndefined();
  });

  it("mbStats: stores on success, keeps the last good value on failure", () => {
    const first = mergeSnapshot(null, ok, now);
    expect(first.mbStats).toEqual({ learners: 12400 });
    const later = new Date("2026-11-12T11:00:00Z");
    const failed = mergeSnapshot(first, { ...ok, mbStats: new Error("MasteringBackend stats failed with status 502") }, later);
    expect(failed.mbStats).toEqual({ learners: 12400 });
    expect(failed.sections.mbStats).toEqual({ updatedAt: now.toISOString(), error: "MasteringBackend stats failed with status 502" });
    expect(mergeSnapshot(null, { ...ok, mbStats: new Error("x") }, now).mbStats).toBeUndefined();
  });
});
