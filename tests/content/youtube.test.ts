import { afterEach, expect, it, vi } from "vitest";
import { fetchYoutube } from "@/lib/content/youtube";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status });

it("follows the uploads playlist", async () => {
  vi.stubEnv("YOUTUBE_API_KEY", "KEY123");
  const f = vi.fn(async (u: string) => {
    if (u.includes("/channels")) return json({ items: [{ statistics: { subscriberCount: "4200" }, contentDetails: { relatedPlaylists: { uploads: "UU1" } } }] });
    if (u.includes("/playlistItems")) return json({ items: [{ contentDetails: { videoId: "vid1", videoPublishedAt: "2026-11-01T00:00:00Z" }, snippet: { title: "Hello", thumbnails: { medium: { url: "https://i/m.jpg" }, high: { url: "https://i/h.jpg" } } } }] });
    if (u.includes("/videos")) return json({ items: [{ statistics: { viewCount: "999" } }] });
    return json({}, 404);
  });
  vi.stubGlobal("fetch", f);
  expect(await fetchYoutube()).toEqual({
    subscribers: 4200,
    latest: { id: "vid1", title: "Hello", thumbnail: "https://i/h.jpg", publishedAt: "2026-11-01T00:00:00Z", views: 999 },
  });
  const urls = f.mock.calls.map((c) => c[0]);
  expect(urls[0]).toContain("forHandle=%40solomoneseme");
  expect(urls[1]).toContain("playlistId=UU1");
  expect(urls[2]).toContain("id=vid1");
});

it("does not leak the key in errors", async () => {
  vi.stubEnv("YOUTUBE_API_KEY", "KEY123");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({}, 403)));
  const e = (await fetchYoutube().catch((x) => x)) as Error;
  expect(e.message).toBe("YouTube channels failed with status 403");
  expect(e.message).not.toContain("KEY123");
});

it("errors without a key", async () => {
  vi.stubEnv("YOUTUBE_API_KEY", "");
  await expect(fetchYoutube()).rejects.toThrow("YOUTUBE_API_KEY is not set");
});

it("hides parse errors behind a fixed message", async () => {
  vi.stubEnv("YOUTUBE_API_KEY", "K");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>snippet")));
  await expect(fetchYoutube()).rejects.toThrow(/^YouTube channels returned an unexpected response$/);
});

it.each([
  ["subscriberCount", { statistics: {} }, { statistics: { viewCount: "1" } }],
  ["viewCount", { statistics: { subscriberCount: "5" } }, { statistics: {} }],
])("throws when %s is missing or hidden", async (_n, chan, video) => {
  vi.stubEnv("YOUTUBE_API_KEY", "K");
  vi.stubGlobal("fetch", vi.fn(async (u: string) => {
    if (u.includes("/channels")) return json({ items: [{ ...chan, contentDetails: { relatedPlaylists: { uploads: "UU1" } } }] });
    if (u.includes("/playlistItems")) return json({ items: [{ contentDetails: { videoId: "v" }, snippet: { title: "t" } }] });
    return json({ items: [video] });
  }));
  await expect(fetchYoutube()).rejects.toThrow("YouTube statistics unavailable");
});
