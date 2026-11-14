import type { Site } from "@/config/schema";
import { withRef } from "@/lib/links";

const fmt = (n: number) => n.toLocaleString("en-US");

/**
 * Newsletter copy + email form (reference §2). Rendered in the aside on desktop and at the top of the
 * Newsletter card on mobile; the caller adds the responsive visibility class.
 */
export function Subscribe({ newsletter, className = "" }: { newsletter: Site["newsletter"]; className?: string }) {
  return (
    <div className={className}>
      <p className="mb-3 text-[15px] leading-[22.5px] text-muted text-pretty">
        Join <b className="rounded bg-accent px-1 font-medium text-black tabular-nums">{fmt(newsletter.subscribers)}</b>{" "}
        founders and engineers reading{" "}
        <a
          href={withRef(newsletter.substackUrl)}
          target="_blank"
          rel="noopener"
          className="underline decoration-text/30 underline-offset-4 transition-colors duration-150 hover:text-text hover:decoration-text"
        >
          {newsletter.name}
        </a>{" "}
        on building and selling software.
      </p>
      <form
        action={`${newsletter.substackUrl}/subscribe`}
        method="get"
        target="_blank"
        rel="noopener"
        className="flex items-center gap-1.5 rounded-[14px] bg-bg p-1.5 shadow-edge transition-shadow focus-within:shadow-edge-hover focus-within:ring-3 focus-within:ring-muted/25"
      >
        <input
          type="email"
          name="email"
          required
          placeholder="you@example.com"
          aria-label="Email address"
          className="h-9 min-w-0 flex-1 bg-transparent px-2.5 text-base outline-none placeholder:text-muted"
        />
        <button
          type="submit"
          className="h-9 shrink-0 rounded-lg border border-transparent bg-text px-4 text-sm font-medium text-bg transition-[background-color,transform] hover:bg-text/80 active:scale-[0.96]"
        >
          Subscribe
        </button>
      </form>
    </div>
  );
}
