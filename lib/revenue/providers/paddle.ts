import type { Source } from "@/config/schema";
import type { Txn } from "../types";

export type PaddleSource = Extract<Source, { provider: "paddle" }>;

const BASE = "https://api.paddle.com";
const MAX_PAGES = 500;

type LineItem = { id: string; price_id: string; totals: { total: string; tax?: string } };
type PdTxn = {
  id: string;
  billed_at?: string | null;
  created_at?: string;
  currency_code: string;
  details?: { line_items?: LineItem[] };
};
type PdAdjustment = {
  id: string;
  transaction_id: string;
  currency_code: string;
  created_at: string;
  totals?: { total: string; tax?: string };
  items?: { item_id: string; totals?: { total: string; tax?: string } }[];
};
type Page<T> = { data: T[]; meta?: { pagination?: { next?: string; has_more?: boolean } } };

// Revenue excludes tax.
const net = (t?: { total: string; tax?: string }) => (t ? Number(t.total) - Number(t.tax ?? 0) : 0);

async function get<T>(pathOrUrl: string): Promise<T> {
  const key = process.env.PADDLE_API_KEY;
  if (!key) throw new Error("PADDLE_API_KEY is not set");
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${BASE}${pathOrUrl}`;
  if (new URL(url).origin !== BASE) throw new Error("Refusing to send Paddle credentials to a non-Paddle host");
  const res = await fetch(url, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw Object.assign(new Error(`Paddle ${new URL(url).pathname} failed with status ${res.status}`), { status: res.status });
  try {
    return (await res.json()) as T;
  } catch {
    throw new Error("Paddle returned an unexpected response");
  }
}

async function allPages<T>(firstPath: string): Promise<T[]> {
  const out: T[] = [];
  let next: string | undefined = firstPath;
  for (let pages = 0; next; pages++) {
    if (pages >= MAX_PAGES) throw new Error(`Paddle ${firstPath.split("?")[0]} exceeded ${MAX_PAGES} pages`);
    const r: Page<T> = await get<Page<T>>(next);
    out.push(...r.data);
    const p = r.meta?.pagination;
    next = p?.has_more === false ? undefined : p?.next;
  }
  return out;
}

export async function fetchPaddle(src: PaddleSource, since: Date): Promise<Txn[]> {
  const classic = src.priceIds.find((id) => !id.startsWith("pri_") && !id.startsWith("REPLACE_ME_"));
  if (classic) {
    throw new Error(
      "Paddle Classic price/plan IDs are not supported: this adapter targets the Paddle Billing API (pri_… IDs)",
    );
  }
  const wanted = new Set(src.priceIds);
  const from = since.toISOString();

  // Profaily lines of a transaction: line id -> total (minor units).
  const profailyLines = (t: PdTxn) =>
    (t.details?.line_items ?? []).filter((l) => wanted.has(l.price_id));

  const txns = await allPages<PdTxn>(
    `/transactions?${new URLSearchParams({ status: "completed", "billed_at[GTE]": from, per_page: "200" })}`,
  );
  const lines = new Map<string, Map<string, number>>(); // txnId -> lineId -> minor
  const out: Txn[] = [];
  const register = (t: PdTxn) => {
    const mine = profailyLines(t);
    lines.set(t.id, new Map(mine.map((l) => [l.id, net(l.totals)])));
    return mine;
  };
  for (const t of txns) {
    const mine = register(t);
    if (!mine.length) continue;
    out.push({
      id: `paddle-${t.id}`,
      at: new Date(t.billed_at ?? t.created_at ?? from),
      amountMinor: mine.reduce((s, l) => s + net(l.totals), 0),
      currency: t.currency_code,
      kind: "payment",
    });
  }

  const adjustments = await allPages<PdAdjustment>(
    `/adjustments?${new URLSearchParams({ action: "refund", status: "approved", per_page: "200" })}`,
  );
  for (const a of adjustments) {
    const at = new Date(a.created_at);
    if (at < since) continue;
    if (!lines.has(a.transaction_id)) {
      // Original is older than `since`: fetch it and apply the same price filter.
      try {
        register((await get<{ data: PdTxn }>(`/transactions/${encodeURIComponent(a.transaction_id)}`)).data);
      } catch (e) {
        if ((e as { status?: number }).status !== 404) throw e;
        lines.set(a.transaction_id, new Map());
      }
    }
    const mine = lines.get(a.transaction_id)!;
    if (mine.size === 0) continue;
    const amount = a.items?.length
      ? a.items.filter((i) => mine.has(i.item_id)).reduce((s, i) => s + net(i.totals), 0)
      : net(a.totals);
    if (amount <= 0) continue;
    out.push({
      id: `paddle-adj-${a.id}`,
      at,
      amountMinor: amount,
      currency: a.currency_code,
      kind: "refund",
    });
  }
  return out;
}
