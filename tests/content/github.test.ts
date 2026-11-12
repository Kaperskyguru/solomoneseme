import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchGithub, parseContributions } from "@/lib/content/github";

const html = readFileSync(path.join(__dirname, "../fixtures/github/contributions.html"), "utf8");

afterEach(() => vi.unstubAllGlobals());

describe("parseContributions", () => {
  it("reads the multi-line heading total and every cell, sorted by date", () => {
    const { total, days } = parseContributions(html);
    expect(total).toBe(4546);
    expect(days).toHaveLength(369);
    expect(days[0]).toEqual({ date: "2025-11-09", level: 0 });
    expect(days[days.length - 1].date).toBe("2026-11-12");
    // Rows in the HTML are weekdays; the parser must return chronological order.
    expect(days.map((d) => d.date)).toEqual([...days.map((d) => d.date)].sort());
    expect(days.every((d) => d.level >= 0 && d.level <= 4)).toBe(true);
    expect(new Set(days.map((d) => d.level))).toEqual(new Set([0, 1, 2, 3, 4]));
  });

  it("handles attributes in any order and a singular 'contribution'", () => {
    const one = `<h2 id="js-contribution-activity-description">\n  1\n  contribution\n  in the last year\n</h2>
      <td data-level="2" class="ContributionCalendar-day" data-date="2026-01-02"></td>
      <td data-date="2026-01-01" data-level="9"></td>`;
    expect(parseContributions(one)).toEqual({
      total: 1,
      days: [
        { date: "2026-01-01", level: 4 },
        { date: "2026-01-02", level: 2 },
      ],
    });
  });

  it("throws a fixed message when the page has no calendar", () => {
    expect(() => parseContributions("<html>secret-snippet</html>")).toThrow(/^GitHub contributions returned an unexpected response$/);
  });
});

describe("fetchGithub", () => {
  it("fetches the public contributions page for the username", async () => {
    const f = vi.fn().mockResolvedValue(new Response(html));
    vi.stubGlobal("fetch", f);
    const g = await fetchGithub("kaperskyguru");
    expect(f.mock.calls[0][0]).toBe("https://github.com/users/kaperskyguru/contributions");
    expect(g.username).toBe("kaperskyguru");
    expect(g.total).toBe(4546);
    expect(g.days).toHaveLength(369);
  });

  it("errors with a fixed message and no URL on non-2xx", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("no", { status: 429 })));
    const e = (await fetchGithub("kaperskyguru").catch((x) => x)) as Error;
    expect(e.message).toBe("GitHub contributions failed with status 429");
    expect(e.message).not.toMatch(/https?:|github\.com/);
  });
});
