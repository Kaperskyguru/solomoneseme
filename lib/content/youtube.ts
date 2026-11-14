import { site } from "@/config/site";
import type { YoutubeSummary } from "@/lib/snapshot/types";

const BASE = "https://www.googleapis.com/youtube/v3";

// The key travels in the query string, so errors never include the URL.
async function yt<T>(name: string, path: string, params: Record<string, string>): Promise<T> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("YOUTUBE_API_KEY is not set");
  const res = await fetch(`${BASE}/${path}?${new URLSearchParams({ ...params, key })}`, {
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`YouTube ${name} failed with status ${res.status}`);
  const body = (await res.json().catch(() => null)) as T | null;
  if (body === null) throw new Error(`YouTube ${name} returned an unexpected response`);
  return body;
}

export async function fetchYoutube(): Promise<YoutubeSummary> {
  const ch = await yt<{
    items?: { statistics?: { subscriberCount?: string }; contentDetails?: { relatedPlaylists?: { uploads?: string } } }[];
  }>("channels", "channels", { forHandle: site.socials.youtube.channelHandle, part: "statistics,contentDetails" });
  const channel = ch.items?.[0];
  const uploads = channel?.contentDetails?.relatedPlaylists?.uploads;
  if (!channel || !uploads) throw new Error("YouTube channel not found");

  const pl = await yt<{
    items?: {
      contentDetails?: { videoId?: string; videoPublishedAt?: string };
      snippet?: { title?: string; publishedAt?: string; thumbnails?: Record<string, { url: string }> };
    }[];
  }>("playlistItems", "playlistItems", { playlistId: uploads, part: "snippet,contentDetails", maxResults: "1" });
  const item = pl.items?.[0];
  const id = item?.contentDetails?.videoId;
  if (!item || !id) throw new Error("YouTube uploads playlist is empty");

  const v = await yt<{ items?: { statistics?: { viewCount?: string } }[] }>("videos", "videos", { id, part: "statistics" });
  const thumbs = item.snippet?.thumbnails ?? {};
  const subscribers = Number(channel.statistics?.subscriberCount);
  const views = Number(v.items?.[0]?.statistics?.viewCount);
  const raw = [channel.statistics?.subscriberCount, v.items?.[0]?.statistics?.viewCount];
  if (raw.some((x) => x === undefined || x === "") || !Number.isFinite(subscribers) || !Number.isFinite(views)) {
    throw new Error("YouTube statistics unavailable");
  }
  return {
    subscribers,
    latest: {
      id,
      title: item.snippet?.title ?? "",
      thumbnail: (thumbs.high ?? thumbs.medium ?? thumbs.default)?.url ?? "",
      publishedAt: item.contentDetails?.videoPublishedAt ?? item.snippet?.publishedAt ?? "",
      views,
    },
  };
}
