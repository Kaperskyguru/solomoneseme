// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { RevenueChart } from "@/components/RevenueChart";
import { ProductCard } from "@/components/ProductCard";
import { CompactList } from "@/components/CompactList";
import { LatestList } from "@/components/LatestList";
import { LatestVideo } from "@/components/LatestVideo";
import { BooksShelf } from "@/components/BooksShelf";
import { products } from "@/config/products";
import { buildChartData, splitProducts, productStatus, revenueUpdatedAt } from "@/lib/split";
import { formatShortDate } from "@/lib/format";
import type { ProductRevenue, MonthPoint } from "@/lib/revenue/types";
import type { Snapshot } from "@/lib/snapshot/types";
import sample from "../fixtures/snapshot.sample.json";

afterEach(cleanup);

const NOW = new Date("2026-11-12T10:00:00Z");
const mp = (month: string, totals: Record<string, number>, partial = false): MonthPoint => ({ month, totals, partial });
const rev = (productId: string, last30: Record<string, number>, months: MonthPoint[]): ProductRevenue => ({
  productId,
  last30,
  lifetime: {},
  months,
  updatedAt: "2026-11-12T00:00:00Z",
});
const solo = products.filter((p) => p.group === "solo");
const snap = (over: Partial<Snapshot>): Snapshot => ({
  generatedAt: "2026-11-12T06:00:00Z",
  revenue: {},
  books: [],
  newsletter: [],
  blog: [],
  sections: {},
  ...over,
});

describe("RevenueChart with a null snapshot", () => {
  it("renders 12 month labels for the last 12 calendar months and the product select", () => {
    const chart = buildChartData(products, {}, NOW);
    expect(chart.months.map((m) => m.month)).toEqual([
      "2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05",
      "2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11",
    ]);
    render(<RevenueChart {...chart} />);
    const labels = screen.getAllByTestId("month-label").map((t) => t.textContent);
    expect(labels).toEqual(["Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"]);
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.options[0].textContent).toBe(`${chart.products.length} products`);
    expect(screen.getByTestId("chart-headline").textContent).toBe("$0 in 12 months");
  });
  it("on phones every other month label is hidden (6 shown, ending on the current month) and the $ drops (decision 7)", () => {
    const chart = buildChartData(products, { profaily: rev("profaily", { USD: 1000000 }, [mp("2026-10", { USD: 1000000 })]) }, NOW);
    const { container } = render(<RevenueChart {...chart} />);
    const labels = screen.getAllByTestId("month-label");
    const phone = labels.filter((t) => !t.className.includes("hidden sm:block")).map((t) => t.textContent);
    expect(phone).toEqual(["Jan", "Mar", "May", "Jul", "Sep", "Nov"]);
    for (const t of screen.getAllByTestId("y-label")) expect(t.querySelector(".max-sm\\:hidden")!.textContent).toBe("$");
    expect(container.querySelector(".h-28.sm\\:h-36")).not.toBeNull();
    expect(screen.getByTestId("chart-headline").firstElementChild!.className).toContain("max-sm:block");
  });
  it("y-axis shows 0, mid and max in compact format", () => {
    const chart = buildChartData(products, { profaily: rev("profaily", { USD: 1000000 }, [mp("2026-10", { USD: 1000000 })]) }, NOW);
    render(<RevenueChart {...chart} />);
    const ticks = screen.getAllByTestId("y-label").map((t) => t.textContent);
    expect(ticks).toEqual(["$10K", "$5K", "$0"]);
  });
});

describe("product split by tracking", () => {
  it("a tracked $0 product (BoilerplateSearch has sources, no revenue) is a card, not compact", () => {
    const { cards, compact } = splitProducts(solo, {});
    expect(cards.map((c) => c.id)).toContain("boilerplatesearch");
    expect(cards.map((c) => c.id)).toContain("books");
    expect(compact.map((c) => c.id)).not.toContain("boilerplatesearch");
  });
  it("an untracked product renders in compact with a $0/mo badge", () => {
    const { compact } = splitProducts(solo, {});
    const contentre = compact.find((p) => p.id === "techpad")!;
    expect(contentre).toBeTruthy();
    render(<CompactList products={[contentre]} />);
    expect(screen.getByText("$0/mo")).toBeTruthy();
    expect(screen.getByText(contentre.tagline).className).toContain("line-clamp-2");
  });
});

describe("tracked product status", () => {
  const profaily = products.find((p) => p.id === "profaily")!;
  const data = rev("profaily", { USD: 1000 }, [mp("2026-10", { USD: 1000 })]);
  it("no revenue entry while the snapshot exists → pill shows $0/mo, never an em dash (decision 1)", () => {
    expect(productStatus("profaily", snap({}))).toBe("missing");
    const { container } = render(<ProductCard product={profaily} status="missing" />);
    expect(screen.getByTestId("revenue-pill").textContent).toBe("$0/mo");
    expect(container.textContent).not.toContain("—");
  });
  it("section error and no entry → missing; error with data → stale", () => {
    const err = { "revenue:profaily": { updatedAt: "", error: "boom" } };
    expect(productStatus("profaily", snap({ sections: err }))).toBe("missing");
    expect(productStatus("profaily", snap({ sections: err, revenue: { profaily: data } }))).toBe("stale");
    expect(productStatus("profaily", snap({ revenue: { profaily: data } }))).toBe("ok");
    render(<ProductCard product={profaily} revenue={data} status="stale" />);
    expect(screen.getByTestId("revenue-pill").textContent).toBe("$10/mo");
    expect(screen.getByTestId("stale").textContent).toBe("stale");
  });
  it("ok status has no stale marker", () => {
    render(<ProductCard product={profaily} revenue={data} status="ok" />);
    expect(screen.queryByTestId("stale")).toBeNull();
  });
});

describe("footer freshness", () => {
  it("uses the oldest revenue:* updatedAt, falling back to generatedAt", () => {
    const s = snap({
      sections: {
        "revenue:profaily": { updatedAt: "2026-11-12T06:00:00Z" },
        "revenue:books": { updatedAt: "2026-11-09T06:00:00Z", error: "x" },
        newsletter: { updatedAt: "2026-01-01T00:00:00Z" },
      },
    });
    expect(revenueUpdatedAt(s)).toBe("2026-11-09T06:00:00Z");
    expect(revenueUpdatedAt(snap({}))).toBe("2026-11-12T06:00:00Z");
    expect(revenueUpdatedAt(null)).toBeUndefined();
  });
});

describe("writing thumbnails", () => {
  it("renders the thumbnail when present and a fallback when absent", () => {
    const { container } = render(
      <LatestList
        title="Newsletter"
        allLabel="All issues"
        allUrl="https://kaperskyguru.substack.com/archive"
        posts={[
          { title: "With", url: "https://e.com/1", date: "2026-09-08T00:00:00Z", likes: 905, thumbnail: "https://img.e.com/1.png" },
          { title: "Without", url: "https://e.com/2", date: "2026-09-01T00:00:00Z" },
        ]}
      />,
    );
    const imgs = container.querySelectorAll("img");
    expect(imgs.length).toBe(1);
    expect(imgs[0].getAttribute("src")).toBe("https://img.e.com/1.png");
    expect(screen.getAllByTestId("thumb-fallback").length).toBe(1);
    expect(container.textContent).toContain("905");
    expect(container.querySelector("[aria-label='905 likes']")).not.toBeNull();
  });
});

describe("latest video block", () => {
  it("shows bold views and the My latest video label", () => {
    render(
      <LatestVideo
        latest={{ id: "v", title: "T", thumbnail: "https://i.ytimg.com/vi/v/hq.jpg", publishedAt: "2026-11-02T00:00:00Z", views: 42243 }}
      />,
    );
    expect(screen.getByText("My latest video")).toBeTruthy();
    expect(screen.getByText("42,243").tagName).toBe("B");
  });
});

describe("books block", () => {
  it("heading reads 'I wrote 4 books' from the sample snapshot", () => {
    render(<BooksShelf books={(sample as unknown as Snapshot).books} />);
    expect(screen.getByRole("heading", { name: "I wrote 4 books" })).toBeTruthy();
  });
  it("empty covers use the fallback block, never <img src=''>", () => {
    const { container } = render(
      <BooksShelf
        books={[
          { id: "a", name: "Alpha", url: "https://store.e.com/a", cover: "", priceLabel: "$1", downloads: 10 },
          { id: "b", name: "Beta", url: "https://store.e.com/b", cover: "", priceLabel: "$1", downloads: 5 },
        ]}
      />,
    );
    for (const img of container.querySelectorAll("img")) expect(img.getAttribute("src")).toBeTruthy();
    expect(screen.getAllByTestId("cover-fallback").length).toBe(2);
  });
});

describe("formatShortDate", () => {
  it("drops the year inside the current year and keeps it otherwise", () => {
    expect(formatShortDate("2026-09-08T00:00:00Z", NOW)).toBe("Sep 8");
    expect(formatShortDate("2024-04-06T00:00:00Z", NOW)).toBe("Apr 6, 2024");
  });
});

describe("null snapshot", () => {
  it("tracked products are 'missing' and still read $0/mo (decision 1)", () => {
    expect(productStatus("profaily", null)).toBe("missing");
    render(<ProductCard product={products.find((p) => p.id === "profaily")!} status={productStatus("profaily", null)} />);
    expect(screen.getByTestId("revenue-pill").textContent).toBe("$0/mo");
  });
});
