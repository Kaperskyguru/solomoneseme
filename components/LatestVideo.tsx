import { formatShortDate } from "@/lib/format";
import { withRef } from "@/lib/links";
import type { YoutubeSummary } from "@/lib/snapshot/types";
import { ArrowUpRight, Play, YouTubeMark } from "./icons";

export const ALL_VIDEOS_URL = "https://www.youtube.com/@solomoneseme/videos";

/** Reference §9: 1.4fr | 1fr at md+, 16:9 thumbnail with a frosted play disc, 24px/600 title. */
export function LatestVideo({ latest }: { latest?: YoutubeSummary["latest"] }) {
  if (!latest) return null;
  const href = withRef(`https://www.youtube.com/watch?v=${encodeURIComponent(latest.id)}`);
  return (
    <section id="video" aria-label="Latest video" className="pt-16">
      <div className="grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:items-center md:gap-x-10">
        <a
          href={href}
          target="_blank"
          rel="noopener"
          aria-label={`Play: ${latest.title}`}
          className="group/video relative isolate block aspect-video overflow-hidden rounded-[18px] bg-surface shadow-edge transition-shadow hover:shadow-edge-hover"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={latest.thumbnail}
            alt={latest.title}
            width={640}
            height={360}
            loading="lazy"
            className="size-full object-cover transition-transform duration-700 ease-out group-hover/video:scale-[1.03]"
          />
          <span
            aria-hidden="true"
            className="absolute inset-0 opacity-80"
            style={{ background: "radial-gradient(closest-side, rgb(0 0 0 / .22), transparent), linear-gradient(to top, rgb(0 0 0 / .3), transparent 50%)" }}
          />
          <span aria-hidden="true" className="absolute inset-0 z-10 rounded-[inherit] shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)]" />
          <span
            aria-hidden="true"
            className="absolute top-1/2 left-1/2 z-20 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-neutral-950 shadow-[0_10px_30px_-8px_rgb(0_0_0/0.5),inset_0_0_0_1px_rgb(255_255_255/0.6)] backdrop-blur-md backdrop-saturate-150 transition-[transform,background-color] group-hover/video:scale-[1.08] group-hover/video:bg-white group-active/video:scale-[0.96] sm:size-16"
          >
            <Play className="size-6 translate-x-0.5" />
          </span>
        </a>
        <div>
          <p className="flex items-center gap-2 text-sm text-muted">
            <YouTubeMark className="size-4" />
            <span>My latest video</span>
          </p>
          <h3 className="mt-1.5 text-2xl font-semibold tracking-tight text-balance">
            <a href={href} target="_blank" rel="noopener" className="decoration-text/30 underline-offset-4 hover:underline">
              {latest.title}
            </a>
          </h3>
          <p className="mt-2 text-sm text-muted">
            {formatShortDate(latest.publishedAt)} · <b className="font-medium text-text tabular-nums">{latest.views.toLocaleString("en-US")}</b> views
          </p>
          <a
            href={withRef(ALL_VIDEOS_URL)}
            target="_blank"
            rel="noopener"
            className="group mt-6 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-text"
          >
            All videos
            <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        </div>
      </div>
    </section>
  );
}
