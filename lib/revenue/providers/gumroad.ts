import type { Source } from "@/config/schema";
import type { Txn } from "../types";

export type GumroadSource = Extract<Source, { provider: "gumroad" }>;

const MAX_PAGES = 500;
const BASE = "https://api.gumroad.com";

export type GrSale = {
  id: string; product_id?: string; product_name?: string; product_permalink?: string; formatted_total_price?: string; price: number; currency: string; refunded?: boolean;
  chargedback?: boolean;
  disputed?: boolean;
  partially_refunded?: boolean;
  created_at: string;
};
type SalesPage = { sales: GrSale[]; next_page_key?: string | null };

/** The token travels in the query string (Gumroad API); it is never put in an error message. */
export async function gumroadGet<T>(src: GumroadSource, path: string, params: Record<string, string> = {}): Promise<T> {
  const token = process.env.GUMROAD_ACCESS_TOKEN;
  if (!token) throw new Error("GUMROAD_ACCESS_TOKEN is not set");
  const url = new URL(`${BASE}${path}`);
  if (url.origin !== BASE) throw new Error("Refusing to send Gumroad credentials to a non-Gumroad host");
  for (const [k, v] of Object.entries({ ...params, access_token: token })) url.searchParams.set(k, v);
  let res: Response;
  try {
    res = await fetch(url.toString(), { signal: AbortSignal.timeout(15_000) });
  } catch (e) {
    throw new Error(`Gumroad ${path} request failed: ${(e as Error).name}`);
  }
  if (!res.ok) throw Object.assign(new Error(`Gumroad ${path} failed with status ${res.status}`), { status: res.status });
  try {
    return (await res.json()) as T;
  } catch {
    throw new Error("Gumroad returned an unexpected response");
  }
}

/** Pages through /v2/sales (all-time when `after` is omitted). */
export async function* gumroadSales(src: GumroadSource, after?: string): AsyncGenerator<GrSale[]> {
  let pageKey: string | undefined;
  let pages = 0;
  do {
    if (pages++ >= MAX_PAGES) throw new Error(`Gumroad sales exceeded ${MAX_PAGES} pages`);
    const params: Record<string, string> = { ...(after ? { after } : {}), ...(pageKey ? { page_key: pageKey } : {}) };
    const page: SalesPage = await gumroadGet<SalesPage>(src, "/v2/sales", params);
    yield page.sales;
    pageKey = page.next_page_key ?? undefined;
  } while (pageKey);
}

/** Crawls all-time /v2/sales once; revenue and the books shelf both read this array. */
export async function fetchAllGumroadSales(src: GumroadSource): Promise<GrSale[]> {
  const all: GrSale[] = [];
  for await (const page of gumroadSales(src)) all.push(...page);
  return all;
}

/** `sales` is the shared all-time crawl; when omitted this crawls itself (date-bounded). */
export async function fetchGumroad(src: GumroadSource, since: Date, sales?: GrSale[]): Promise<Txn[]> {
  const exclude = new Set(src.exclude);
  const out: Txn[] = [];
  const after = since.toISOString().slice(0, 10);
  const pages: AsyncIterable<GrSale[]> | GrSale[][] = sales ? [sales] : gumroadSales(src, after);
  for await (const sales of pages) {
    for (const s of sales) {
      if (s.product_id && exclude.has(s.product_id)) continue;
      if (!(s.price > 0)) continue; // free downloads are not revenue
      const at = new Date(s.created_at);
      if (at < since) continue; // `after` is date-granular
      const currency = s.currency.toUpperCase();
      out.push({ id: `gumroad-${s.id}`, at, amountMinor: s.price, currency, kind: "payment" });
      // The sales API gives no refund date, so a refunded sale is dated at the sale and
      // nets to zero in its original month.
      // Never inflate: chargebacks/disputes count as fully refunded, and a partial refund
      // is treated as fully refunded (the refunded-amount field is unverified).
      const refund = s.refunded || s.chargedback || s.disputed || s.partially_refunded ? s.price : 0;
      if (refund > 0) out.push({ id: `gumroad-refund-${s.id}`, at, amountMinor: refund, currency, kind: "refund" });
    }
  }
  return out;
}
