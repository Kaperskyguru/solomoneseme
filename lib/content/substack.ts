import { site } from "@/config/site";
import type { Post } from "@/lib/snapshot/types";

type Item = { title?: string; canonical_url?: string; post_date?: string; reaction_count?: number; cover_image?: string | null };

export async function fetchSubstack(): Promise<Post[]> {
  const res = await fetch(`${site.newsletter.substackUrl}/api/v1/archive?sort=new&limit=3`, {
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Substack archive failed with status ${res.status}`);
  const body = (await res.json().catch(() => null)) as Item[] | { posts?: unknown } | null;
  const items = Array.isArray(body) ? body : body && Array.isArray(body.posts) ? (body.posts as Item[]) : null;
  if (!items) throw new Error("Substack archive returned an unexpected response");
  return items
    .filter((i) => i.title && i.canonical_url && i.post_date)
    .slice(0, 3)
    .map((i) => ({
      title: i.title!,
      url: i.canonical_url!,
      date: i.post_date!,
      ...(typeof i.reaction_count === "number" ? { likes: i.reaction_count } : {}),
      ...(i.cover_image ? { thumbnail: i.cover_image } : {}),
    }));
}
