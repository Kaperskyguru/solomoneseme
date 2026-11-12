"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/format";
import type { MonthPoint } from "@/lib/revenue/types";
import { ProductIcon } from "./ProductIcon";

const W = 300;
const H = 56;
const TOP = 7;
const MONTH_FMT = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
const monthName = (ym: string) => MONTH_FMT.format(new Date(`${ym}-01T00:00:00Z`));

/**
 * Reference §5: 300×56 viewBox stretched to the card, straight segments, area fill text@5%,
 * 1.5px line text@75%, last segment dashed text@40% when the final month is partial.
 * Plots USD if any month has it, otherwise NGN (never mixed). Hover: 1px rule + 8px dot + tooltip.
 * Fewer than 2 months (no data yet) → a flat line on the baseline, so every card has a line.
 * All-zero → on the bottom baseline; a flat non-zero series sits mid-height (never pinned to the top).
 */
export function Sparkline({ months, label, icon }: { months: MonthPoint[]; label?: string; icon?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const currency = months.some((m) => (m.totals.USD ?? 0) !== 0) ? "USD" : "NGN";
  const series = months.map((m) => m.totals[currency] ?? 0);
  const empty = series.length < 2;
  const values = empty ? [0, 0] : series;
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const flat = Math.max(...values) === Math.min(...values);
  const range = max - min;
  const y = (v: number) => {
    if (range === 0) return H; // all zero: the bottom baseline
    if (flat) return TOP + (H - TOP) / 2;
    return TOP + ((max - v) / range) * (H - TOP);
  };
  const zeroY = range === 0 || flat ? H : y(0); // the area closes to the zero line
  const pts = values.map((v, i) => [(i / (values.length - 1)) * W, y(v)] as const);
  const partial = !empty && months[months.length - 1].partial;
  const d = (p: readonly (readonly [number, number])[]) => p.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const solid = pts.slice(0, partial ? -1 : undefined);
  const [a, b] = [pts[pts.length - 2], pts[pts.length - 1]];
  const pick = (clientX: number, rect: DOMRect) =>
    setHover(Math.max(0, Math.min(values.length - 1, Math.round(((clientX - rect.left) / (rect.width || 1)) * (values.length - 1)))));
  const pct = (i: number) => (i / (values.length - 1)) * 100;
  return (
    <>
      <svg
        data-testid="sparkline"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        aria-hidden="true"
        className="absolute inset-0 size-full overflow-visible"
      >
        <path data-testid="sparkline-area" d={`${d(pts)} L${W},${zeroY} L0,${zeroY} Z`} className="fill-text/[0.05]" />
        {solid.length > 1 && (
          <path
            data-testid="sparkline-solid"
            d={d(solid)}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            className="text-text/75"
          />
        )}
        <path
          data-testid="sparkline-last"
          d={d([a, b])}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          className={partial ? "text-text/40" : "text-text/75"}
          {...(partial ? { strokeDasharray: "3 3" } : {})}
        />
      </svg>
      {!empty && (
        <div
          aria-hidden="true"
          className="absolute inset-0 touch-pan-y"
          onPointerMove={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
          onPointerLeave={() => setHover(null)}
        >
          {hover != null && (
            <>
              <span className="absolute inset-y-0 w-px -translate-x-1/2 bg-text/20" style={{ left: `${pct(hover)}%` }} />
              <span
                className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-text ring-2 ring-card"
                style={{ left: `${pct(hover)}%`, top: `${(pts[hover][1] / H) * 100}%` }}
              />
              <div
                className="absolute bottom-full z-10 mb-2 flex w-max min-w-36 flex-col gap-1.5 rounded-[10px] bg-popover px-3 py-2.5 text-xs shadow-popover"
                style={
                  hover > (values.length - 1) / 2
                    ? { right: `${100 - pct(hover)}%`, marginRight: 8 }
                    : { left: `${pct(hover)}%`, marginLeft: 8 }
                }
              >
                <p className="font-medium">{monthName(months[hover].month)}</p>
                <p className="flex justify-between gap-4">
                  <span className="flex items-center gap-2 text-muted">
                    {label && <ProductIcon product={{ name: label, icon }} size={14} />}
                    {label ?? "Revenue"}
                  </span>
                  <span className="font-medium tabular-nums">{formatMoney(values[hover], currency)}</span>
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
