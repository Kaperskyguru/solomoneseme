import type { Site } from "@/config/schema";
import { formatDate } from "@/lib/format";
import { withRef } from "@/lib/links";
import { ArrowUpRight } from "./icons";
import { SectionHeader } from "./SectionHeader";

/** Sponsor rate cards in the startup-card style (18px radius, 20px padding, ring-shadow edge). */
export function Sponsor({ sponsor }: { sponsor: Site["sponsor"] }) {
  return (
    <>
      <SectionHeader title="Sponsor" right={<>as of {formatDate(sponsor.asOf)}</>} />
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sponsor.channels.map((ch) => (
          <li key={ch.name}>
            <article className="flex h-full flex-col rounded-[18px] bg-card p-5 shadow-edge">
              <h3 className="font-semibold tracking-tight">{ch.name}</h3>
              <dl className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-muted">
                {ch.stats.map((s) => (
                  <div key={s.label}>
                    <dt className="inline">{s.label} </dt>
                    <dd className="inline font-medium text-text tabular-nums">{s.value}</dd>
                  </div>
                ))}
              </dl>
              <ul className="mt-4 flex-1 space-y-1.5 text-sm">
                {ch.offers.map((o) => (
                  <li key={o.name} className="flex justify-between gap-3">
                    <span className="text-muted">{o.name}</span>
                    <span className="font-medium tabular-nums">{o.price}</span>
                  </li>
                ))}
              </ul>
              <a
                href={withRef(sponsor.bookingUrl)}
                target="_blank"
                rel="noopener"
                className="mt-5 inline-flex h-9 w-fit items-center gap-1.5 self-start rounded-[10px] bg-text pr-3 pl-2.5 text-sm font-medium text-bg transition-colors hover:bg-text/80"
              >
                <ArrowUpRight className="size-4" />
                Book on Passionfroot
              </a>
            </article>
          </li>
        ))}
      </ul>
      {sponsor.partners.length > 0 && <p className="mt-4 text-sm text-muted">Worked with: {sponsor.partners.join(" · ")}</p>}
    </>
  );
}
