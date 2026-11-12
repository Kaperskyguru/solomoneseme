import { afterEach, beforeEach, expect, it, vi } from "vitest";

vi.mock("@/lib/revenue", () => ({ fetchAllRevenue: vi.fn() }));
vi.mock("@/lib/content/books", () => ({ fetchBooks: vi.fn() }));
vi.mock("@/lib/revenue/providers/gumroad", () => ({ fetchAllGumroadSales: vi.fn(async () => []) }));
vi.mock("@/lib/content/substack", () => ({ fetchSubstack: vi.fn() }));
vi.mock("@/lib/content/strapi", () => ({ fetchBlog: vi.fn() }));
vi.mock("@/lib/content/youtube", () => ({ fetchYoutube: vi.fn() }));
vi.mock("@/lib/content/github", () => ({ fetchGithub: vi.fn() }));
vi.mock("@/lib/content/mbstats", () => ({ fetchMbStats: vi.fn() }));
vi.mock("@/lib/snapshot/store", () => ({ readSnapshotForRefresh: vi.fn(), writeSnapshot: vi.fn() }));

import { fetchAllRevenue } from "@/lib/revenue";
import { fetchBooks } from "@/lib/content/books";
import { fetchSubstack } from "@/lib/content/substack";
import { fetchBlog } from "@/lib/content/strapi";
import { fetchYoutube } from "@/lib/content/youtube";
import { fetchGithub } from "@/lib/content/github";
import { fetchMbStats } from "@/lib/content/mbstats";
import { readSnapshotForRefresh } from "@/lib/snapshot/store";
import { buildSnapshot } from "@/lib/snapshot/build";

afterEach(() => vi.clearAllMocks());
// Never a live call: GitHub defaults to failing unless a test says otherwise.
beforeEach(() => {
  vi.mocked(fetchGithub).mockRejectedValue(new Error("gh down"));
  vi.mocked(fetchMbStats).mockRejectedValue(new Error("mb down"));
});

it("collects failures as section errors without throwing", async () => {
  vi.mocked(readSnapshotForRefresh).mockResolvedValue({ status: "missing" });
  vi.mocked(fetchAllRevenue).mockResolvedValue({ books: new Error("down") });
  vi.mocked(fetchBooks).mockResolvedValue([]);
  vi.mocked(fetchSubstack).mockResolvedValue([{ title: "A", url: "u", date: "d" }]);
  vi.mocked(fetchBlog).mockRejectedValue(new Error("strapi down"));
  vi.mocked(fetchYoutube).mockRejectedValue(new Error("yt down"));
  const s = await buildSnapshot(new Date("2026-11-12T00:00:00Z"));
  expect(s.newsletter).toHaveLength(1);
  expect(s.sections.blog.error).toBe("strapi down");
  expect(s.sections["revenue:books"].error).toBe("down");
  expect(s.sections.newsletter.error).toBeUndefined();
});

it("merges onto the previous snapshot when the read is ok", async () => {
  const prev = { generatedAt: "p", revenue: {}, books: [], newsletter: [], blog: [{ title: "old", url: "u", date: "d" }], sections: { blog: { updatedAt: "p" } } };
  vi.mocked(readSnapshotForRefresh).mockResolvedValue({ status: "ok", snapshot: prev });
  vi.mocked(fetchAllRevenue).mockResolvedValue({});
  vi.mocked(fetchBooks).mockResolvedValue([]);
  vi.mocked(fetchSubstack).mockResolvedValue([]);
  vi.mocked(fetchBlog).mockRejectedValue(new Error("down"));
  vi.mocked(fetchYoutube).mockRejectedValue(new Error("down"));
  const s = await buildSnapshot(new Date("2026-11-12T00:00:00Z"));
  expect(s.blog[0].title).toBe("old");
  expect(s.sections.blog.updatedAt).toBe("p");
});

it("propagates a failed previous-snapshot read", async () => {
  vi.mocked(readSnapshotForRefresh).mockRejectedValue(new Error("snapshot fetch 500"));
  vi.mocked(fetchAllRevenue).mockResolvedValue({});
  vi.mocked(fetchBooks).mockResolvedValue([]);
  vi.mocked(fetchSubstack).mockResolvedValue([]);
  vi.mocked(fetchBlog).mockResolvedValue([]);
  vi.mocked(fetchYoutube).mockRejectedValue(new Error("x"));
  await expect(buildSnapshot(new Date())).rejects.toThrow("snapshot fetch 500");
});

it("fetches GitHub for the configured username and records its failure as a section error", async () => {
  vi.mocked(readSnapshotForRefresh).mockResolvedValue({ status: "missing" });
  vi.mocked(fetchAllRevenue).mockResolvedValue({});
  vi.mocked(fetchBooks).mockResolvedValue([]);
  vi.mocked(fetchSubstack).mockResolvedValue([]);
  vi.mocked(fetchBlog).mockResolvedValue([]);
  vi.mocked(fetchYoutube).mockRejectedValue(new Error("x"));
  vi.mocked(fetchGithub).mockRejectedValue(new Error("GitHub contributions failed with status 503"));
  const s = await buildSnapshot(new Date("2026-11-12T00:00:00Z"));
  expect(vi.mocked(fetchGithub)).toHaveBeenCalledWith("kaperskyguru");
  expect(s.github).toBeUndefined();
  expect(s.sections.github.error).toBe("GitHub contributions failed with status 503");
});

it("uses an explicit prev override and never reads the Blob", async () => {
  const prev = { generatedAt: "p", revenue: {}, books: [], newsletter: [], blog: [{ title: "old", url: "u", date: "d" }], sections: { blog: { updatedAt: "p" } } };
  vi.mocked(fetchAllRevenue).mockResolvedValue({});
  vi.mocked(fetchBooks).mockResolvedValue([]);
  vi.mocked(fetchSubstack).mockResolvedValue([]);
  vi.mocked(fetchBlog).mockRejectedValue(new Error("down"));
  vi.mocked(fetchYoutube).mockRejectedValue(new Error("down"));
  const s = await buildSnapshot(new Date("2026-11-12T00:00:00Z"), { prev });
  expect(vi.mocked(readSnapshotForRefresh)).not.toHaveBeenCalled();
  expect(s.blog[0].title).toBe("old");
  const s2 = await buildSnapshot(new Date("2026-11-12T00:00:00Z"), { prev: null });
  expect(vi.mocked(readSnapshotForRefresh)).not.toHaveBeenCalled();
  expect(s2.blog).toEqual([]);
});
