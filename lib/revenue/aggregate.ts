import type { Money, MonthPoint, Txn } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS = 12;

const signed = (t: Txn) => (t.kind === "refund" ? -t.amountMinor : t.amountMinor);

function add(m: Money, currency: string, amount: number) {
  m[currency] = (m[currency] ?? 0) + amount;
}

function pruneZero(m: Money): Money {
  return Object.fromEntries(Object.entries(m).filter(([, v]) => v !== 0));
}

const key = (y: number, m0: number) => `${y}-${String(m0 + 1).padStart(2, "0")}`;

/** Sum per currency, never converted. Refunds subtract from their own currency and month. */
export function aggregate(txns: Txn[], now: Date): { last30: Money; months: MonthPoint[] } {
  const nowMs = now.getTime();
  const since = nowMs - 30 * DAY_MS;
  const last30: Money = {};

  const months: MonthPoint[] = [];
  const byMonth = new Map<string, Money>();
  for (let i = MONTHS - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const k = key(d.getUTCFullYear(), d.getUTCMonth());
    const totals: Money = {};
    byMonth.set(k, totals);
    months.push({ month: k, totals, partial: i === 0 });
  }

  for (const t of txns) {
    const ms = t.at.getTime();
    if (ms > nowMs) continue;
    const amount = signed(t);
    if (ms > since) add(last30, t.currency, amount);
    const bucket = byMonth.get(key(t.at.getUTCFullYear(), t.at.getUTCMonth()));
    if (bucket) add(bucket, t.currency, amount);
  }

  return {
    last30: pruneZero(last30),
    months: months.map((p) => ({ ...p, totals: pruneZero(p.totals) })),
  };
}
