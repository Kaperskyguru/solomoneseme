// @vitest-environment jsdom
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { Snapshot } from "@/lib/snapshot/types";
import sample from "../fixtures/snapshot.sample.json";

const fixture = vi.hoisted(() => ({ snapshot: null as Snapshot | null }));
vi.mock("@/lib/snapshot/store", () => ({ readSnapshot: vi.fn(async () => fixture.snapshot) }));

import Home from "@/app/page";
import { GithubGraph, toWeeks } from "@/components/GithubGraph";
import { Footer, SiteNote } from "@/components/Footer";
import { parseContributions } from "@/lib/content/github";
import { site } from "@/config/site";

afterEach(cleanup);

const html = readFileSync(path.join(__dirname, "../fixtures/github/contributions.html"), "utf8");
const github = { username: "kaperskyguru", ...parseContributions(html) };

describe("GithubGraph (decision 5)", () => {
  it("header links to the profile via withRef and the card states the total", () => {
    const { container } = render(<GithubGraph github={github} />);
    expect(screen.getByRole("heading", { name: "GitHub" })).toBeTruthy();
    const link = container.querySelector("a")!;
    expect(link.getAttribute("href")).toBe("https://github.com/kaperskyguru?ref=solomoneseme&utm_source=solomoneseme");
    expect(link.textContent).toBe("kaperskyguru");
    expect(container.textContent).toContain("4,546 contributions in the last year");
  });

  it("53 Sunday-first week columns; the first 27 are hidden on phones, so mobile shows the last 26", () => {
    const weeks = toWeeks(github.days);
    expect(weeks).toHaveLength(53);
    expect(weeks[0][0]!.date).toBe("2025-11-09");
    expect(weeks[52].filter(Boolean).map((d) => d!.date)).toEqual(["2026-11-08", "2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12"]);
    render(<GithubGraph github={github} />);
    const [first, second] = screen.getAllByTestId("gh-half");
    expect(first.className).toContain("max-sm:hidden");
    expect(first.style.flexGrow).toBe("27");
    expect(second.className).not.toContain("hidden");
    expect(second.style.flexGrow).toBe("26");
    expect(second.querySelectorAll("[data-testid=gh-cell]").length).toBe(25 * 7 + 5);
    expect(screen.getAllByTestId("gh-cell").length).toBe(369);
  });

  it("maps the 5 levels to text colour at 7/25/45/70/100% and shows Mon/Wed/Fri, months and a Less→More legend", () => {
    const { container } = render(<GithubGraph github={github} />);
    const cls = (lvl: number) => container.querySelector(`[data-level="${lvl}"]`)!.className;
    expect(cls(0)).toContain("bg-text/[0.07]");
    expect(cls(1)).toContain("bg-text/25");
    expect(cls(2)).toContain("bg-text/45");
    expect(cls(3)).toContain("bg-text/70");
    expect(cls(4)).toMatch(/bg-text( |$)/);
    expect(cls(0)).toContain("rounded-[3.5px]");
    const t = container.textContent!;
    for (const d of ["Mon", "Wed", "Fri"]) expect(t).toContain(d);
    expect(t).not.toMatch(/Tue|Thu|Sat|Sun/);
    for (const m of ["Dec", "Jan", "Jun", "Nov"]) expect(t).toContain(m);
    expect(t).toMatch(/Less\s*More$/);
  });

  it("hides itself without data", () => {
    expect(render(<GithubGraph github={undefined} />).container.innerHTML).toBe("");
    expect(render(<GithubGraph github={{ username: "x", total: 0, days: [] }} />).container.innerHTML).toBe("");
  });
});

const withGithub = { ...(sample as unknown as Snapshot), github };

async function renderHome(s: Snapshot | null) {
  fixture.snapshot = s;
  return render(await Home());
}

describe("homepage", () => {
  it("right column order: chart → My products → compact → GitHub → Newsletter + Blog → video → books → sponsor → note (decision 6)", async () => {
    const { container } = await renderHome(withGithub);
    const main = container.querySelector("main")!;
    const marks = [
      main.querySelector("[data-testid=chart-headline]"),
      screen.getByRole("heading", { name: "My products" }),
      main.querySelector("#products ul.xl\\:grid-cols-3"),
      main.querySelector("#github"),
      screen.getByRole("heading", { name: "Newsletter" }),
      screen.getByRole("heading", { name: "Blog" }),
      main.querySelector("#video"),
      main.querySelector("#books"),
      main.querySelector("#sponsor"),
      main.querySelector("[data-testid=site-note]"),
    ];
    marks.forEach((m, i) => expect(m, `mark ${i}`).not.toBeNull());
    for (let i = 1; i < marks.length; i++) {
      expect(marks[i - 1]!.compareDocumentPosition(marks[i]!) & Node.DOCUMENT_POSITION_FOLLOWING, `mark ${i}`).toBeTruthy();
    }
  });

  it("MasteringBackend is the first card in the regular grid, then tracked products by revenue, with Books", async () => {
    await renderHome(withGithub);
    const cards = [...screen.getByTestId("product-cards").querySelectorAll(":scope > li")];
    expect(cards[0].textContent).toContain("MasteringBackend");
    expect(cards[0].querySelector("[data-testid=revenue-pill]")).toBeNull();
    const names = cards.map((c) => c.querySelector("h3")!.textContent);
    expect(names).toContain("Books");
    for (const c of cards.slice(1)) expect(c.querySelector("[data-testid=revenue-pill]")).not.toBeNull();
  });

  it("no 'Company' tag, no em-dash amounts, no MB money, no archived domains anywhere (decisions 1, 3, 4)", async () => {
    const { container } = await renderHome(withGithub);
    expect(container.textContent).not.toContain("Company");
    for (const pill of screen.getAllByTestId("revenue-pill")) expect(pill.textContent).not.toContain("—");
    for (const pill of screen.getAllByTestId("compact-pill")) expect(pill.textContent).not.toContain("—");
    expect(container.innerHTML).not.toMatch(/contentre\.io|nuxifysaas\.com/);
    expect(screen.getAllByText("Archived")).toHaveLength(2);
    for (const name of ["Backend Projects", "Backend Weekly", "Get Backend Jobs"]) {
      const row = screen.getAllByText(name).map((n) => n.closest("article")).find(Boolean)!;
      expect(row.querySelector("[data-testid=compact-pill]")!.textContent).toBe("$0/mo");
    }
  });

  it("the SNAPSHOT_SAMPLE fixture alone renders the GitHub graph (~365 days, total 4,546)", async () => {
    const plain = sample as unknown as Snapshot;
    expect(plain.github!.days.length).toBe(365);
    const { container } = await renderHome(plain);
    expect(container.querySelector("#github")!.textContent).toContain("4,546 contributions in the last year");
    expect(new Set(plain.github!.days.map((d) => d.level))).toEqual(new Set([0, 1, 2, 3, 4]));
  });

  it("with a null snapshot: every tracked card reads $0/mo, the chart still renders, GitHub is hidden", async () => {
    await renderHome(null);
    const pills = screen.getAllByTestId("revenue-pill").map((p) => p.textContent);
    expect(pills.length).toBeGreaterThan(0);
    expect(pills.every((p) => p === "$0/mo" || p === "$0")).toBe(true);
    expect(screen.getByTestId("chart-headline").textContent).toBe("$0 in 12 months");
    expect(document.querySelector("#github")).toBeNull();
  });

  it("mobile: subscribe form moves into the Newsletter card; footer is phone-only, the note desktop-only (decision 7)", async () => {
    const { container } = await renderHome(withGithub);
    const forms = [...container.querySelectorAll("form")];
    expect(forms).toHaveLength(2);
    expect(forms[0].parentElement!.className).toContain("max-lg:hidden");
    const newsletter = screen.getByRole("region", { name: "Newsletter" });
    expect(newsletter.contains(forms[1])).toBe(true);
    expect(forms[1].parentElement!.className).toContain("lg:hidden");
    expect(container.querySelector("footer")!.className).toContain("lg:hidden");
    expect(screen.getByTestId("site-note").className).toContain("max-lg:hidden");
  });

  it("every outbound link carries the ref (mailto excepted)", async () => {
    const { container } = await renderHome(withGithub);
    for (const a of container.querySelectorAll("a[href^='http']")) expect(a.getAttribute("href")).toContain("ref=solomoneseme");
  });
});

describe("Footer / SiteNote", () => {
  it("both carry only the 'Updated' line — no revenue wording anywhere on the page (owner decision)", async () => {
    for (const el of [<Footer key="f" links={site.footerLinks} updatedAt="2026-11-12T08:00:00Z" />, <SiteNote key="s" links={site.footerLinks} updatedAt="2026-11-12T08:00:00Z" />]) {
      const { container } = render(el);
      expect(container.textContent).toContain("Updated Nov 12, 2026");
      cleanup();
    }
    const { container } = await renderHome(withGithub);
    expect(container.textContent).not.toMatch(/refunds|provider fees|sales tax|no conversion|company revenue is not included/i);
  });
  it("mobile newsletter card with no posts has no dead space under the form", async () => {
    await renderHome({ ...withGithub, newsletter: [] });
    const form = screen.getByRole("region", { name: "Newsletter" }).querySelector("form")!;
    expect(form.parentElement!.className).not.toContain("mb-6");
    cleanup();
    await renderHome(withGithub);
    expect(screen.getByRole("region", { name: "Newsletter" }).querySelector("form")!.parentElement!.className).toContain("mb-6");
  });
});

describe("import boundaries", () => {
  const root = path.join(__dirname, "../..");
  const src = (f: string) => readFileSync(path.join(root, f), "utf8");
  const imports = (code: string) => [...code.matchAll(/^import\s+(type\s+)?[^;]*?from\s+"([^"]+)"/gm)].map((m) => ({ type: !!m[1], from: m[2] }));

  it("client components import nothing server-side from lib/", () => {
    const clients = readdirSync(path.join(root, "components")).filter((f) => src(`components/${f}`).startsWith('"use client"'));
    expect(clients.sort()).toEqual(["RevenueChart.tsx", "Sparkline.tsx"]);
    for (const f of clients) {
      for (const i of imports(src(`components/${f}`))) {
        expect(i.from.startsWith("@/lib/content"), `${f}: ${i.from}`).toBe(false);
        expect(i.from, f).not.toBe("@/lib/snapshot/store");
        if (i.from.startsWith("@/lib/revenue")) expect(i.type, `${f}: ${i.from}`).toBe(true);
      }
    }
  });

  it("page.tsx takes from lib/ only store, split, format and links", () => {
    const libs = imports(src("app/page.tsx")).map((i) => i.from).filter((f) => f.startsWith("@/lib/"));
    for (const f of libs) expect(["@/lib/snapshot/store", "@/lib/split", "@/lib/format", "@/lib/links"]).toContain(f);
  });
});
