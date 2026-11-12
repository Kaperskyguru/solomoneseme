import { afterEach, expect, it, vi } from "vitest";
import { fetchSubstack } from "@/lib/content/substack";

afterEach(() => vi.unstubAllGlobals());

it("maps the archive to posts", async () => {
  const f = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ posts: [{ title: "A", canonical_url: "https://s/p/a", post_date: "2026-11-01T00:00:00.000Z", reaction_count: 7, body_html: "x" }] })),
  );
  vi.stubGlobal("fetch", f);
  expect(await fetchSubstack()).toEqual([{ title: "A", url: "https://s/p/a", date: "2026-11-01T00:00:00.000Z", likes: 7 }]);
  expect(f.mock.calls[0][0]).toBe("https://kaperskyguru.substack.com/api/v1/archive?sort=new&limit=3");
});

it("throws without leaking on non-2xx", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("no", { status: 503 })));
  await expect(fetchSubstack()).rejects.toThrow("Substack archive failed with status 503");
});

it("hides parse errors behind a fixed message", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>secret-snippet")));
  await expect(fetchSubstack()).rejects.toThrow(/^Substack archive returned an unexpected response$/);
});

it("maps cover_image to thumbnail when present", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          posts: [
            { title: "A", canonical_url: "https://s/p/a", post_date: "2026-11-01T00:00:00.000Z", cover_image: "https://cdn.s/a.png" },
            { title: "B", canonical_url: "https://s/p/b", post_date: "2026-11-01T00:00:00.000Z", cover_image: null },
          ],
        }),
      ),
    ),
  );
  const [a, b] = await fetchSubstack();
  expect(a.thumbnail).toBe("https://cdn.s/a.png");
  expect(b).not.toHaveProperty("thumbnail");
});

it("still accepts a bare array", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify([{ title: "A", canonical_url: "https://s/p/a", post_date: "2026-11-01T00:00:00.000Z" }]))));
  expect((await fetchSubstack())[0].title).toBe("A");
});

it("rejects an object without a posts array", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ posts: "x" }))));
  await expect(fetchSubstack()).rejects.toThrow(/^Substack archive returned an unexpected response$/);
});
