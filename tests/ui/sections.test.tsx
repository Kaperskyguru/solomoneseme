// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { BooksShelf } from "@/components/BooksShelf";
import { LatestList } from "@/components/LatestList";
import { LatestVideo } from "@/components/LatestVideo";
import { Sponsor } from "@/components/Sponsor";
import { Footer } from "@/components/Footer";
import { site } from "@/config/site";
import { visibleSections } from "@/lib/split";
import type { Book, Post } from "@/lib/snapshot/types";

afterEach(cleanup);

const book = (id: string, downloads: number, rating?: Book["rating"]): Book => ({
  id,
  name: `Book ${id}`,
  url: `https://store.example.com/${id}`,
  cover: `https://img.example.com/${id}.png`,
  priceLabel: "$10",
  downloads,
  rating,
});
const post = (n: number): Post => ({
  title: `Post ${n}`,
  url: `https://example.com/p/${n}`,
  // A past year so the short date keeps its year regardless of when the suite runs.
  date: "2024-11-12T10:00:00Z",
  likes: n,
});

describe("BooksShelf", () => {
  it("cover per reference §10: 160px 5:8 book with a skewed page-edge strip and a spine-shaded face", () => {
    const { container } = render(<BooksShelf books={[book("a", 1200), book("b", 300)]} />);
    const big = container.querySelector<HTMLElement>("span.aspect-\\[5\\/8\\]")!;
    expect(big.style.width).toBe("160px");
    const pages = big.querySelector(".book-pages")!;
    expect(pages.className).toContain("w-[10px]");
    expect(pages.className).toContain("-skew-y-[8deg]");
    expect(big.querySelector(".book-face img")).not.toBeNull();
    // Shelf covers are plain books (no page strip).
    expect(container.querySelectorAll(".book-pages")).toHaveLength(1);
  });
  it("shows the heading with count, summed downloads and the 4.7 from 80 rating", () => {
    const { container } = render(<BooksShelf books={[book("a", 1200), book("b", 300)]} />);
    expect(screen.getByRole("heading", { name: "I wrote 2 books" })).toBeTruthy();
    expect(container.textContent).toContain("1,500 downloads · ★ 4.7 from 80 reviews");
    expect(container.textContent).toContain("Top: Book a");
  });
  it("puts a per-book rating in the cover tooltip and uses withRef links", () => {
    const { container } = render(<BooksShelf books={[book("a", 5, { avg: 4.5, count: 12 })]} />);
    expect(container.querySelector("a")!.getAttribute("title")).toContain("★ 4.5 (12)");
    for (const a of container.querySelectorAll("a")) expect(a.getAttribute("href")).toContain("ref=solomoneseme");
  });
  it("hides itself with no books", () => {
    const { container } = render(<BooksShelf books={[]} />);
    expect(container.innerHTML).toBe("");
    expect(screen.queryByRole("heading")).toBeNull();
  });
});

describe("LatestList", () => {
  it("shows 3 items with an All issues link", () => {
    const { container } = render(
      <LatestList title="Newsletter" posts={[1, 2, 3, 4].map(post)} allLabel="All issues" allUrl="https://kaperskyguru.substack.com/archive" />,
    );
    expect(container.querySelectorAll("li").length).toBe(3);
    expect(container.textContent).toContain("Nov 12, 2024");
    const all = screen.getByText(/All issues/).closest("a")!;
    expect(all.getAttribute("href")).toContain("kaperskyguru.substack.com/archive");
    expect(all.getAttribute("href")).toContain("ref=solomoneseme");
  });
  it("hides itself when empty", () => {
    const { container } = render(<LatestList title="Blog" posts={[]} allLabel="All posts" allUrl="https://x.com/a" />);
    expect(container.innerHTML).toBe("");
  });
});

describe("LatestVideo", () => {
  const latest = { id: "abc", title: "My video", thumbnail: "https://i.ytimg.com/vi/abc/hq.jpg", publishedAt: "2024-11-12T00:00:00Z", views: 12345 };
  it("renders thumbnail link, title, date and views", () => {
    const { container } = render(<LatestVideo latest={latest} />);
    expect(container.textContent).toContain("My video");
    expect(container.textContent).toContain("Nov 12, 2024");
    expect(container.textContent).toContain("12,345 views");
    expect(container.querySelector("iframe")).toBeNull();
    expect(container.querySelector("a")!.getAttribute("href")).toContain("youtube.com/watch?v=abc");
  });
  it("hides itself without data", () => {
    const { container } = render(<LatestVideo latest={undefined} />);
    expect(container.innerHTML).toBe("");
  });
});

describe("Sponsor", () => {
  it("shows as-of date, every offer price and partner names", () => {
    const { container } = render(<Sponsor sponsor={site.sponsor} />);
    expect(container.textContent).toContain("as of Nov 12, 2026");
    for (const ch of site.sponsor.channels) for (const o of ch.offers) expect(container.textContent).toContain(o.price);
    for (const p of site.sponsor.partners) expect(container.textContent).toContain(p);
    const btn = screen.getAllByText("Book on Passionfroot")[0].closest("a")!;
    expect(btn.getAttribute("href")).toContain("passionfroot.me/solomon-eseme");
  });
});

describe("Sponsor CTA style", () => {
  it("is not accent-coloured and does not stretch", () => {
    render(<Sponsor sponsor={site.sponsor} />);
    const cls = screen.getAllByText("Book on Passionfroot")[0].className;
    expect(cls).not.toContain("accent");
    expect(cls).toContain("bg-text");
    expect(cls).toMatch(/self-start|w-fit/);
  });
});

describe("visibleSections", () => {
  it("hides books and writing for a null or empty snapshot", () => {
    expect(visibleSections(null)).toEqual({ books: false, writing: false });
    expect(visibleSections({ books: [], newsletter: [], blog: [] })).toEqual({ books: false, writing: false });
  });
  it("shows writing for any one source and books when present", () => {
    expect(visibleSections({ blog: [1] }).writing).toBe(true);
    expect(visibleSections({ youtube: {} }).writing).toBe(true);
    expect(visibleSections({ books: [1] }).books).toBe(true);
  });
});

describe("Footer", () => {
  it("has only the 'Updated' freshness line, no revenue wording (owner decision)", () => {
    const { container } = render(<Footer links={site.footerLinks} updatedAt="2026-11-12T08:00:00Z" />);
    const t = container.textContent!;
    expect(t).toContain("Updated Nov 12, 2026");
    expect(t).not.toMatch(/refunds|provider fees|sales tax|original currency|conversion|company revenue/i);
  });
  it("is phone-only, with the §14 grid and 36px round icon buttons (16px icons)", () => {
    const { container } = render(<Footer links={site.footerLinks} />);
    expect(container.querySelector("footer")!.className).toContain("lg:hidden");
    expect(container.querySelector("footer > div")!.className).toContain("sm:grid-cols-[minmax(0,1fr)_auto]");
    const links = [...container.querySelectorAll("nav a")];
    expect(links).toHaveLength(site.footerLinks.length);
    for (const a of links) {
      expect(a.className).toContain("size-9");
      expect(a.className).toContain("rounded-full");
      expect(a.querySelector("svg")!.getAttribute("class")).toContain("size-4");
    }
  });
  it("omits the update line without a snapshot", () => {
    const { container } = render(<Footer links={site.footerLinks} />);
    expect(container.textContent).not.toContain("Updated");
  });
  it("lists the footer links incl. fixed Medium", () => {
    const { container } = render(<Footer links={site.footerLinks} />);
    const hrefs = [...container.querySelectorAll("a")].map((a) => a.getAttribute("href")!);
    expect(hrefs.some((h) => h.startsWith("https://medium.com/@kaperskyguru"))).toBe(true);
    for (const l of ["Medium", "Dev.to", "Backend FM", "Publication"]) expect(container.textContent).toContain(l);
  });
});
