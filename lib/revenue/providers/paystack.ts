import type { Source } from "@/config/schema";
import type { Txn } from "../types";

export type PaystackSource = Extract<Source, { provider: "paystack" }>;

const BASE = "https://api.paystack.co";

type PsTxn = {
  id: number;
  status?: string;
  reference?: string;
  amount: number;
  currency: string;
  paid_at?: string;
  created_at?: string;
  plan?: unknown;
  plan_object?: unknown;
};
type PsRefund = {
  id: number;
  transaction?: { id?: number; reference?: string } | number | string;
  transaction_reference?: string;
  amount: number;
  currency: string;
  status?: string;
  createdAt?: string;
  refunded_at?: string;
};
type Page<T> = { data: T[]; meta?: { pageCount?: number } };

async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not set");
  const url = `${BASE}${path}${Object.keys(params).length ? `?${new URLSearchParams(params)}` : ""}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw Object.assign(new Error(`Paystack ${path} failed with status ${res.status}`), { status: res.status });
  try {
    return (await res.json()) as T;
  } catch {
    throw new Error("Paystack returned an unexpected response");
  }
}

async function allPages<T>(path: string, params: Record<string, string>): Promise<T[]> {
  const out: T[] = [];
  for (let page = 1; ; page++) {
    const r = await get<Page<T>>(path, { ...params, perPage: "100", page: String(page) });
    out.push(...r.data);
    if (page >= (r.meta?.pageCount ?? 1)) return out;
  }
}

function planCode(t: PsTxn): string | undefined {
  for (const p of [t.plan, t.plan_object]) {
    if (typeof p === "string" && p) return p;
    const code = (p as { plan_code?: string } | undefined)?.plan_code;
    if (code) return code;
  }
  return undefined;
}

export async function fetchPaystack(src: PaystackSource, since: Date): Promise<Txn[]> {
  const isProfaily = (t: PsTxn) => {
    const c = planCode(t);
    return !!c && src.planCodes.includes(c);
  };
  const from = since.toISOString();

  // Refunded payments can move from "success" to "reversed"; both are payments (the refund record subtracts).
  const txns = (await allPages<PsTxn>("/transaction", { from })).filter(
    (t) => t.status === "success" || t.status === "reversed",
  );
  const mine = new Map<string, boolean>(); // id or reference -> is Profaily
  const out: Txn[] = [];
  for (const t of txns) {
    const ok = isProfaily(t);
    mine.set(String(t.id), ok);
    if (t.reference) mine.set(t.reference, ok);
    if (ok) {
      out.push({
        id: `paystack-${t.id}`,
        at: new Date(t.paid_at ?? t.created_at ?? from),
        amountMinor: t.amount,
        currency: t.currency,
        kind: "payment",
      });
    }
  }

  const refunds = await allPages<PsRefund>("/refund", { from });
  for (const r of refunds) {
    if (r.status === "failed") continue;
    const tx = r.transaction;
    const refKey =
      r.transaction_reference ??
      (typeof tx === "object" && tx ? (tx.reference ?? String(tx.id)) : tx !== undefined ? String(tx) : undefined);
    if (!refKey) continue;
    const txId = typeof tx === "object" && tx?.id !== undefined ? String(tx.id) : typeof tx === "number" ? String(tx) : undefined;
    let ok = mine.get(refKey) ?? (txId ? mine.get(txId) : undefined);
    if (ok === undefined) {
      // Original is older than `since`: look it up by id, apply the same plan filter.
      const path = txId ? `/transaction/${encodeURIComponent(txId)}` : `/transaction/verify/${encodeURIComponent(refKey)}`;
      try {
        ok = isProfaily((await get<{ data: PsTxn }>(path)).data);
      } catch (e) {
        if ((e as { status?: number }).status !== 404) throw e;
        ok = false;
      }
      mine.set(refKey, ok);
    }
    if (!ok) continue;
    out.push({
      id: `paystack-refund-${r.id}`,
      at: new Date(r.createdAt ?? r.refunded_at ?? from),
      amountMinor: Math.abs(r.amount),
      currency: r.currency,
      kind: "refund",
    });
  }
  return out;
}
