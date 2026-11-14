import type { Product } from "@/config/schema";
import { revenuePillText } from "@/lib/format";
import { withRef } from "@/lib/links";
import type { ProductRevenue } from "@/lib/revenue/types";
import { Badge, isArchived } from "./ProductCard";
import { ProductIcon } from "./ProductIcon";

export { isArchived };

/**
 * Reference §6 compact grid: 3 cols at xl (gap-x 32px, no row gap), 12px padded rows that bleed 12px,
 * 24px icon, 16px/500 name with an 11px grey pill, 14px muted 2-line description.
 * Pill: badge label (e.g. Archived), else the amount ($0/mo when nothing) — except MB-group products, which get none.
 */
export function CompactList({ products, revenue = {} }: { products: Product[]; revenue?: Record<string, ProductRevenue> }) {
  if (products.length === 0) return null;
  return (
    <ul className="mt-12 grid gap-x-8 sm:grid-cols-2 xl:grid-cols-3">
      {products.map((p) => {
        const archived = isArchived(p);
        const pill = p.badge ? p.badge.label : p.group === "mb" ? null : revenuePillText(p, revenue[p.id]);
        return (
          <li key={p.id}>
            <article
              className={`group relative -mx-3 flex items-start gap-3 rounded-[14px] px-3 py-3 transition-colors ${archived ? "" : "hover:bg-surface/60"}`}
            >
              <span className="mt-0.5">
                <ProductIcon product={p} size={24} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="flex items-center gap-2 font-medium leading-6 tracking-tight">
                  {archived ? (
                    <span className="truncate">{p.name}</span>
                  ) : (
                    <a
                      href={withRef(p.url)}
                      target="_blank"
                      rel="noopener"
                      className="truncate outline-none after:absolute after:inset-0 after:rounded-[14px] focus-visible:after:ring-3 focus-visible:after:ring-muted/50"
                    >
                      {p.name}
                    </a>
                  )}
                  {pill && <Badge testId="compact-pill">{pill}</Badge>}
                </h3>
                <p className="mt-0.5 line-clamp-2 text-sm text-muted text-pretty">{p.tagline}</p>
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}
