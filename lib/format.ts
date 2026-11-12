import type { Money } from "@/lib/revenue/types";

const PROVIDER_NAMES: Record<string, string> = {
  paystack: "Paystack",
  paddle: "Paddle",
  lemonsqueezy: "Lemon Squeezy",
  gumroad: "Gumroad",
  asyncpay: "AsyncPay",
};

export function providerName(provider: string): string {
  return PROVIDER_NAMES[provider] ?? provider;
}

/** Amounts are minor units (1/100). Whole-unit display, optional compact (1.2K). */
export function formatMoney(minor: number, currency: string, opts?: { compact?: boolean }): string {
  const nf = new Intl.NumberFormat("en", {
    style: "currency",
    currencyDisplay: "narrowSymbol",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: opts?.compact ? 1 : 0,
    ...(opts?.compact ? { notation: "compact" as const } : {}),
  });
  return nf.format(minor / 100);
}

export function sortCurrencies(codes: string[]): string[] {
  const rank = (c: string) => (c === "USD" ? 0 : c === "NGN" ? 1 : 2);
  return [...codes].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

export function formatMoneyList(m: Money, suffix = "", sep = " · "): string {
  const codes = sortCurrencies(Object.keys(m).filter((c) => m[c] !== 0));
  if (codes.length === 0) return `$0${suffix}`;
  return codes.map((c) => `${formatMoney(m[c], c)}${suffix}`).join(sep);
}

const DATE_FMT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

/** "Nov 12, 2026". Pinned to UTC so server and client render the same string. */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : DATE_FMT.format(d);
}

const SHORT_FMT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/** "Sep 8" inside the current (UTC) year, "Apr 6, 2024" otherwise. */
export function formatShortDate(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.getUTCFullYear() === now.getUTCFullYear() ? SHORT_FMT.format(d) : DATE_FMT.format(d);
}
