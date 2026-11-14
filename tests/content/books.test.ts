import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchBooks } from "@/lib/content/books";
import products from "../fixtures/gumroad/products.json";

const route = (prods: unknown) => vi.fn(async () => new Response(JSON.stringify(prods)));

beforeEach(() => {
  process.env.GUMROAD_ACCESS_TOKEN = "gr_secret";
  vi.stubGlobal("fetch", route(products));
});
afterEach(() => vi.unstubAllGlobals());

describe("fetchBooks", () => {
  const src = { provider: "gumroad", exclude: ["pX"] } satisfies Parameters<typeof fetchBooks>[0];
  it("excludes ids, free downloads counted", async () => {
    const books = await fetchBooks(src, []);
    expect(books.map((b) => b.id).sort()).toEqual(["pA", "pB", "pC"]);
    expect(books.find((b) => b.id === "pA")).toMatchObject({
      downloads: 50, priceLabel: "$0+", url: "https://gum.co/a", cover: "https://img/a.png", name: "Free Guide",
    });
  });
  it("cover falls back to preview_url then empty string; no rating invented", async () => {
    const books = await fetchBooks(src, []);
    expect(books.find((b) => b.id === "pB")!.cover).toBe("https://img/b.png");
    const c = books.find((b) => b.id === "pC")!;
    expect(c.cover).toBe("");
    expect(c.rating).toBeUndefined();
  });
  it("throws a clean error on success:false or missing products", async () => {
    for (const body of [{ success: false }, {}]) {
      vi.stubGlobal("fetch", route(body));
      await expect(fetchBooks(src, [])).rejects.toThrow(/unexpected response/);
    }
  });
  it("error carries status, not the token", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 401 })));
    const e = await fetchBooks(src, []).catch((x) => x);
    expect(e.status).toBe(401);
    expect(e.message).not.toContain("gr_secret");
  });
  it("skips unpublished products", async () => {
    const body = { success: true, products: [
      { id: "u1", name: "Draft", short_url: "https://gum.co/u", formatted_price: "$5", sales_count: 9, published: false },
      { id: "u2", name: "Live", short_url: "https://gum.co/l", formatted_price: "$5", sales_count: 1, published: true },
      { id: "u3", name: "NoFlag", short_url: "https://gum.co/n", formatted_price: "$5", sales_count: 0 },
    ] };
    vi.stubGlobal("fetch", route(body));
    expect((await fetchBooks(src, [])).map((b) => b.id)).toEqual(["u2", "u3"]);
  });
  const sale = (id: string, pid: string, name: string | undefined, link: string, price: string, extra: object = {}) =>
    ({ id, product_id: pid, product_name: name, product_permalink: link, formatted_total_price: price, price: 100, currency: "usd", created_at: "2026-10-01T00:00:00Z", ...extra });
  it("ebook-only products from sales join the shelf with all-time sale counts; no duplicates; exclude respected", async () => {
    const sales = [
      sale("1", "pE", "Rust Essentials", "rust", "$12"),
      sale("2", "pE", "Rust Essentials", "rust", "$10"),
      sale("3", "pE", "Rust Essentials", "rust", "$10"),
      sale("4", "pB", "Paid Book", "b", "$19"), // already on /v2/products
      sale("5", "pX", "Hidden", "x", "$5"), // excluded
      sale("6", "pN", "No Link", "", "$7"),
    ];
    const fetchMock = route(products);
    vi.stubGlobal("fetch", fetchMock);
    const out = await fetchBooks(src, sales);
    expect(out.map((b) => b.id).sort()).toEqual(["pA", "pB", "pC", "pE", "pN"]);
    expect(out.find((b) => b.id === "pE")).toMatchObject({
      name: "Rust Essentials", downloads: 3, cover: "", priceLabel: "$12", url: "https://store.masteringbackend.com/l/rust",
    });
    expect(out.find((b) => b.id === "pB")!.downloads).toBe(120);
    expect(out.find((b) => b.id === "pN")!.url).toBe("https://solomoneseme.gumroad.com");
    expect((fetchMock.mock.calls as unknown[][]).every((c) => !String(c[0]).includes("/v2/sales"))).toBe(true); // uses the shared crawl
  });
  it("latest to oldest by first sale; a book with no sales yet comes first", async () => {
    const sales = [ // newest first, as the API returns them
      sale("1", "pA", "Free Guide", "a", "$0", { created_at: "2026-09-01T00:00:00Z" }),
      sale("2", "pE", "Rust Essentials", "rust", "$12", { created_at: "2025-06-01T00:00:00Z" }),
      sale("3", "pA", "Free Guide", "a", "$0", { created_at: "2025-03-01T00:00:00Z" }), // pA released 2025-03
      sale("4", "pB", "Paid Book", "b", "$19", { created_at: "2024-01-01T00:00:00Z", refunded: true }), // refunds still date a release
    ];
    const out = await fetchBooks(src, sales);
    expect(out.map((b) => b.id)).toEqual(["pC", "pE", "pA", "pB"]);
    expect(out.find((b) => b.id === "pA")!.releasedAt).toBe("2025-03-01T00:00:00.000Z");
    expect(out.find((b) => b.id === "pC")!.releasedAt).toBeUndefined();
  });
  it("unpublished/deleted products do not re-enter via sales", async () => {
    vi.stubGlobal("fetch", route({ success: true, products: [
      { id: "d1", name: "Draft", short_url: "u", formatted_price: "$5", sales_count: 9, published: false },
      { id: "d2", name: "Gone", short_url: "u", formatted_price: "$5", sales_count: 9, deleted: true },
    ] }));
    const out = await fetchBooks(src, [sale("1", "d1", "Draft", "d", "$5"), sale("2", "d2", "Gone", "g", "$5")]);
    expect(out).toEqual([]);
  });
  it("sale downloads skip refunded, chargedback and disputed", async () => {
    vi.stubGlobal("fetch", route({ success: true, products: [] }));
    const out = await fetchBooks(src, [
      sale("1", "pE", "E", "e", "$5"),
      sale("2", "pE", "E", "e", "$5", { refunded: true }),
      sale("3", "pE", "E", "e", "$5", { chargedback: true }),
      sale("4", "pE", "E", "e", "$5", { disputed: true }),
    ]);
    expect(out.find((b) => b.id === "pE")!.downloads).toBe(1);
  });
  it("a first sale without a name is still counted once a named sale appears", async () => {
    vi.stubGlobal("fetch", route({ success: true, products: [] }));
    const out = await fetchBooks(src, [sale("1", "pE", undefined, "", ""), sale("2", "pE", "E", "e", "$5")]);
    expect(out.find((b) => b.id === "pE")).toMatchObject({ name: "E", downloads: 2 });
  });
});
