import type { Product } from "@/config/schema";
import { books } from "@/config/books";
import { sortCurrencies } from "@/lib/format";
import type { Money, MonthPoint, ProductRevenue } from "@/lib/revenue/types";
import type { Snapshot } from "@/lib/snapshot/types";

export const booksProduct: Product = {
  ...books,
  name: "Books",
  tagline: "Books on backend engineering.",
  group: "solo",
};

const hasMoney = (m: Money) => Object.values(m).some((v) => v !== 0);
const hasRevenue = (r?: ProductRevenue) => !!r && (hasMoney(r.last30) || r.months.some((x) => hasMoney(x.totals)));
/** Tracked = has a revenue source configured (or, defensively, already has revenue). */
const isTracked = (p: Product, revenue: Record<string, ProductRevenue>) => p.sources.length > 0 || hasRevenue(revenue[p.id]);

/** Cards: every tracked solo product (even at $0) plus Books. Compact: untracked solo products. */
export function splitProducts(
  list: Product[],
  revenue: Record<string, ProductRevenue>,
): { cards: Product[]; compact: Product[] } {
  const cards: Product[] = [];
  const compact: Product[] = [];
  for (const p of list) (isTracked(p, revenue) ? cards : compact).push(p);
  cards.push(booksProduct);
  const last = (p: Product, c: string) => revenue[p.id]?.last30[c] ?? 0;
  cards.sort((a, b) => last(b, "USD") - last(a, "USD") || last(b, "NGN") - last(a, "NGN"));
  return { cards, compact };
}

/** Compact order: untracked products in config order (Backend Projects/Weekly/Jobs lead), archived last. */
export function orderCompact(compact: Product[]): Product[] {
  const archived = (p: Product) => p.badge?.kind === "archived";
  return [...compact.filter((p) => !archived(p)), ...compact.filter(archived)];
}

export type ProductStatus = "ok" | "missing" | "stale";

/**
 * "missing" → no revenue entry (incl. a null snapshot); "stale" → numbers kept, last refresh failed.
 * Owner decision: anything with no amount to show reads "$0/mo" (never "—"); "stale" adds a small marker.
 */
export function productStatus(id: string, snapshot: Snapshot | null | undefined): ProductStatus {
  const r = snapshot?.revenue[id];
  if (!r) return "missing";
  return snapshot?.sections[`revenue:${id}`]?.error ? "stale" : "ok";
}

/** Footer freshness: the oldest revenue section update, else the snapshot time. */
export function revenueUpdatedAt(snapshot: Snapshot | null | undefined): string | undefined {
  if (!snapshot) return undefined;
  const times = Object.entries(snapshot.sections)
    .filter(([k, v]) => k.startsWith("revenue:") && v.updatedAt)
    .map(([, v]) => v.updatedAt)
    .sort();
  return times[0] ?? snapshot.generatedAt;
}

/** The last 12 calendar months (UTC) ending with `now`'s month, as YYYY-MM. */
export function last12Months(now: Date = new Date()): string[] {
  const out: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

const fill = (window: string[], months: MonthPoint[]): MonthPoint[] => {
  const by = new Map(months.map((m) => [m.month, m]));
  return window.map((month) => by.get(month) ?? { month, totals: {}, partial: false });
};

export type ChartData = {
  months: MonthPoint[];
  products: { id: string; name: string; icon?: string; months: MonthPoint[] }[];
  currencies: string[];
};

/**
 * Chart covers tracked solo products + books only; MasteringBackend (group "mb") is never summed.
 * Always 12 calendar months, so the chart renders (empty) even without a snapshot.
 */
export function buildChartData(list: Product[], revenue: Record<string, ProductRevenue>, now: Date = new Date()): ChartData {
  const window = last12Months(now);
  const included = [...list.filter((p) => p.group === "solo" && isTracked(p, revenue)), booksProduct];
  const byMonth = new Map<string, MonthPoint>(window.map((month) => [month, { month, totals: {}, partial: false }]));
  const currencies = new Set<string>();
  for (const p of included) {
    for (const m of revenue[p.id]?.months ?? []) {
      const cur = byMonth.get(m.month);
      if (!cur) continue;
      cur.partial = cur.partial || m.partial;
      for (const [c, v] of Object.entries(m.totals)) {
        if (v === 0) continue;
        currencies.add(c);
        cur.totals[c] = (cur.totals[c] ?? 0) + v;
      }
    }
  }
  const months = [...byMonth.values()].map((m) => ({
    ...m,
    totals: Object.fromEntries(Object.entries(m.totals).filter(([, v]) => v !== 0)),
  }));
  return {
    months,
    products: included.map((p) => ({
      id: p.id,
      name: p.name,
      ...(p.icon ? { icon: p.icon } : {}),
      months: fill(window, revenue[p.id]?.months ?? []),
    })),
    currencies: sortCurrencies([...currencies]),
  };
}

/** Which optional page sections have data. Hidden sections must not render at all (no dead gap). */
export function visibleSections(
  s: { books?: unknown[]; newsletter?: unknown[]; blog?: unknown[]; youtube?: unknown } | null | undefined,
): { books: boolean; writing: boolean } {
  return {
    books: (s?.books?.length ?? 0) > 0,
    writing: (s?.newsletter?.length ?? 0) > 0 || (s?.blog?.length ?? 0) > 0 || !!s?.youtube,
  };
}
