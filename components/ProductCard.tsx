import type { ReactNode } from "react";
import type { Product } from "@/config/schema";
import { ONE_OFF_TITLE, providerName, revenuePillText } from "@/lib/format";
import { withRef } from "@/lib/links";
import type { ProductRevenue } from "@/lib/revenue/types";
import { ArrowUpRight } from "./icons";
import { ProductIcon } from "./ProductIcon";
import { Sparkline } from "./Sparkline";

/** "stale" → last refresh failed, previous numbers kept. "missing"/"ok" render the same: no data reads $0/mo. */
export type CardStatus = "ok" | "missing" | "stale";

export const isArchived = (p: Pick<Product, "badge">) => p.badge?.kind === "archived";

/** Small grey pill used for badges and compact amounts (reference §6). */
export function Badge({ children, testId }: { children: ReactNode; testId?: string }) {
  return (
    <span data-testid={testId} className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium leading-4 text-muted">
      {children}
    </span>
  );
}

/**
 * Reference §5 startup card: 18px radius, 20px padding, ring-shadow edge, 28px icon, 16px/600 name,
 * 12px/500 amount pill, 14px muted tagline (2 lines), 56px sparkline slot pinned to the bottom.
 * MasteringBackend-group products show no amount pill and no sparkline; their 56px slot holds `slot` or stays empty.
 * Archived products never link or show their URL.
 */
export function ProductCard({
  product,
  revenue,
  status = "ok",
  tagline = product.tagline,
  singleLineTagline = false,
  slot,
}: {
  product: Product;
  revenue?: ProductRevenue;
  status?: CardStatus;
  tagline?: string;
  singleLineTagline?: boolean;
  /** MB-group only: what fills the bottom slot instead of a sparkline (e.g. the company stats line). */
  slot?: ReactNode;
}) {
  const archived = isArchived(product);
  const providers = [...new Set(product.sources.map((s) => providerName(s.provider)))];
  const title = product.revenueModel === "one-off" ? ONE_OFF_TITLE : providers.length ? `Last 30 days, from ${providers.join(", ")}` : undefined;
  // MasteringBackend's revenue is private: never an amount, never a line.
  const showRevenue = product.group !== "mb";
  return (
    <article className="group relative flex h-full flex-col rounded-[18px] bg-card p-5 shadow-edge transition-shadow duration-150 has-[a:hover]:shadow-edge-hover">
      <div className="flex items-center gap-3">
        <ProductIcon product={product} size={28} />
        <h3 className="flex min-w-0 flex-1 items-center gap-1 font-semibold leading-6 tracking-tight">
          {archived ? (
            <span className="truncate">{product.name}</span>
          ) : (
            <a
              href={withRef(product.url)}
              target="_blank"
              rel="noopener"
              className="truncate decoration-text/30 underline-offset-4 outline-none hover:underline after:absolute after:inset-0 after:rounded-[18px] focus-visible:after:ring-3 focus-visible:after:ring-muted/50"
            >
              {product.name}
            </a>
          )}
          {!archived && (
            <ArrowUpRight className="size-4 shrink-0 text-muted opacity-0 transition-[opacity,transform] duration-150 group-has-[a:hover]:-translate-y-0.5 group-has-[a:hover]:translate-x-0.5 group-has-[a:hover]:opacity-100" />
          )}
        </h3>
        {product.badge && <Badge testId="badge">{product.badge.label}</Badge>}
        {status === "stale" && (
          <span data-testid="stale" title="Last refresh failed; showing the previous numbers" className="shrink-0 text-[11px] text-muted">
            stale
          </span>
        )}
        {showRevenue && (
          <span
            data-testid="revenue-pill"
            title={title}
            className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-xs font-medium tabular-nums"
          >
            {revenuePillText(product, revenue)}
          </span>
        )}
      </div>
      <p data-testid="card-tagline" className={`mt-2 text-sm text-muted ${singleLineTagline ? "truncate" : "line-clamp-2 text-pretty"}`}>
        {tagline}
      </p>
      <div className="relative z-10 mt-auto pt-5">
        <div className="relative h-14">
          {showRevenue ? <Sparkline months={revenue?.months ?? []} label={product.name} icon={product.icon} /> : slot}
        </div>
      </div>
    </article>
  );
}
