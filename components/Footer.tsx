import Image from "next/image";
import type { ReactNode } from "react";
import { formatDate } from "@/lib/format";
import { withRef } from "@/lib/links";
import { BookOpen, DevMark, LinkIcon, MediumMark, Mic, PenLine, YouTubeMark } from "./icons";

type Links = { label: string; url: string }[];

const ICONS: Record<string, ReactNode> = {
  Blog: <PenLine className="size-4" />,
  YouTube: <YouTubeMark className="size-4" />,
  Medium: <MediumMark className="size-4" />,
  "Dev.to": <DevMark className="size-4" />,
  "Backend FM": <Mic className="size-4" />,
  Publication: <BookOpen className="size-4" />,
};

/** Revenue freshness only (the oldest revenue section update). No other revenue wording (owner decision). */
export function UpdatedNote({ updatedAt, className = "" }: { updatedAt?: string; className?: string }) {
  if (!updatedAt) return null;
  return <p className={`text-xs text-muted ${className}`}>Updated {formatDate(updatedAt)}</p>;
}

/** Reference §14: 36px round ghost icon buttons, 16px icons, 2px apart. */
function IconLinks({ links, className = "" }: { links: Links; className?: string }) {
  return (
    <nav aria-label="More links" className={`flex flex-wrap gap-0.5 ${className}`}>
      {links.map((l) => (
        <a
          key={l.label}
          href={withRef(l.url)}
          target="_blank"
          rel="noopener"
          title={l.label}
          className="inline-flex size-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-text"
        >
          {ICONS[l.label] ?? <LinkIcon className="size-4" />}
          <span className="sr-only">{l.label}</span>
        </a>
      ))}
    </nav>
  );
}

/** Desktop only: the footer is hidden at lg+, so its links and the "Updated" line sit small at the bottom of the right column. */
export function SiteNote({ links, updatedAt }: { links: Links; updatedAt?: string }) {
  return (
    <div data-testid="site-note" className="mt-16 flex items-center justify-between gap-4 border-t border-border/40 pt-3 max-lg:hidden">
      <IconLinks links={links} className="-ml-2" />
      <UpdatedNote updatedAt={updatedAt} />
    </div>
  );
}

/** Reference §14: footer visible below lg only — avatar + name, one-line bio, icon links, ©. */
export function Footer({ links, updatedAt }: { links: Links; updatedAt?: string }) {
  return (
    <footer className="border-t border-border/60 lg:hidden">
      <div className="mx-auto grid max-w-5xl gap-6 px-5 pt-10 pb-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div>
          <p className="flex items-center gap-2 font-medium">
            <Image src="/img/headshot@1x.png" alt="" width={28} height={28} className="size-7 rounded-full object-cover grayscale" />
            Solomon Eseme
          </p>
          <p className="mt-2 max-w-sm text-sm text-muted">Founder of things on the internet. Software developer. Lagos, Nigeria.</p>
        </div>
        <IconLinks links={links} className="-ml-2 sm:ml-0 sm:-mr-2" />
      </div>
      <div className="mx-auto flex max-w-5xl flex-wrap justify-between gap-x-4 gap-y-1 px-5 pb-10 text-xs text-muted">
        <p>© {new Date().getUTCFullYear()} Solomon Eseme</p>
        <UpdatedNote updatedAt={updatedAt} />
      </div>
    </footer>
  );
}
