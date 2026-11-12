import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchAsyncpay } from "@/lib/revenue/providers/asyncpay";
import { fetchGumroad } from "@/lib/revenue/providers/gumroad";
import { fetchLemonSqueezy } from "@/lib/revenue/providers/lemonsqueezy";
import { fetchPaddle } from "@/lib/revenue/providers/paddle";
import { fetchPaystack } from "@/lib/revenue/providers/paystack";

const since = new Date("2026-10-01T00:00:00Z");
const cases = [
  ["Paystack", "PAYSTACK_SECRET_KEY", () => fetchPaystack({ provider: "paystack", account: "mb_shared", planCodes: ["P"] }, since)],
  ["Paddle", "PADDLE_API_KEY", () => fetchPaddle({ provider: "paddle", account: "mb_shared", priceIds: ["pri_x"] }, since)],
  ["Lemon Squeezy", "LEMONSQUEEZY_API_KEY", () => fetchLemonSqueezy({ provider: "lemonsqueezy", storeId: "1", productIds: ["1"] }, since)],
  ["Gumroad", "GUMROAD_ACCESS_TOKEN", () => fetchGumroad({ provider: "gumroad", exclude: [] }, since)],
  ["AsyncPay", "ASYNCPAY_SECRET_KEY", () => fetchAsyncpay({ provider: "asyncpay", account: "mb_shared", filter: { field: "f", values: ["v"] } }, since)],
] as const;

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe.each(cases)("%s", (name, envKey, run) => {
  it("throws a fixed message when the body is not JSON", async () => {
    vi.stubEnv(envKey, "k");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>customer@example.com</html>")));
    const e = (await run().catch((x) => x)) as Error;
    expect(e.message).toBe(`${name} returned an unexpected response`);
  });
  it("passes an abort signal to fetch", async () => {
    vi.stubEnv(envKey, "k");
    const f = vi.fn(async () => new Response("{}", { status: 500 }));
    vi.stubGlobal("fetch", f);
    await run().catch(() => undefined);
    const init = (f.mock.calls[0] as unknown as [string, RequestInit | undefined])[1];
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });
});
