import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";

const read = (f: string) => readFileSync(path.join(__dirname, "../..", f), "utf8");

it("uses Geist (400/500/600) via next/font on <html>, and the body font is the Geist variable", () => {
  const layout = read("app/layout.tsx");
  expect(layout).toMatch(/import \{ Geist \} from "next\/font\/google"/);
  expect(layout).toMatch(/Geist\(\{[^)]*variable: "--font-geist-sans"/);
  expect(layout).toMatch(/weight: \["400", "500", "600"\]/);
  expect(layout).toContain("<html lang=\"en\" className={geist.variable}>");
  const css = read("app/globals.css");
  expect(css).toContain("font-family: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;");
  expect(css).not.toContain("Apple Color Emoji");
});

it("no 700 weights in components (reference uses 400/500/600 only)", () => {
  for (const f of ["Banner", "Bio", "BooksShelf", "CompactList", "Footer", "GithubGraph", "LatestList", "LatestVideo", "MbCard", "ProductCard", "RevenueChart", "SectionHeader", "Sparkline", "Sponsor", "Subscribe"]) {
    expect(read(`components/${f}.tsx`), f).not.toMatch(/font-bold|font-extrabold/);
  }
});
