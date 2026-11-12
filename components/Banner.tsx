import type { Site } from "@/config/schema";
import { withRef } from "@/lib/links";

export function Banner({ banner }: { banner: Site["banner"] }) {
  if (!banner.enabled) return null;
  return (
    <div className="bg-accent px-4 py-2 text-center text-sm font-semibold text-black">
      {banner.text}
      <a
        href={withRef(banner.url)}
        className="ml-2 inline-block rounded-full bg-black px-3 py-0.5 text-xs font-semibold text-white"
      >
        {banner.cta}
      </a>
    </div>
  );
}
