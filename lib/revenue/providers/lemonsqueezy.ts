import type { Source } from "@/config/schema";
import type { Txn } from "../types";

export type LemonSqueezySource = Extract<Source, { provider: "lemonsqueezy" }>;

const BASE = "https://api.lemonsqueezy.com";

type LsOrder = {
  id: string;
  attributes: {
    total: number;
    subtotal?: number;
    discount_total?: number | null;
    currency: string;
    status?: string;
    test_mode?: boolean;
    refunded_amount?: number | null;
    refunded_at?: string | null;
    created_at: string;
    updated_at?: string;
    first_order_item?: { product_id?: number | string | null; price?: number | null; quantity?: number | null } | null;
  };
};
type Page = { data: LsOrder[]; links?: { next?: string | null } };

async function get(pathOrUrl: string): Promise<Page> {
  const key = process.env.LEMONSQUEEZY_API_KEY;
  if (!key) throw new Error("LEMONSQUEEZY_API_KEY is not set");
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${BASE}${pathOrUrl}`;
  if (new URL(url).origin !== BASE) throw new Error("Refusing to send Lemon Squeezy credentials to a non-Lemon Squeezy host");
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${key}`, Accept: "application/vnd.api+json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw Object.assign(new Error(`Lemon Squeezy ${new URL(url).pathname} failed with status ${res.status}`), { status: res.status });
  try {
    return (await res.json()) as Page;
  } catch {
    throw new Error("Lemon Squeezy returned an unexpected response");
  }
}

const LOOKBACK_MS = 90 * 24 * 3600 * 1000;
const MAX_PAGES = 500;
// Only these statuses ever carried a successful charge; pending/failed/fraudulent must not count.
const COUNTED = new Set(["paid", "refunded", "partial_refund"]);

export async function fetchLemonSqueezy(src: LemonSqueezySource, since: Date): Promise<Txn[]> {
  const out: Txn[] = [];
  const productIds = new Set(src.productIds);
  // Keep paging past `since` so refunds of older orders inside the window are seen.
  const horizon = new Date(since.getTime() - LOOKBACK_MS);
  let next: string | undefined = `/v1/orders?${new URLSearchParams({ "filter[store_id]": src.storeId, "page[size]": "100" })}`;
  for (let pages = 0; next; pages++) {
    if (pages >= MAX_PAGES) throw new Error(`Lemon Squeezy orders exceeded ${MAX_PAGES} pages`);
    const page: Page = await get(next);
    let sawBeyondHorizon = false;
    for (const o of page.data) {
      const a = o.attributes;
      const createdAt = new Date(a.created_at);
      if (createdAt < horizon) sawBeyondHorizon = true;
      if (a.test_mode === true) continue;
      // The store is shared with MasteringBackend: fail closed unless the order is for one of our products.
      const productId = a.first_order_item?.product_id;
      if (productId == null || !productIds.has(String(productId))) continue;
      if (!a.status || !COUNTED.has(a.status)) continue;
      // Revenue excludes sales tax/VAT: net = subtotal - discount (minor units).
      if (typeof a.subtotal !== "number") throw new Error("Lemon Squeezy order has no subtotal");
      // Multi-item guard: we only see the first item, so skip any order whose subtotal is not
      // exactly that item (extra items may belong to MasteringBackend). Fail closed.
      const item = a.first_order_item;
      if (typeof item?.price !== "number" || a.subtotal !== item.price * (item.quantity ?? 1)) continue;
      const net = a.subtotal - (a.discount_total ?? 0);
      if (createdAt >= since) {
        out.push({ id: `lemonsqueezy-${o.id}`, at: createdAt, amountMinor: net, currency: a.currency, kind: "payment" });
      }
      // refunded_amount includes tax; pro-rate it to the tax-exclusive share of the order.
      let refunded = a.total > 0 ? Math.round(((a.refunded_amount ?? 0) * net) / a.total) : 0;
      if (!a.refunded_amount) {
        // Status says refunded but no amount: never count it as revenue.
        if (a.status === "partial_refund") throw new Error("Lemon Squeezy partial refund without amount");
        if (a.status === "refunded") refunded = net;
      }
      if (refunded > 0) {
        const at = new Date(a.refunded_at ?? a.updated_at ?? a.created_at);
        if (at >= since) {
          out.push({ id: `lemonsqueezy-refund-${o.id}`, at, amountMinor: refunded, currency: a.currency, kind: "refund" });
        }
      }
    }
    // Orders come newest first.
    next = sawBeyondHorizon ? undefined : (page.links?.next ?? undefined);
  }
  return out;
}
