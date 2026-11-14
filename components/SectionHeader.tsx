import type { ReactNode } from "react";
import { ArrowUpRight } from "./icons";

/** Reference §4: 15px/500 title, 14px muted count or link, 12px + 1px hairline @40% underneath, 20px below. */
export function SectionHeader({ title, right, as: Tag = "h2" }: { title: ReactNode; right?: ReactNode; as?: "h2" | "h3" }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-border/40 pb-3">
      <Tag className="text-[15px] font-medium tracking-tight">{title}</Tag>
      {right != null && <div className="text-sm text-muted tabular-nums">{right}</div>}
    </div>
  );
}

/** "All issues ↗" style external link for the right side of a section header. `href` must already carry withRef. */
export function HeaderLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className="group relative flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-text after:absolute after:-inset-x-2 after:-inset-y-2.5"
    >
      {children}
      <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </a>
  );
}
