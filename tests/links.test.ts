import { describe, it, expect } from "vitest";
import { withRef } from "@/lib/links";

describe("withRef", () => {
  it("adds ref + utm", () =>
    expect(withRef("https://profaily.com")).toBe(
      "https://profaily.com/?ref=solomoneseme&utm_source=solomoneseme",
    ));
  it("keeps existing query", () =>
    expect(withRef("https://a.com/?x=1")).toBe(
      "https://a.com/?x=1&ref=solomoneseme&utm_source=solomoneseme",
    ));
});
