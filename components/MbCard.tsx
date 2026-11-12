import type { Site } from "@/config/schema";
import { products } from "@/config/products";
import { ProductCard } from "./ProductCard";

const mbProduct = products.find((p) => p.id === "masteringbackend")!;
const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

/** Founded · Team · Learners. A stat that is 0 or missing shows "—" (a stat, not an amount). */
export function mbStats(mb: Partial<Site["mb"]>, live?: { learners: number }): { id: string; label: string; value: string }[] {
  const ok = (v?: number): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;
  const learners = live ? live.learners : mb.learners;
  return [
    { id: "founded", label: "Founded", value: ok(mb.founded) ? String(mb.founded) : "—" },
    { id: "team", label: "Team", value: ok(mb.team) ? compact.format(mb.team) : "—" },
    { id: "learners", label: "Learners", value: ok(learners) ? compact.format(learners) : "—" },
  ];
}

/**
 * A regular startup card (same shell and height as the others): icon, name, single-line tagline, link.
 * No amount pill and never a sparkline (company revenue is private; a flat line would read as $0).
 * The 56px bottom slot holds three stat blocks: 16px/600 value over a 12px muted label.
 */
export function MbCard({ mb, live }: { mb: Site["mb"]; live?: { learners: number } }) {
  return (
    <ProductCard
      product={mbProduct}
      tagline={mbProduct.tagline}
      singleLineTagline
      slot={
        <dl data-testid="mb-stats" className="absolute inset-x-0 bottom-0 flex gap-6">
          {mbStats(mb, live).map((s) => (
            <div key={s.id} className="flex min-w-0 flex-col-reverse">
              <dt className="text-xs leading-4 text-muted">{s.label}</dt>
              <dd data-testid={`mb-${s.id}`} className="text-base leading-6 font-semibold tracking-tight tabular-nums">
                {s.value}
              </dd>
            </div>
          ))}
        </dl>
      }
    />
  );
}
