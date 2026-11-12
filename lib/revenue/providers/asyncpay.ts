import type { Source } from "@/config/schema";
import type { Txn } from "../types";

export type AsyncpaySource = Extract<Source, { provider: "asyncpay" }>;

const ORIGIN = "https://api.asyncpay.io";
const MAX_PAGES = 500;

type ApRow = {
  uuid: string;
  amount: string;
  currency: string;
  status?: string;
  created_at?: string;
  last_transaction?: { status?: string; created_at?: string } | null;
  [k: string]: unknown;
};
type ApPage = { data?: { payment_requests?: { data?: ApRow[]; next_page_url?: string | null } } };

/** Dotted-path lookup, e.g. "meta_data.source". */
function pick(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const k of path.split(".")) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur;
}

function isPaid(r: ApRow): boolean {
  return r.status === "successful" || (r.status === "awaiting_verification" && r.last_transaction?.status === "successful");
}

/** Major-unit string -> minor units. Throws without echoing the row (which carries customer PII). */
function toMinor(amount: unknown): number {
  if (typeof amount !== "string" || !/^\d+(\.\d{1,2})?$/.test(amount)) throw new Error("AsyncPay returned a non-numeric amount");
  return Math.round(parseFloat(amount) * 100);
}

async function getPage(url: string): Promise<ApPage> {
  const key = process.env.ASYNCPAY_SECRET_KEY;
  if (!key) throw new Error("ASYNCPAY_SECRET_KEY is not set");
  let res: Response;
  try {
    res = await fetch(url, { headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
  } catch (e) {
    throw new Error(`AsyncPay request failed: ${(e as Error).name}`);
  }
  if (!res.ok) throw new Error(`AsyncPay payment-requests failed with status ${res.status}`);
  try {
    return (await res.json()) as ApPage;
  } catch {
    throw new Error("AsyncPay returned an unexpected response");
  }
}

/**
 * Paid payment requests whose `filter.field` matches one of `filter.values`.
 * The listing is newest-first by request creation, but a request can be paid later than it was created,
 * so every page is read and `since` is applied to the payment date.
 */
export async function fetchAsyncpay(src: AsyncpaySource, since: Date): Promise<Txn[]> {
  const out: Txn[] = [];
  const seen = new Set<string>(); // rows can shift across pages mid-crawl
  let url: string | null = `${ORIGIN}/v1/payment-requests?per_page=50&page=1`;
  for (let pages = 0; url; pages++) {
    if (pages >= MAX_PAGES) throw new Error(`AsyncPay pagination exceeded ${MAX_PAGES} pages`);
    const body = await getPage(url);
    const list = body.data?.payment_requests;
    if (!Array.isArray(list?.data)) throw new Error("AsyncPay returned an unexpected response shape");
    for (const r of list.data) {
      const v = pick(r, src.filter.field);
      if (typeof v !== "string" || !src.filter.values.includes(v) || !isPaid(r)) continue;
      const paidAt = r.last_transaction?.status === "successful" ? r.last_transaction.created_at : undefined;
      const at = new Date(paidAt ?? r.created_at ?? "");
      if (Number.isNaN(at.getTime())) throw new Error("AsyncPay returned a payment with no usable date");
      if (at < since || seen.has(r.uuid)) continue;
      seen.add(r.uuid);
      out.push({ id: `asyncpay-${r.uuid}`, at, amountMinor: toMinor(r.amount), currency: r.currency, kind: "payment" });
    }
    const next = list?.next_page_url ?? null;
    if (next && new URL(next).origin !== ORIGIN) throw new Error("Refusing to follow AsyncPay next_page_url to a different origin");
    url = next;
  }
  return out;
}
