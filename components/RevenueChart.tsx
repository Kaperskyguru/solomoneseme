"use client";

import { useState } from "react";
import { formatMoney, formatMoneyList } from "@/lib/format";
import type { Money, MonthPoint } from "@/lib/revenue/types";
import { ChevronDown } from "./icons";
import { ProductIcon } from "./ProductIcon";

type Props = {
  months: MonthPoint[];
  products: { id: string; name: string; icon?: string; months: MonthPoint[] }[];
  currencies: string[];
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const short = (ym: string) => MONTHS[Number(ym.slice(5, 7)) - 1] ?? ym;
const LONG_FMT = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
const long = (ym: string) => LONG_FMT.format(new Date(`${ym}-01T00:00:00Z`));
const COMPACT = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const symbol = (currency: string) =>
  new Intl.NumberFormat("en", { style: "currency", currency, currencyDisplay: "narrowSymbol" })
    .formatToParts(0)
    .find((p) => p.type === "currency")?.value ?? currency;

/** Round up to 1 / 2 / 2.5 / 5 × 10^k so the axis reads $250K, $10K, … (amounts in minor units). */
function niceCeil(v: number): number {
  if (v <= 0) return 0;
  const exp = 10 ** Math.floor(Math.log10(v));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * exp >= v) ?? 10;
  return step * exp;
}

/** "$250K" on desktop, "250K" on phones (symbol hidden below sm), real minus sign for negatives. */
function TickLabel({ value, currency }: { value: number; currency: string }) {
  return (
    <>
      {value < 0 && "−"}
      <span className="max-sm:hidden">{symbol(currency)}</span>
      {COMPACT.format(Math.abs(value) / 100)}
    </>
  );
}

const pct = (n: number) => `${+n.toFixed(4)}%`;

/**
 * Reference §3: the chart is positioned HTML (not SVG). Dashed gridlines per tick, 12 slots with bars
 * 5% of the plot wide, 2px minimum height, 3px top radius (bottom radius when below zero), the current
 * month faded to 25%. Hover shows a full-slot band and a tooltip. Currencies are never mixed: the plot
 * shows one currency at a time (USD by default) and the headline lists each currency separately.
 */
export function RevenueChart({ months, products, currencies }: Props) {
  const [currency, setCurrency] = useState(currencies[0] ?? "USD");
  const [productId, setProductId] = useState("all");
  const [hover, setHover] = useState<number | null>(null);

  const source = productId === "all" ? months : (products.find((p) => p.id === productId)?.months ?? []);
  const slots = source.slice(-12);
  const n = slots.length || 1;
  const total: Money = {};
  for (const m of slots) for (const [c, v] of Object.entries(m.totals)) total[c] = (total[c] ?? 0) + v;
  const values = slots.map((m) => m.totals[currency] ?? 0);

  const top = niceCeil(Math.max(0, ...values));
  const bottom = niceCeil(-Math.min(0, ...values));
  const range = top + bottom || 1;
  const zero = (top / range) * 100; // zero line, % from the top of the plot
  const ticks = [
    ...(top > 0 ? [{ v: top, at: 0 }, { v: top / 2, at: zero / 2 }] : []),
    { v: 0, at: top > 0 || bottom > 0 ? zero : 100 },
    ...(bottom > 0 ? [{ v: -bottom, at: 100 }] : []),
  ];
  // An invisible copy of the widest label sizes the y-label column.
  const width = (v: number) => (v < 0 ? 1 : 0) + COMPACT.format(Math.abs(v) / 100).length;
  const widest = ticks.reduce((a, t) => (width(t.v) > width(a.v) ? t : a), ticks[0]);
  const centre = (i: number) => ((i + 0.5) / n) * 100;
  const last = slots.length - 1;

  const hoverRows =
    hover == null
      ? []
      : productId === "all"
        ? products
            .map((p) => ({ p, v: p.months.find((m) => m.month === slots[hover].month)?.totals[currency] ?? 0 }))
            .filter((r) => r.v !== 0)
            .sort((a, b) => b.v - a.v)
        : [];

  return (
    <div className="rounded-[18px] bg-card p-4 shadow-edge sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <p data-testid="chart-headline" className="min-w-0 text-sm text-muted tabular-nums">
          <span className="text-xl font-semibold tracking-tight text-text max-sm:block">{formatMoneyList(total, "", " + ")}</span> in 12
          months
        </p>
        <div className="relative shrink-0">
          <select
            aria-label="Product"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="h-7 min-w-36 cursor-pointer appearance-none rounded-lg border border-border bg-transparent py-0 pr-8 pl-2.5 text-sm text-text outline-none focus-visible:ring-3 focus-visible:ring-muted/30"
          >
            <option value="all">{products.length} products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-muted" />
        </div>
      </div>

      <div className="grid grid-cols-[auto_1fr] gap-x-2 text-[11px] text-muted tabular-nums sm:gap-x-3">
        <div className="relative text-[10px] leading-none sm:text-[11px]">
          <span className="invisible block whitespace-nowrap" aria-hidden="true">
            <TickLabel value={widest.v} currency={currency} />
          </span>
          {ticks.map((t) => (
            <span
              key={t.v}
              data-testid="y-label"
              className="absolute right-0 -translate-y-1/2 leading-none whitespace-nowrap"
              style={{ top: pct(t.at) }}
            >
              <TickLabel value={t.v} currency={currency} />
            </span>
          ))}
        </div>

        <div className="relative h-28 sm:h-36">
          {ticks.map((t) => (
            <span
              key={t.v}
              {...(t.v === 0 ? { "data-testid": "zero-line" } : {})}
              className="absolute inset-x-0 border-t border-dashed border-border"
              style={{ top: pct(t.at) }}
            />
          ))}
          <div role="img" aria-label={`Monthly revenue in ${currency}`} className="absolute inset-0">
            {slots.map((m, i) => {
              const v = values[i];
              // Zero months draw at the 2px minimum on the zero line, like the reference.
              const h = (Math.abs(v) / range) * 100;
              const current = i === last || m.partial;
              const pos = v >= 0 ? { bottom: pct(100 - (top > 0 || bottom > 0 ? zero : 100)) } : { top: pct(zero) };
              return (
                <span
                  key={m.month}
                  data-bar=""
                  data-month={m.month}
                  className={`absolute -translate-x-1/2 transition-[height,bottom,top,opacity] duration-300 ease-[cubic-bezier(0.2,0,0,1)] ${
                    current ? "bg-text/25" : "bg-text"
                  } ${v >= 0 ? "rounded-t-[3px]" : "rounded-b-[3px]"}`}
                  style={{ left: pct(centre(i)), width: "5%", height: `max(${pct(h)}, 2px)`, ...pos }}
                />
              );
            })}
          </div>
          <div
            className="absolute inset-0 touch-pan-y"
            onPointerMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setHover(Math.max(0, Math.min(slots.length - 1, Math.floor(((e.clientX - r.left) / (r.width || 1)) * n))));
            }}
            onPointerLeave={() => setHover(null)}
          >
            {hover != null && slots[hover] && (
              <>
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 -translate-x-1/2 rounded-lg bg-text/[0.05]"
                  style={{ left: pct(centre(hover)), width: pct(100 / n) }}
                />
                <div
                  data-testid="chart-tooltip"
                  className="pointer-events-none absolute top-0 z-10 flex w-max min-w-36 flex-col gap-1.5 rounded-[10px] bg-popover px-3 py-2.5 text-xs text-text shadow-popover"
                  style={
                    hover >= n / 2
                      ? { right: pct(100 - (hover / n) * 100), marginRight: 4 }
                      : { left: pct(((hover + 1) / n) * 100), marginLeft: 4 }
                  }
                >
                  <p className="font-medium">{long(slots[hover].month)}</p>
                  {hoverRows.map(({ p, v }) => (
                    <p key={p.id} className="flex justify-between gap-4">
                      <span className="flex items-center gap-2 text-muted">
                        <ProductIcon product={p} size={14} />
                        {p.name}
                      </span>
                      <span className="font-medium tabular-nums">{formatMoney(v, currency)}</span>
                    </p>
                  ))}
                  <p className={`flex items-baseline justify-between gap-4 ${hoverRows.length ? "mt-0.5 border-t border-border pt-2" : ""}`}>
                    <span className="text-[10px] font-medium tracking-wider text-muted uppercase">Total</span>
                    <span className="font-medium tabular-nums">{formatMoney(values[hover], currency)}</span>
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="relative col-start-2 mt-3 h-3.5">
          {slots.map((m, i) => (
            <span
              key={m.month}
              data-testid="month-label"
              className={`absolute top-0 leading-none ${(last - i) % 2 === 1 ? "hidden sm:block" : ""}`}
              style={{ left: pct(centre(i)), transform: `translateX(-${pct(centre(i))})` }}
            >
              {short(m.month)}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[11px] text-muted">
        <p className="flex gap-4">
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2 rounded-[2px] bg-text" />
            Products
          </span>
        </p>
        {currencies.length > 1 && (
          <div role="group" aria-label="Currency" className="flex items-center gap-0.5">
            {currencies.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={c === currency}
                onClick={() => setCurrency(c)}
                className={`h-5 rounded-[5px] px-1.5 transition-colors ${c === currency ? "bg-surface font-medium text-text" : "hover:text-text"}`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
