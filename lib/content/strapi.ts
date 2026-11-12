import type { Post } from "@/lib/snapshot/types";

const DEFAULT_BASE = "https://cms.masteringbackend.com/api";
const BLOG_URL = "https://blog.masteringbackend.com";
const AUTHOR_SLUG = "kaperskyguru";

type Row = { attributes?: StrapiAttrs } & StrapiAttrs;
type StrapiAttrs = {
  title?: string;
  slug?: string;
  publishedAt?: string;
  createdAt?: string;
  image?: string | null;
  featured_image?: { data?: { attributes?: { url?: string } } | null };
};

/**
 * Same order as mb-blog/lib/strapi.ts mapPost: the `image` string (R2, newest) first, then the featured_image relation.
 * Strapi local uploads come back relative ("/uploads/x.png"); those are resolved against the CMS origin.
 */
const thumbnailOf = (a: StrapiAttrs, origin: string): string | undefined => {
  const url = (typeof a.image === "string" && a.image.trim()) || a.featured_image?.data?.attributes?.url || undefined;
  return url?.startsWith("/") && !url.startsWith("//") ? `${origin}${url}` : url;
};

export async function fetchBlog(): Promise<Post[]> {
  const token = process.env.STRAPI_TOKEN;
  if (!token) throw new Error("STRAPI_TOKEN is not set");
  const base = (process.env.BASE_ENDPOINT_URL || DEFAULT_BASE).replace(/\/$/, "");
  // Scheme + host only: drops the trailing /api and any other path.
  const origin = new URL(base).origin;
  // Query shape mirrors mb-blog/lib/strapi.ts (getPostsByAuthor), narrowed to the fields used.
  const query = [
    "filters[is_public][$eq]=true",
    `filters[author][slug][$eq]=${encodeURIComponent(AUTHOR_SLUG)}`,
    "pagination[page]=1",
    "pagination[pageSize]=3",
    "sort[0]=createdAt%3Adesc",
    "fields[0]=title",
    "fields[1]=slug",
    "fields[2]=publishedAt",
    "fields[3]=createdAt",
    "fields[4]=image",
    "populate[featured_image][fields][0]=url",
  ].join("&");
  const res = await fetch(`${base}/posts?${query}`, {
    headers: { Authorization: `Bearer ${token}`, "Strapi-Response-Format": "v4" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Strapi posts failed with status ${res.status}`);
  const body = (await res.json().catch(() => null)) as { data?: Row[] } | null;
  if (!Array.isArray(body?.data)) throw new Error("Strapi posts returned an unexpected response");
  return body.data
    .map((r) => r.attributes ?? r)
    .filter((a) => a.title && a.slug)
    .slice(0, 3)
    .map((a) => {
      const thumbnail = thumbnailOf(a, origin);
      return {
        title: a.title!,
        url: `${BLOG_URL}/${a.slug}`,
        date: (a.publishedAt || a.createdAt) as string,
        ...(thumbnail ? { thumbnail } : {}),
      };
    });
}
