import type { ProductRevenue } from "@/lib/revenue/types";

export type Post = { title: string; url: string; date: string /* ISO */; likes?: number; thumbnail?: string };
export type Book = {
  id: string;
  name: string;
  url: string;
  cover: string;
  priceLabel: string;
  downloads: number;
  rating?: { avg: number; count: number };
};
export type YoutubeSummary = {
  subscribers: number;
  latest: { id: string; title: string; thumbnail: string; publishedAt: string; views: number };
};
export type GithubSummary = {
  username: string;
  total: number;
  /** Chronological, one per calendar day; level 0 (none) … 4 (most). */
  days: { date: string /* YYYY-MM-DD */; level: number }[];
};
export type MbStatsSummary = { learners: number };
export type Snapshot = {
  generatedAt: string;
  revenue: Record<string, ProductRevenue>;
  books: Book[];
  newsletter: Post[];
  blog: Post[];
  youtube?: YoutubeSummary;
  github?: GithubSummary;
  mbStats?: MbStatsSummary;
  sections: Record<string, { updatedAt: string; error?: string }>;
};
