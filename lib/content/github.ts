import type { GithubSummary } from "@/lib/snapshot/types";

const UNEXPECTED = "GitHub contributions returned an unexpected response";

/**
 * Parses GitHub's public contributions fragment: cells are `<td … data-date="YYYY-MM-DD" … data-level="0-4">`
 * (attribute order varies) and the total sits in `<h2 id="js-contribution-activity-description">` split over lines.
 */
export function parseContributions(html: string): Pick<GithubSummary, "total" | "days"> {
  const days: GithubSummary["days"] = [];
  for (const [tag] of html.matchAll(/<td\b[^>]*>/g)) {
    const date = /\bdata-date="(\d{4}-\d{2}-\d{2})"/.exec(tag)?.[1];
    const level = /\bdata-level="(\d+)"/.exec(tag)?.[1];
    if (date && level !== undefined) days.push({ date, level: Math.min(4, Number(level)) });
  }
  const heading = /<h2[^>]*id="js-contribution-activity-description"[^>]*>([\s\S]*?)<\/h2>/.exec(html)?.[1] ?? "";
  const count = /([\d,]+)\s+contributions?\b/.exec(heading.replace(/\s+/g, " "))?.[1];
  if (days.length === 0 || count === undefined) throw new Error(UNEXPECTED);
  days.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return { total: Number(count.replace(/,/g, "")), days };
}

/** Public page, no token. Errors carry fixed text only (never the URL). */
export async function fetchGithub(username: string): Promise<GithubSummary> {
  const res = await fetch(`https://github.com/users/${encodeURIComponent(username)}/contributions`, {
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`GitHub contributions failed with status ${res.status}`);
  const html = await res.text().catch(() => "");
  return { username, ...parseContributions(html) };
}
