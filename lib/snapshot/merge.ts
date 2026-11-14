import type { ProductRevenue } from "@/lib/revenue/types";
import type { Book, GithubSummary, MbStatsSummary, Post, Snapshot, YoutubeSummary } from "./types";

export type SnapshotInput = {
  revenue: Record<string, ProductRevenue | Error>;
  books: Book[] | Error;
  newsletter: Post[] | Error;
  blog: Post[] | Error;
  youtube: YoutubeSummary | Error;
  github: GithubSummary | Error;
  mbStats: MbStatsSummary | Error;
};

// Published publicly: message only (adapters never put keys/PII in them), capped.
const msg = (e: Error) => e.message.slice(0, 200);

/** Failed sections/products keep the previous value and updatedAt and record an error. */
export function mergeSnapshot(prev: Snapshot | null, next: SnapshotInput, now: Date = new Date()): Snapshot {
  const at = now.toISOString();
  const sections: Snapshot["sections"] = {};

  const pick = <T>(name: string, value: T | Error, previous: T | undefined, fallback?: T): T | undefined => {
    if (value instanceof Error) {
      sections[name] = { updatedAt: prev?.sections[name]?.updatedAt ?? "", error: msg(value) };
      return previous ?? fallback;
    }
    sections[name] = { updatedAt: at };
    return value;
  };

  const revenue: Record<string, ProductRevenue> = {};
  // Retired products (absent from next.revenue) are dropped along with their section entries.
  for (const [id, v] of Object.entries(next.revenue)) {
    const r = pick(`revenue:${id}`, v, prev?.revenue[id]);
    if (r) revenue[id] = r;
  }

  const books = pick("books", next.books, prev?.books, []) ?? [];
  const newsletter = pick("newsletter", next.newsletter, prev?.newsletter, []) ?? [];
  const blog = pick("blog", next.blog, prev?.blog, []) ?? [];
  const youtube = pick("youtube", next.youtube, prev?.youtube);
  const github = pick("github", next.github, prev?.github);
  const mbStats = pick("mbStats", next.mbStats, prev?.mbStats);

  return { generatedAt: at, revenue, books, newsletter, blog, ...(youtube ? { youtube } : {}), ...(github ? { github } : {}), ...(mbStats ? { mbStats } : {}), sections };
}
