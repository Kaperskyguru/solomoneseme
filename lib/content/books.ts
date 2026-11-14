import type { Book } from "@/lib/snapshot/types";
import { gumroadGet, type GrSale, type GumroadSource } from "@/lib/revenue/providers/gumroad";

type GrProduct = {
  id: string;
  name: string;
  short_url: string;
  thumbnail_url?: string | null;
  preview_url?: string | null;
  formatted_price: string;
  sales_count: number;
  published?: boolean;
  deleted?: boolean;
};

const STORE = "https://store.masteringbackend.com";
const FALLBACK_URL = "https://solomoneseme.gumroad.com";

/**
 * Shelf = /v2/products plus every product seen in all-time /v2/sales. The products endpoint
 * omits ebook-type products; sales cover them (downloads = all-time sale count).
 */
function nameFields(s: GrSale) {
  return {
    name: s.product_name ?? "",
    url: s.product_permalink ? `${STORE}/l/${s.product_permalink}` : FALLBACK_URL,
    priceLabel: s.formatted_total_price ?? "",
  };
}

export async function fetchBooks(src: GumroadSource, sales: GrSale[]): Promise<Book[]> {
  const res = await gumroadGet<{ success?: boolean; products?: GrProduct[] }>(src, "/v2/products");
  if (res.success === false || !Array.isArray(res.products)) throw new Error("Gumroad /v2/products returned an unexpected response");
  const exclude = new Set(src.exclude);
  const byId = new Map<string, Book>();
  const skipped = new Set<string>(); // unpublished/deleted: must not re-enter via sales
  for (const p of res.products) {
    if (p.published === false || p.deleted === true) skipped.add(p.id);
    if (exclude.has(p.id) || skipped.has(p.id)) continue;
    byId.set(p.id, {
      id: p.id,
      name: p.name,
      url: p.short_url,
      cover: p.thumbnail_url ?? p.preview_url ?? "",
      priceLabel: p.formatted_price,
      downloads: p.sales_count,
    });
  }

  // Sales come newest first, so the first sale seen per product carries the latest price/name.
  const fromSales = new Map<string, Book>();
  for (const s of sales) {
    const id = s.product_id;
    if (!id || exclude.has(id) || skipped.has(id) || byId.has(id)) continue;
    if (s.refunded || s.chargedback || s.disputed) continue;
    const cur = fromSales.get(id);
    if (cur) {
      cur.downloads += 1;
      if (!cur.name && s.product_name) Object.assign(cur, nameFields(s));
      continue;
    }
    fromSales.set(id, { id, ...nameFields(s), cover: "", downloads: 1 });
  }
  // A product whose sales never carried a name cannot be shown.
  for (const [id, b] of fromSales) if (!b.name) fromSales.delete(id);

  // Release date = earliest sale of any kind (sales arrive newest first, so the last one seen wins).
  const firstSale = new Map<string, string>();
  for (const s of sales) if (s.product_id && s.created_at) firstSale.set(s.product_id, s.created_at);
  const books = [...byId.values(), ...fromSales.values()];
  for (const b of books) {
    const at = firstSale.get(b.id);
    if (at) b.releasedAt = new Date(at).toISOString();
  }
  // Latest to oldest; a book with no sales yet is the newest.
  const t = (b: Book) => (b.releasedAt ? Date.parse(b.releasedAt) : Infinity);
  return books.sort((a, b) => t(b) - t(a));
}
