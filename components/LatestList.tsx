import type { ReactNode } from "react";
import { formatShortDate } from "@/lib/format";
import { withRef } from "@/lib/links";
import type { Post } from "@/lib/snapshot/types";
import { Heart } from "./icons";
import { HeaderLink, SectionHeader } from "./SectionHeader";

const thumbCls =
  "relative aspect-[10/7] w-16 shrink-0 overflow-hidden rounded-[10px] bg-surface outline outline-1 -outline-offset-1 outline-black/10 sm:w-20 dark:outline-white/10";

function Thumb({ post }: { post: Post }) {
  if (!post.thumbnail) {
    return (
      <span data-testid="thumb-fallback" aria-hidden="true" className={`${thumbCls} flex items-center justify-center text-lg font-semibold text-muted`}>
        {post.title.charAt(0).toUpperCase()}
      </span>
    );
  }
  return (
    <span className={thumbCls}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={post.thumbnail} alt="" width={80} height={56} loading="lazy" className="size-full object-cover" />
    </span>
  );
}

/**
 * Reference §8 (Newsletter / Tweets column): section header + card; 3 rows of 80×56 thumb | date · ♥ likes
 * over a 17px/600 two-line title. `prepend` (the mobile subscribe block) sits at the top of the card.
 */
export function LatestList({
  title,
  posts,
  allLabel,
  allUrl,
  prepend,
}: {
  title: string;
  posts: Post[];
  allLabel: string;
  allUrl: string;
  prepend?: ReactNode;
}) {
  if (posts.length === 0 && !prepend) return null;
  return (
    <section aria-label={title} className={`flex min-w-0 flex-col pt-16 ${posts.length === 0 ? "lg:hidden" : ""}`}>
      <SectionHeader title={title} right={<HeaderLink href={withRef(allUrl)}>{allLabel}</HeaderLink>} />
      <div className="flex-1 rounded-[18px] bg-card p-5 shadow-edge sm:p-6">
        {prepend}
        {posts.length > 0 && (
          <ol className="-my-3 flex flex-col">
            {posts.slice(0, 3).map((p) => (
              <li key={p.url}>
                <article className="group relative -mx-3 grid grid-cols-[4rem_minmax(0,1fr)] items-center gap-x-4 rounded-[14px] px-3 py-3 transition-colors hover:bg-surface/60 sm:grid-cols-[5rem_minmax(0,1fr)] sm:gap-x-5">
                  <Thumb post={p} />
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <p className="flex items-center gap-1.5 text-sm text-muted tabular-nums">
                      <time dateTime={p.date}>{formatShortDate(p.date)}</time>
                      {p.likes != null && (
                        <>
                          <span aria-hidden="true">·</span>
                          <Heart className="size-[1.1em]" />
                          <span aria-label={`${p.likes} likes`}>{p.likes.toLocaleString("en-US")}</span>
                        </>
                      )}
                    </p>
                    <h3 className="line-clamp-2 min-h-[2.75em] text-[17px] leading-snug font-semibold tracking-tight text-pretty decoration-text/30 underline-offset-4 group-hover:underline">
                      <a href={withRef(p.url)} target="_blank" rel="noopener" className="outline-none after:absolute after:inset-0 after:rounded-[14px]">
                        {p.title}
                      </a>
                    </h3>
                  </div>
                </article>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
