import { books } from "@/config/books";
import { products } from "@/config/products";
import { site } from "@/config/site";
import { fetchBlog } from "@/lib/content/strapi";
import { fetchBooks } from "@/lib/content/books";
import { fetchGithub } from "@/lib/content/github";
import { fetchMbStats } from "@/lib/content/mbstats";
import { fetchSubstack } from "@/lib/content/substack";
import { fetchYoutube } from "@/lib/content/youtube";
import { fetchAllRevenue } from "@/lib/revenue";
import { fetchAllGumroadSales, type GrSale } from "@/lib/revenue/providers/gumroad";
import { mergeSnapshot } from "./merge";
import { readSnapshotForRefresh } from "./store";
import type { Snapshot } from "./types";

const settle = <T>(p: Promise<T>): Promise<T | Error> =>
  p.catch((e) => (e instanceof Error ? e : new Error(String(e))));

const gumroadSrc = () => {
  const src = books.sources[0];
  if (src?.provider !== "gumroad") throw new Error("Books source is not a Gumroad source");
  return src;
};

async function loadBooks(sales: GrSale[] | Error) {
  if (sales instanceof Error) throw sales;
  return fetchBooks(gumroadSrc(), sales);
}

/** `opts.prev` overrides the file read of the previous snapshot (local script); omit it for the refresh route. */
export async function buildSnapshot(now: Date, opts: { prev?: Snapshot | null } = {}): Promise<Snapshot> {
  // One all-time Gumroad crawl per refresh, shared by revenue and the shelf.
  const gumroadSales = await settle((async () => fetchAllGumroadSales(gumroadSrc()))());
  const [prev, revenue, bookList, newsletter, blog, youtube, github, mbStats] = await Promise.all([
    opts.prev !== undefined ? Promise.resolve(opts.prev) : readSnapshotForRefresh().then((r) => (r.status === "ok" ? r.snapshot : null)),
    fetchAllRevenue(products, now, { gumroadSales }),
    settle(loadBooks(gumroadSales)),
    settle(fetchSubstack()),
    settle(fetchBlog()),
    settle(fetchYoutube()),
    settle(fetchGithub(site.github.username)),
    settle(fetchMbStats()),
  ]);
  return mergeSnapshot(prev, { revenue, books: bookList, newsletter, blog, youtube, github, mbStats }, now);
}
