// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { Bio } from "@/components/Bio";
import { Banner } from "@/components/Banner";
import { site } from "@/config/site";
import { products } from "@/config/products";

afterEach(cleanup);

describe("Bio", () => {
  it("renders the tagline with X = 16, lowercase so, bold 16", () => {
    const { container } = render(<Bio site={site} productCount={products.length} />);
    const p = container.querySelector("[data-testid=tagline]")!;
    expect(p.textContent).toBe(
      "I got fired from an unpaid internship, so I built 16 products from Lagos. One became a company with a team.",
    );
    expect(p.querySelector("strong")!.textContent).toBe("16");
  });

  it("highlights the subscriber count with the accent", () => {
    render(<Bio site={site} productCount={16} />);
    expect(screen.getByText("13,000").className).toContain("bg-accent");
  });

  it("shows the YouTube icon only (no count, no em dash) when there is no youtube data", () => {
    const { container } = render(<Bio site={site} productCount={16} />);
    expect(screen.queryByTestId("yt-count")).toBeNull();
    expect(screen.getByLabelText("YouTube").querySelector("svg")).not.toBeNull();
    expect(container.textContent).not.toContain("—");
  });

  it("shows the youtube count when present, compact like the other socials", () => {
    render(<Bio site={site} productCount={16} youtubeSubscribers={12345} />);
    expect(screen.getByTestId("yt-count").textContent).toBe("12.3K");
    expect(screen.getByText("37.7K")).toBeTruthy();
  });

  it("subscribe block is desktop-only in the aside (it moves into the Newsletter card on mobile)", () => {
    const { container } = render(<Bio site={site} productCount={16} />);
    expect(container.querySelector("form")!.parentElement!.className).toContain("max-lg:hidden");
  });

  it("subscribe form gets the 3px focus ring at 25% on top of the ring-shadow edge", () => {
    const { container } = render(<Bio site={site} productCount={16} />);
    const cls = container.querySelector("form")!.className;
    for (const c of ["shadow-edge", "focus-within:shadow-edge-hover", "focus-within:ring-3", "focus-within:ring-muted/25"]) expect(cls).toContain(c);
  });

  it("dotted background layer sits behind the avatar (224px mobile, 384px desktop)", () => {
    const { container } = render(<Bio site={site} productCount={16} />);
    const dots = container.querySelector(".bg-dots")!;
    expect(dots.className).toContain("h-56");
    expect(dots.className).toContain("lg:h-96");
    expect(dots.getAttribute("aria-hidden")).toBe("true");
  });

  it("has no anchor nav row (like the reference) and keeps the subscribe form", () => {
    const { container } = render(<Bio site={site} productCount={16} />);
    expect(container.querySelector("nav")).toBeNull();
    expect(container.querySelector("a[href^='#']")).toBeNull();
    const form = container.querySelector("form")!;
    expect(form.getAttribute("action")).toBe("https://kaperskyguru.substack.com/subscribe");
    expect(form.getAttribute("method")).toBe("get");
    expect(form.getAttribute("target")).toBe("_blank");
    expect(form.getAttribute("rel")).toBe("noopener");
    expect(form.querySelector("input[name=email]")).not.toBeNull();
  });
});

describe("Banner", () => {
  it("is hidden when disabled", () => {
    const { container } = render(<Banner banner={{ ...site.banner, enabled: false }} />);
    expect(container.innerHTML).toBe("");
  });
  it("renders when enabled", () => {
    render(<Banner banner={{ ...site.banner, enabled: true }} />);
    const a = screen.getByText(site.banner.cta).closest("a")!;
    expect(a.getAttribute("href")).toContain("ref=solomoneseme&utm_source=solomoneseme");
  });
});
