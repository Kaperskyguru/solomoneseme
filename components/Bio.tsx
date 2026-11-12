import Image from "next/image";
import type { ReactNode } from "react";
import type { Site } from "@/config/schema";
import { withRef } from "@/lib/links";
import { LinkedInMark, MailMark, XMark, YouTubeMark } from "./icons";
import { Subscribe } from "./Subscribe";

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

/** Reference §2: 32px pill links, 13px muted, 14px icon that cross-fades to its brand colour on hover. */
function Social({ href, label, icon, brand, children }: { href: string; label: string; icon: ReactNode; brand: ReactNode; children?: ReactNode }) {
  return (
    <li>
      <a
        href={href}
        aria-label={label}
        className="group -mx-2 flex h-8 items-center gap-1.5 rounded-full px-2 text-[13px] text-muted transition-colors duration-150 hover:bg-surface hover:text-text"
      >
        <span className="relative size-3.5 shrink-0">
          <span className="absolute inset-0">{icon}</span>
          <span className="absolute inset-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100">{brand}</span>
        </span>
        {children}
      </a>
    </li>
  );
}

export function Bio({ site, productCount, youtubeSubscribers }: { site: Site; productCount: number; youtubeSubscribers?: number }) {
  const { socials, newsletter } = site;
  const ytUrl = `https://www.youtube.com/${socials.youtube.channelHandle}`;
  return (
    <>
      <div aria-hidden="true" className="pointer-events-none absolute -inset-x-5 top-0 -z-10 h-56 bg-dots lg:h-96" />
      <div className="flex items-center gap-4 lg:flex-col lg:items-start lg:gap-5">
        <Image
          src="/img/headshot@2x.png"
          alt="Solomon Eseme"
          width={80}
          height={80}
          className="size-14 shrink-0 rounded-full object-cover outline outline-1 -outline-offset-1 outline-black/10 shadow-[0_8px_24px_-8px_rgb(0_0_0/0.25)] grayscale lg:size-20 dark:outline-white/10"
          priority
        />
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">Solomon Eseme</h1>
          <p data-testid="tagline" className="mt-2 text-[15px] leading-[22.5px] text-muted text-pretty">
            I got fired from an unpaid internship, so I built{" "}
            <strong className="font-medium text-text tabular-nums">{productCount}</strong> products from Lagos. One became a
            company with a team.
          </p>
        </div>
      </div>
      <Subscribe newsletter={newsletter} className="mt-4 max-lg:hidden" />
      <ul className="mt-4 flex flex-wrap items-center gap-x-5 lg:gap-x-4 xl:gap-x-6">
        <Social href={withRef(`https://x.com/${socials.x.handle}`)} label="X" icon={<XMark />} brand={<XMark className="size-3.5 text-text" />}>
          <span className="tabular-nums">{compact.format(socials.x.followers)}</span>
        </Social>
        <Social href={withRef(ytUrl)} label="YouTube" icon={<YouTubeMark />} brand={<YouTubeMark className="size-3.5 text-[#ff0000]" />}>
          {youtubeSubscribers != null && (
            <span data-testid="yt-count" className="tabular-nums">
              {compact.format(youtubeSubscribers)}
            </span>
          )}
        </Social>
        <Social
          href={withRef(socials.linkedin.url)}
          label="LinkedIn"
          icon={<LinkedInMark />}
          brand={<LinkedInMark className="size-3.5 text-[#0a66c2] dark:text-[#4a9be8]" />}
        >
          <span className="tabular-nums">{compact.format(socials.linkedin.followers)}</span>
        </Social>
        <Social href={`mailto:${socials.email}`} label="Email" icon={<MailMark />} brand={<MailMark className="size-3.5 text-text" />} />
      </ul>
    </>
  );
}
