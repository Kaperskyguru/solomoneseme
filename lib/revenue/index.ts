import type { Product, Source } from "@/config/schema";
import { books } from "@/config/books";
import { aggregate } from "./aggregate";
import { fetchAsyncpay } from "./providers/asyncpay";
import { fetchGumroad, type GrSale } from "./providers/gumroad";
import { fetchLemonSqueezy } from "./providers/lemonsqueezy";
import { fetchPaddle } from "./providers/paddle";
import { fetchPaystack } from "./providers/paystack";
import type { ProductRevenue, Txn } from "./types";

type Shared = { gumroadSales?: GrSale[] | Error };

const ALL_TIME = new Date(0);

function fetchSource(src: Source, since: Date, shared: Shared, oneOff: boolean): Promise<Txn[]> {
  switch (src.provider) {
    case "paystack": return fetchPaystack(src, since);
    case "paddle": return fetchPaddle(src, since);
    case "lemonsqueezy": return fetchLemonSqueezy(src, oneOff ? ALL_TIME : since);
    case "asyncpay": return fetchAsyncpay(src, ALL_TIME);
    case "gumroad":
      if (shared.gumroadSales instanceof Error) return Promise.reject(shared.gumroadSales);
      return fetchGumroad(src, ALL_TIME, shared.gumroadSales);
  }
}

/** Placeholder ids in config mean "not wired up yet": never fetch them, never report $0. */
function unconfigured(src: Source): boolean {
  const vals =
    src.provider === "paystack" ? src.planCodes
    : src.provider === "paddle" ? src.priceIds
    : src.provider === "asyncpay" ? src.filter.values
    : src.provider === "lemonsqueezy" ? [src.storeId, ...src.productIds]
    : [];
  return vals.some((v) => v.startsWith("REPLACE_ME"));
}

/**
 * Revenue per product id (plus `books`). MB-group products are skipped entirely.
 * If any source of a product fails, that product's entry is the Error, never partial numbers.
 */
export async function fetchAllRevenue(
  products: Pick<Product, "id" | "group" | "sources" | "revenueModel" | "revenueBaseline">[],
  now: Date,
  shared: Shared = {},
): Promise<Record<string, ProductRevenue | Error>> {
  const since = new Date(now);
  since.setUTCMonth(since.getUTCMonth() - 13);
  const targets = [...products.filter((p) => p.group !== "mb"), { id: books.id, sources: books.sources, revenueModel: "one-off" as const, revenueBaseline: undefined }];

  const settled = await Promise.allSettled(
    targets.map(async (p): Promise<ProductRevenue> => {
      if (p.sources.some(unconfigured)) throw new Error(`${p.id} is not configured yet`);
      const txns = (await Promise.all(p.sources.map((s) => fetchSource(s, since, shared, p.revenueModel === "one-off")))).flat();
      return { productId: p.id, ...aggregate(txns, now, p.revenueBaseline), updatedAt: now.toISOString() };
    }),
  );
  return Object.fromEntries(
    settled.map((r, i) => [
      targets[i].id,
      r.status === "fulfilled" ? r.value : r.reason instanceof Error ? r.reason : new Error(String(r.reason)),
    ]),
  );
}
