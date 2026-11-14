import { describe, it, expect } from "vitest";
import { formatMoney, formatMoneyList } from "@/lib/format";

describe("formatMoney", () => {
  it("formats whole units", () => {
    expect(formatMoney(123456, "USD")).toBe("$1,235");
    expect(formatMoney(-5000, "USD")).toBe("-$50");
    expect(formatMoney(45000000, "NGN")).toBe("₦450,000");
  });
  it("formats compact", () => {
    expect(formatMoney(123456, "USD", { compact: true })).toBe("$1.2K");
    expect(formatMoney(45000000, "NGN", { compact: true })).toBe("₦450K");
  });
});

describe("formatMoneyList", () => {
  it("orders USD, NGN, then alphabetical, skipping zeros", () => {
    expect(formatMoneyList({ NGN: 500000, EUR: 100, USD: 1000, GBP: 0 })).toBe("$10 · ₦5,000 · €1");
  });
  it("applies suffix to each and defaults empty to $0", () => {
    expect(formatMoneyList({ USD: 1000, NGN: 500000 }, "/mo")).toBe("$10/mo · ₦5,000/mo");
    expect(formatMoneyList({}, "/mo")).toBe("$0/mo");
  });
});
