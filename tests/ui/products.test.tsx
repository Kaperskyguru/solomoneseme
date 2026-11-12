// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { ProductIcon } from "@/components/ProductIcon";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MbCard } from "@/components/MbCard";
import { ProductCard } from "@/components/ProductCard";
import { CompactList } from "@/components/CompactList";
import { Sparkline } from "@/components/Sparkline";
import { RevenueChart } from "@/components/RevenueChart";
import { site } from "@/config/site";
import { products } from "@/config/products";
import { splitProducts, orderCompact, buildChartData } from "@/lib/split";
import type { ProductRevenue, MonthPoint } from "@/lib/revenue/types";

afterEach(cleanup);

const rev = (productId: string, last30: Record<string, number>, months: MonthPoint[]): ProductRevenue => ({
  productId,
  last30,
  months,
  updatedAt: "2026-11-12T00:00:00Z",
});
const mp = (month: string, totals: Record<string, number>, partial = false): MonthPoint => ({ month, totals, partial });
const solo = products.filter((p) => p.group === "solo");
const mbProducts = products.filter((p) => p.group === "mb");

describe("MbCard live stats", () => {
  it("renders snapshot values over config, compact", () => {
    render(<MbCard mb={{ ...site.mb, learners: 5 }} live={{ learners: 12400 }} />);
    expect(screen.getByTestId("mb-learners").textContent).toBe("12.4K");
    expect(screen.getByTestId("mb-founded").textContent).toBe("2020");
  });
  it("falls back to config when no snapshot value", () => {
    render(<MbCard mb={{ ...site.mb, learners: 2000 }} />);
    expect(screen.getByTestId("mb-learners").textContent).toBe("2K");
  });
});

describe("MbCard (decision 2: a regular card)", () => {
  it("links to MB only, never money, no Company tag, no amount pill (decision 3)", () => {
    const { container } = render(<MbCard mb={site.mb} />);
    expect(container.textContent).not.toMatch(/[$₦]/);
    expect(container.textContent).not.toContain("Company");
    expect(screen.queryByTestId("revenue-pill")).toBeNull();
    expect(container.textContent).not.toMatch(/Become a|Ship 30|Backend Projects|Backend Weekly|Get Backend Jobs/);
    const hrefs = [...container.querySelectorAll("a")].map((a) => a.getAttribute("href")!);
    expect(hrefs.length).toBe(1);
    expect(hrefs[0]).toContain("masteringbackend.com");
    expect(hrefs[0]).toContain("ref=solomoneseme");
  });
  it("uses exactly the startup-card shell, with a single-line tagline", () => {
    const mb = render(<MbCard mb={site.mb} />).container.querySelector("article")!.className;
    cleanup();
    const other = render(<ProductCard product={products.find((p) => p.id === "profaily")!} />).container.querySelector("article")!.className;
    expect(mb).toBe(other);
    expect(mb).not.toMatch(/col-span|border-\[|accent/);
    cleanup();
    render(<MbCard mb={site.mb} />);
    expect(screen.getByTestId("card-tagline").className).toContain("truncate");
    expect(screen.getByTestId("card-tagline").className).not.toContain("line-clamp-2");
  });
  it("bottom slot: three stat blocks in order Founded, Team, Learners (value 16px/600 over a 12px muted label)", () => {
    render(<MbCard mb={{ learners: 12400, founded: 2020, team: 5 }} />);
    const blocks = [...screen.getByTestId("mb-stats").querySelectorAll(":scope > div")];
    expect(blocks.map((b) => b.querySelector("dt")!.textContent)).toEqual(["Founded", "Team", "Learners"]);
    expect(blocks.map((b) => b.querySelector("dd")!.textContent)).toEqual(["2020", "5", "12.4K"]);
    const dd = blocks[0].querySelector("dd")!.className;
    for (const c of ["text-base", "font-semibold"]) expect(dd).toContain(c);
    const dt = blocks[0].querySelector("dt")!.className;
    for (const c of ["text-xs", "text-muted"]) expect(dt).toContain(c);
    expect(screen.getByTestId("mb-stats").className).toContain("gap-6");
  });
  it("with the owner-confirmed config: 2020 and 5, and '—' for zero learners until live data", () => {
    render(<MbCard mb={site.mb} />);
    expect(screen.getByTestId("mb-founded").textContent).toBe("2020");
    expect(screen.getByTestId("mb-team").textContent).toBe("5");
    expect(screen.getByTestId("mb-learners").textContent).toBe("—");
    expect(screen.queryByText("Countries")).toBeNull();
  });
  it("never a sparkline, even with revenue data; the 56px slot keeps the card height", () => {
    const { container } = render(<MbCard mb={site.mb} />);
    expect(container.querySelector("[data-testid=sparkline]")).toBeNull();
    expect(container.querySelector(".h-14 [data-testid=mb-stats]")).not.toBeNull();
    cleanup();
    const mb = products.find((p) => p.id === "masteringbackend")!;
    const r = rev("masteringbackend", { USD: 999 }, [mp("2026-09", { USD: 1 }), mp("2026-10", { USD: 2 })]);
    const c2 = render(<ProductCard product={mb} revenue={r} />).container;
    expect(c2.querySelector("[data-testid=sparkline]")).toBeNull();
    expect(c2.textContent).not.toMatch(/[$₦]/);
  });
});

describe("Backend Projects / Weekly / Jobs (owner decision: untracked solo listings)", () => {
  const ids = ["backendprojects", "backendweekly", "getbackendjobs"];
  const three = ids.map((id) => products.find((p) => p.id === id)!);
  it("are group solo with no sources; only MasteringBackend stays group mb", () => {
    expect(mbProducts.map((p) => p.id)).toEqual(["masteringbackend"]);
    for (const p of three) {
      expect(p.group).toBe("solo");
      expect(p.sources).toEqual([]);
    }
  });
  it("show the $0/mo pill like other compact listings, with withRef links and no Company tag", () => {
    const { container } = render(<CompactList products={three} />);
    expect(screen.getAllByTestId("compact-pill").map((p) => p.textContent)).toEqual(["$0/mo", "$0/mo", "$0/mo"]);
    expect(container.textContent).not.toContain("Company");
    const hrefs = [...container.querySelectorAll("a")].map((a) => a.getAttribute("href")!);
    expect(hrefs.length).toBe(3);
    hrefs.forEach((h) => expect(h).toContain("ref=solomoneseme"));
  });
  it("lead the compact list in config order, archived last; they never reach the chart", () => {
    const { compact } = splitProducts(solo, {});
    const ordered = orderCompact(compact).map((p) => p.id);
    expect(ordered.slice(0, 3)).toEqual(ids);
    expect(ordered.slice(-2).sort()).toEqual(["contentre", "nuxifysaas"]);
    const chartIds = buildChartData(products, {}, new Date("2026-11-12T00:00:00Z")).products.map((p) => p.id);
    for (const id of ids) expect(chartIds).not.toContain(id);
  });
});

describe("chart data", () => {
  const NOW = new Date("2026-11-12T00:00:00Z");
  it("excludes mb: totals = tracked solo products + books only", () => {
    const revenue = {
      profaily: rev("profaily", { USD: 100 }, [mp("2026-10", { USD: 100 })]),
      books: rev("books", { USD: 50, NGN: 1000 }, [mp("2026-10", { USD: 50, NGN: 1000 })]),
      masteringbackend: rev("masteringbackend", { USD: 99999 }, [mp("2026-10", { USD: 99999 })]),
    };
    const d = buildChartData(products, revenue, NOW);
    expect(d.months.find((m) => m.month === "2026-10")).toEqual(mp("2026-10", { USD: 150, NGN: 1000 }));
    expect(d.months.filter((m) => Object.keys(m.totals).length > 0).length).toBe(1);
    expect(d.products.map((p) => p.id).sort()).toEqual(["boilerplatesearch", "books", "masteringai", "profaily"]);
    expect(d.products.map((p) => p.id)).not.toContain("masteringbackend");
    expect(d.currencies).toEqual(["USD", "NGN"]);
  });
  it("handles a null/empty revenue map: 12 empty months", () => {
    const d = buildChartData(products, {}, NOW);
    expect(d.months.length).toBe(12);
    expect(d.months.every((m) => Object.keys(m.totals).length === 0)).toBe(true);
    expect(d.currencies).toEqual([]);
  });
});

describe("split", () => {
  it("sorts cards by USD then NGN; untracked products go compact; books joins", () => {
    const revenue = {
      affizy: rev("affizy", { USD: 500 }, [mp("2026-10", { USD: 500 })]),
      profaily: rev("profaily", { USD: 900 }, [mp("2026-10", { USD: 900 })]),
      techpad: rev("techpad", { NGN: 7000 }, [mp("2026-10", { NGN: 7000 })]),
      books: rev("books", { USD: 700 }, [mp("2026-10", { USD: 700 })]),
    };
    const { cards, compact } = splitProducts(solo, revenue);
    // Tracked ($0) boilerplatesearch + masteringai follow the earners, in config order.
    expect(cards.map((c) => c.id)).toEqual(["profaily", "books", "affizy", "techpad", "boilerplatesearch", "masteringai"]);
    expect(cards.find((c) => c.id === "books")!.name).toBe("Books");
    expect(compact.map((c) => c.id)).not.toContain("profaily");
    expect(compact.length).toBe(solo.length - 5);
  });
  it("an untracked product with only historic months is a card", () => {
    const revenue = { affizy: rev("affizy", {}, [mp("2026-03", { USD: 100 })]) };
    expect(splitProducts(solo, revenue).cards.map((c) => c.id)).toContain("affizy");
  });
  it("absent revenue: tracked products + books are cards, the rest compact", () => {
    const { cards, compact } = splitProducts(solo, {});
    expect(cards.map((c) => c.id)).toEqual(["boilerplatesearch", "masteringai", "books"]);
    expect(compact.length).toBe(solo.length - 2);
    expect(compact.every((p) => p.sources.length === 0)).toBe(true);
  });
});

describe("ProductCard", () => {
  const profaily = products.find((p) => p.id === "profaily")!;
  it("currencies never mixed: pill lists each, title names providers", () => {
    const r = rev("profaily", { USD: 1000, NGN: 500000 }, [mp("2026-09", { USD: 1000 }), mp("2026-10", { USD: 1000 })]);
    const twoProviders = { ...profaily, sources: [{ provider: "paddle" as const, account: "mb_shared" as const, priceIds: ["pri_x"] }, { provider: "paystack" as const, account: "mb_shared" as const, planCodes: ["PLN_x"] }] };
    render(<ProductCard product={twoProviders} revenue={r} />);
    const pill = screen.getByTestId("revenue-pill");
    expect(pill.textContent).toBe("$10/mo · ₦5,000/mo");
    expect(pill.getAttribute("title")).toBe("Last 30 days, from Paddle, Paystack");
  });
  it("absent revenue shows $0/mo and a flat baseline sparkline (every card has a line)", () => {
    render(<ProductCard product={profaily} />);
    expect(screen.getByTestId("revenue-pill").textContent).toBe("$0/mo");
    expect(screen.getByTestId("sparkline-last").getAttribute("d")).toBe("M0.0,56.0 L300.0,56.0");
  });
  it("one-off: 12-month sum per currency, single ' · 12 mo' suffix, explanatory tooltip", () => {
    const bs = products.find((p) => p.id === "boilerplatesearch")!;
    const r = rev("boilerplatesearch", { USD: 0 }, [mp("2026-05", { USD: 2000, NGN: 100000 }), mp("2026-09", { USD: 3000, NGN: 50000 })]);
    render(<ProductCard product={bs} revenue={r} />);
    const pill = screen.getByTestId("revenue-pill");
    expect(pill.textContent).toBe("$50 · ₦1,500 · 12 mo");
    expect(pill.getAttribute("title")).toBe("Total revenue over the last 12 months (one-off sales, not monthly recurring)");
  });
  it("one-off empty shows $0 · 12 mo; recurring stays /mo; MB card has no pill", () => {
    const bs = products.find((p) => p.id === "boilerplatesearch")!;
    render(<ProductCard product={bs} />);
    expect(screen.getByTestId("revenue-pill").textContent).toBe("$0 · 12 mo");
    cleanup();
    render(<ProductCard product={profaily} revenue={rev("profaily", { USD: 1000 }, [mp("2026-10", { USD: 99999 })])} />);
    expect(screen.getByTestId("revenue-pill").textContent).toBe("$10/mo");
    cleanup();
    render(<ProductCard product={products.find((p) => p.group === "mb")!} />);
    expect(screen.queryByTestId("revenue-pill")).toBeNull();
  });
  it("multi-line tagline keeps text-pretty; the single-line variant must not (it would undo truncate's nowrap)", () => {
    render(<ProductCard product={profaily} />);
    expect(screen.getByTestId("card-tagline").className).toContain("line-clamp-2 text-pretty");
    cleanup();
    render(<ProductCard product={profaily} singleLineTagline />);
    const cls = screen.getByTestId("card-tagline").className;
    expect(cls).toContain("truncate");
    expect(cls).not.toContain("text-pretty");
  });
  it("renders badge pill, link with ref, and letter tile for placeholder icons", () => {
    const sold = { ...profaily, icon: undefined, badge: { kind: "sold" as const, label: "Sold" } };
    const { container } = render(<ProductCard product={sold} />);
    expect(screen.getByText("Sold")).toBeTruthy();
    expect(container.querySelector("a")!.getAttribute("href")).toContain("ref=solomoneseme");
    expect(container.querySelector("img")).toBeNull();
  });
});

describe("CompactList", () => {
  it("rows bleed 12px with 14px radius in a 3-col xl grid (reference §6)", () => {
    const { container } = render(<CompactList products={solo.slice(0, 1)} />);
    expect(container.querySelector("ul")!.className).toContain("xl:grid-cols-3");
    expect(container.querySelector("article")!.className).toContain("-mx-3");
  });
  it("shows $0/mo for products with no revenue", () => {
    const list = solo.slice(0, 2);
    render(<CompactList products={list} />);
    expect(screen.getAllByText("$0/mo").length).toBe(2);
  });
});

describe("archived products", () => {
  const archived = products.filter((p) => p.badge?.kind === "archived");
  it("contentre and nuxifysaas are archived", () => {
    expect(archived.map((p) => p.id).sort()).toEqual(["contentre", "nuxifysaas"]);
  });
  it("compact list renders them with no anchor, no URL, and an Archived badge", () => {
    const { container } = render(<CompactList products={archived} />);
    expect(container.querySelector("a")).toBeNull();
    expect(container.innerHTML).not.toContain("contentre.io");
    expect(container.innerHTML).not.toContain("nuxifysaas.com");
    expect(screen.getAllByText("Archived").length).toBe(2);
    expect(screen.getByText("Contentre")).toBeTruthy();
  });
  it("ProductCard renders no anchor or URL for an archived product", () => {
    for (const p of archived) {
      const { container } = render(<ProductCard product={p} />);
      expect(container.querySelector("a")).toBeNull();
      expect(container.innerHTML).not.toMatch(/contentre\.io|nuxifysaas\.com/);
      expect(screen.getByText("Archived")).toBeTruthy();
      cleanup();
    }
  });
});

describe("Sparkline", () => {
  it("all-zero series sits on the bottom baseline and the area closes to it", () => {
    render(<Sparkline months={[mp("2026-09", {}), mp("2026-10", {}), mp("2026-11", {})]} />);
    expect(screen.getByTestId("sparkline-solid").getAttribute("d")).toBe("M0.0,56.0 L150.0,56.0 L300.0,56.0");
    expect(screen.getByTestId("sparkline-area").getAttribute("d")).toMatch(/L300,56 L0,56 Z$/);
  });
  it("a flat positive series is not pinned to the top", () => {
    render(<Sparkline months={[mp("2026-09", { USD: 500 }), mp("2026-10", { USD: 500 })]} />);
    const y = Number(/M0\.0,([\d.]+)/.exec(screen.getByTestId("sparkline-last").getAttribute("d")!)![1]);
    expect(y).toBeGreaterThan(7);
    expect(y).toBeLessThan(56);
  });
  it("a positive/negative series closes the area to the zero line, not the bottom", () => {
    render(<Sparkline months={[mp("2026-09", { USD: 100 }), mp("2026-10", { USD: -100 })]} />);
    expect(screen.getByTestId("sparkline-area").getAttribute("d")).toMatch(/L300,31\.5 L0,31\.5 Z$/);
  });
  it("draws inside a 300×56 box: 5% area, 1.5px line at 75%, dashed last segment at 40%", () => {
    render(<Sparkline months={[mp("2026-09", { USD: 100 }), mp("2026-10", { USD: 300 }), mp("2026-11", { USD: 200 }, true)]} />);
    expect(screen.getByTestId("sparkline").getAttribute("viewBox")).toBe("0 0 300 56");
    expect(screen.getByTestId("sparkline-area").getAttribute("class")).toContain("fill-text/[0.05]");
    expect(screen.getByTestId("sparkline-solid").getAttribute("class")).toContain("text-text/75");
    expect(screen.getByTestId("sparkline-solid").getAttribute("stroke-width")).toBe("1.5");
    expect(screen.getByTestId("sparkline-last").getAttribute("class")).toContain("text-text/40");
    expect(screen.getByTestId("sparkline-last").getAttribute("stroke-dasharray")).toBe("3 3");
  });
  it("last segment dashed when month partial", () => {
    render(<Sparkline months={[mp("2026-09", { USD: 100 }), mp("2026-10", { USD: 300 }), mp("2026-11", { USD: 200 }, true)]} />);
    expect(screen.getByTestId("sparkline-last").getAttribute("stroke-dasharray")).toBeTruthy();
  });
  it("not dashed when complete; falls back to NGN", () => {
    const { container } = render(<Sparkline months={[mp("2026-09", { NGN: 100 }), mp("2026-10", { NGN: 300 })]} />);
    expect(container.querySelector("[data-testid=sparkline-last]")!.getAttribute("stroke-dasharray")).toBeNull();
  });
});

describe("RevenueChart", () => {
  const months = [mp("2026-09", { USD: 1000, NGN: 500000 }), mp("2026-10", { USD: 2000, NGN: 0 }, true)].map((m) => ({
    ...m,
    totals: Object.fromEntries(Object.entries(m.totals).filter(([, v]) => v !== 0)),
  }));
  const props = {
    months,
    products: [{ id: "profaily", name: "Profaily", months: [mp("2026-10", { USD: 700 })] }],
    currencies: ["USD", "NGN"],
  };
  it("headline joins currencies with ' + ', the plot shows one currency at a time (USD default)", () => {
    const { container } = render(<RevenueChart {...props} />);
    expect(screen.getByTestId("chart-headline").textContent).toBe("$30 + ₦5,000 in 12 months");
    const ticks = () => screen.getAllByTestId("y-label").map((t) => t.textContent).join(" ");
    expect(screen.getByRole("button", { name: "USD" }).getAttribute("aria-pressed")).toBe("true");
    expect(ticks()).toBe("$20 $10 $0");
    expect(container.querySelectorAll("[data-bar]").length).toBe(2);
    fireEvent.click(screen.getByRole("button", { name: "NGN" }));
    expect(ticks()).toBe("₦5K ₦2.5K ₦0");
    // The NGN-less month still draws, at the 2px minimum on the zero line.
    const ngn = [...container.querySelectorAll<HTMLElement>("[data-bar]")];
    expect(ngn.length).toBe(2);
    expect(ngn[1].style.height).toBe("max(0%, 2px)");
  });
  it("is positioned HTML, not SVG: 5%-wide bars on slot centres, current month faded to 25%", () => {
    const { container } = render(<RevenueChart {...props} />);
    expect(container.querySelector("svg[role=img]")).toBeNull();
    const bars = [...container.querySelectorAll<HTMLElement>("[data-bar]")];
    expect(bars.map((b) => b.style.width)).toEqual(["5%", "5%"]);
    expect(bars.map((b) => b.style.left)).toEqual(["25%", "75%"]);
    expect(bars[0].className).toMatch(/(^| )bg-text( |$)/);
    expect(bars[0].className).toContain("rounded-t-[3px]");
    expect(bars[1].className).toContain("bg-text/25");
    expect(bars[0].style.height).toBe("max(50%, 2px)");
    expect([...container.querySelectorAll("span.border-dashed")].length).toBe(3);
  });
  it("product filter changes the headline; toggle hidden for one currency", () => {
    render(<RevenueChart {...props} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "profaily" } });
    expect(screen.getByTestId("chart-headline").textContent).toBe("$7 in 12 months");
    cleanup();
    render(<RevenueChart {...props} currencies={["USD"]} />);
    expect(screen.queryByRole("button", { name: "NGN" })).toBeNull();
  });
  it("negative months hang below the zero line with a real minus on the axis", () => {
    const { container } = render(
      <RevenueChart months={[mp("2026-09", { USD: 1000 }), mp("2026-10", { USD: -500 })]} products={[]} currencies={["USD"]} />,
    );
    // Domain $10 … −$5 → zero line at 66.6667% from the top.
    const zero = container.querySelector<HTMLElement>("[data-testid=zero-line]")!.style.top;
    expect(zero).toBe("66.6667%");
    const bars = [...container.querySelectorAll<HTMLElement>("[data-bar]")];
    expect(bars[0].style.bottom).toBe("33.3333%");
    expect(bars[1].style.top).toBe(zero);
    expect(bars[1].className).toContain("rounded-b-[3px]");
    expect(screen.getAllByTestId("y-label").map((t) => t.textContent)).toEqual(["$10", "$5", "$0", "−$5"]);
  });
  it("hover shows the month band and a tooltip with per-product rows and a total", () => {
    const { container } = render(
      <RevenueChart
        months={[mp("2026-09", { USD: 1000 }), mp("2026-10", { USD: 3000 })]}
        products={[
          { id: "profaily", name: "Profaily", months: [mp("2026-09", {}), mp("2026-10", { USD: 1000 })] },
          { id: "books", name: "Books", months: [mp("2026-09", { USD: 1000 }), mp("2026-10", { USD: 2000 })] },
        ]}
        currencies={["USD"]}
      />,
    );
    const overlay = container.querySelector<HTMLElement>(".touch-pan-y")!;
    overlay.getBoundingClientRect = () => ({ left: 0, width: 200, top: 0, height: 100, right: 200, bottom: 100, x: 0, y: 0, toJSON: () => ({}) });
    fireEvent.pointerMove(overlay, { clientX: 150 });
    const tip = screen.getByTestId("chart-tooltip");
    // Letter tiles (no icon configured) contribute their initial.
    expect(tip.textContent).toBe("October 2026BBooks$20PProfaily$10Total$30");
    fireEvent.pointerLeave(overlay);
    expect(screen.queryByTestId("chart-tooltip")).toBeNull();
  });
});

describe("ProductIcon", () => {
  const prod = products.find((p) => p.id === "profaily")!;
  it("renders an img when icon is set", () => {
    const { container } = render(<ProductIcon product={prod} />);
    const img = container.querySelector("img")!;
    expect(img.getAttribute("src")).toBe(prod.icon);
    expect(img.className).toContain("object-contain");
    expect(img.className).toContain("rounded-[8px]");
  });
  it("renders the letter tile when icon is undefined", () => {
    const { container } = render(<ProductIcon product={{ ...prod, icon: undefined }} />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toBe(prod.name.charAt(0).toUpperCase());
    expect(container.firstElementChild!.className).toContain("rounded-[8px]");
  });
});
