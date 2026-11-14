import { afterEach, expect, it, vi } from "vitest";
import { fetchBlog } from "@/lib/content/strapi";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it("maps posts, filters by author slug and builds the public URL", async () => {
  vi.stubEnv("BASE_ENDPOINT_URL", "https://cms.example/api");
  vi.stubEnv("STRAPI_TOKEN", "sekret");
  const f = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ data: [{ id: 1, attributes: { title: "T", slug: "my-post", publishedAt: "2026-10-01T00:00:00Z", createdAt: "2026-09-01T00:00:00Z" } }] })),
  );
  vi.stubGlobal("fetch", f);
  expect(await fetchBlog()).toEqual([{ title: "T", url: "https://blog.masteringbackend.com/my-post", date: "2026-10-01T00:00:00Z" }]);
  const url = f.mock.calls[0][0] as string;
  expect(url).toContain("filters[author][slug][$eq]=kaperskyguru");
  expect(url).toContain("pagination[pageSize]=3");
  expect(f.mock.calls[0][1].headers.Authorization).toBe("Bearer sekret");
});

it("errors clearly without token, and never leaks it", async () => {
  vi.stubEnv("STRAPI_TOKEN", "");
  await expect(fetchBlog()).rejects.toThrow("STRAPI_TOKEN is not set");
  vi.stubEnv("STRAPI_TOKEN", "sekret");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("x", { status: 500 })));
  await expect(fetchBlog()).rejects.toThrow(/^Strapi posts failed with status 500$/);
});

it("hides parse errors behind a fixed message", async () => {
  vi.stubEnv("STRAPI_TOKEN", "t");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>snippet")));
  await expect(fetchBlog()).rejects.toThrow(/^Strapi posts returned an unexpected response$/);
});

it("maps the image string first, then featured_image, and requests both fields", async () => {
  vi.stubEnv("STRAPI_TOKEN", "t");
  const f = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        data: [
          { id: 1, attributes: { title: "A", slug: "a", publishedAt: "2026-10-01T00:00:00Z", image: "https://r2.e/a.png", featured_image: { data: { attributes: { url: "https://s3.e/old.png" } } } } },
          { id: 2, attributes: { title: "B", slug: "b", publishedAt: "2026-10-01T00:00:00Z", image: "", featured_image: { data: { attributes: { url: "https://s3.e/b.png" } } } } },
          { id: 3, attributes: { title: "C", slug: "c", publishedAt: "2026-10-01T00:00:00Z", featured_image: { data: null } } },
        ],
      }),
    ),
  );
  vi.stubGlobal("fetch", f);
  const [a, b, c] = await fetchBlog();
  expect(a.thumbnail).toBe("https://r2.e/a.png");
  expect(b.thumbnail).toBe("https://s3.e/b.png");
  expect(c).not.toHaveProperty("thumbnail");
  const url = f.mock.calls[0][0] as string;
  expect(url).toContain("=image");
  expect(url).toContain("populate[featured_image][fields][0]=url");
});

it("prefixes relative upload URLs with the CMS origin (base URL minus /api and any path)", async () => {
  vi.stubEnv("STRAPI_TOKEN", "t");
  vi.stubEnv("BASE_ENDPOINT_URL", "https://cms.example.com/api/");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            { id: 1, attributes: { title: "A", slug: "a", publishedAt: "2026-10-01T00:00:00Z", featured_image: { data: { attributes: { url: "/uploads/x.png" } } } } },
            { id: 2, attributes: { title: "B", slug: "b", publishedAt: "2026-10-01T00:00:00Z", image: "https://r2.e/b.png" } },
          ],
        }),
      ),
    ),
  );
  const [a, b] = await fetchBlog();
  expect(a.thumbnail).toBe("https://cms.example.com/uploads/x.png");
  expect(b.thumbnail).toBe("https://r2.e/b.png");
});
