import { withRef } from "@/lib/links";
import type { GithubSummary } from "@/lib/snapshot/types";
import { GitHubMark } from "./icons";
import { HeaderLink, SectionHeader } from "./SectionHeader";

/** Level 0…4 → text colour at 7 / 25 / 45 / 70 / 100% (reference §7). */
export const LEVELS = ["bg-text/[0.07]", "bg-text/25", "bg-text/45", "bg-text/70", "bg-text"] as const;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKS = 53;
const MOBILE_WEEKS = 26;

type Day = GithubSummary["days"][number];
type Week = (Day | null)[]; // Sunday … Saturday

/** Chronological days → the last 53 Sunday-first week columns (null pads before the first / after the last day). */
export function toWeeks(days: Day[]): Week[] {
  if (days.length === 0) return [];
  const start = new Date(`${days[0].date}T00:00:00Z`);
  const offset = start.getUTCDay();
  const weeks: Week[] = [];
  for (const d of days) {
    const idx = offset + Math.round((Date.parse(`${d.date}T00:00:00Z`) - start.getTime()) / 86_400_000);
    const w = Math.floor(idx / 7);
    while (weeks.length <= w) weeks.push(Array(7).fill(null));
    weeks[w][idx % 7] = d;
  }
  return weeks.slice(-WEEKS);
}

/** Month label at the week holding the 1st; the half's first week gets one only if the next label is ≥3 weeks away. */
function monthLabels(weeks: Week[]): { at: number; label: string }[] {
  const out: { at: number; label: string }[] = [];
  weeks.forEach((week, w) => {
    const first = week.find((d) => d && Number(d.date.slice(8, 10)) === 1);
    if (first) out.push({ at: w, label: MONTHS[Number(first.date.slice(5, 7)) - 1] });
  });
  const lead = weeks[0]?.find(Boolean);
  if (lead && (out[0]?.at ?? Infinity) >= 3) out.unshift({ at: 0, label: MONTHS[Number(lead.date.slice(5, 7)) - 1] });
  return out.filter((l, i) => i === 0 || l.at - out[i - 1].at >= 3);
}

function Half({ weeks, className = "" }: { weeks: Week[]; className?: string }) {
  return (
    <div data-testid="gh-half" className={`flex min-w-0 basis-0 flex-col ${className}`} style={{ flexGrow: weeks.length }}>
      <div className="relative h-4">
        {monthLabels(weeks).map((l) => (
          <span key={l.at} className="absolute bottom-1" style={{ left: `calc(${+((l.at / weeks.length) * 100).toFixed(4)}% + 1.5px)` }}>
            {l.label}
          </span>
        ))}
      </div>
      <div className="grid auto-cols-fr grid-flow-col grid-rows-[repeat(7,auto)]">
        {weeks.flatMap((week, w) =>
          week.map((d, i) =>
            d ? (
              <span
                key={d.date}
                data-testid="gh-cell"
                data-level={d.level}
                className={`aspect-square rounded-[3.5px] border-[1.5px] border-transparent bg-clip-padding ${LEVELS[d.level] ?? LEVELS[0]}`}
              />
            ) : (
              <span key={`pad-${w}-${i}`} className="aspect-square" />
            ),
          ),
        )}
      </div>
    </div>
  );
}

/** Reference §7: header + card with "N contributions in the last year", the week grid (last 26 weeks on mobile) and a legend. */
export function GithubGraph({ github }: { github?: GithubSummary }) {
  if (!github || github.days.length === 0) return null;
  const weeks = toWeeks(github.days);
  const split = Math.max(0, weeks.length - MOBILE_WEEKS);
  return (
    <section id="github" aria-label="GitHub" className="pt-16">
      <SectionHeader
        title="GitHub"
        right={
          <HeaderLink href={withRef(`https://github.com/${github.username}`)}>
            <GitHubMark className="size-3.5" />
            {github.username}
          </HeaderLink>
        }
      />
      <div className="rounded-[18px] bg-card p-5 shadow-edge sm:p-6">
        <p className="text-sm text-muted">
          <span className="font-medium text-text tabular-nums">{github.total.toLocaleString("en-US")}</span> contributions in the
          last year
        </p>
        <div role="img" aria-label={`${github.total} contributions in the last year`} className="mt-4 flex gap-2 text-[10px] leading-none text-muted">
          <div aria-hidden="true" className="grid shrink-0 grid-rows-[1rem_repeat(7,minmax(0,1fr))]">
            {["", "", "Mon", "", "Wed", "", "Fri", ""].map((l, i) => (
              <span key={i} className="flex items-center">
                {l}
              </span>
            ))}
          </div>
          <div aria-hidden="true" className="flex min-w-0 flex-1">
            {split > 0 && <Half weeks={weeks.slice(0, split)} className="max-sm:hidden" />}
            <Half weeks={weeks.slice(split)} />
          </div>
        </div>
        <div aria-hidden="true" className="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-muted">
          <span>Less</span>
          {LEVELS.map((c) => (
            <span key={c} className={`size-2.5 rounded-[2px] ${c}`} />
          ))}
          <span>More</span>
        </div>
      </div>
    </section>
  );
}
