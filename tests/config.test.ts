import fs from "node:fs";
import path from "node:path";
import { booksProduct } from "@/lib/split";
import { describe, it, expect } from "vitest";
import { products } from "@/config/products";
import { ProductsSchema, SourceSchema } from "@/config/schema";

describe("config", () => {
  it("every solo source has a filter", () => {
    expect(() => ProductsSchema.parse(products)).not.toThrow();
  });
  it("rejects a paddle source with empty priceIds", () => {
    expect(() =>
      SourceSchema.parse({ provider: "paddle", account: "mb_shared", priceIds: [] }),
    ).toThrow();
  });
  it("mb products have no sources", () => {
    products.filter((p) => p.group === "mb").forEach((p) => expect(p.sources).toEqual([]));
  });
  it("product count is 16", () => {
    expect(products.length).toBe(16);
  });
  it("every configured icon file exists in public/", () => {
    [...products, booksProduct].filter((p) => p.icon).forEach((p) => {
      expect(fs.existsSync(path.join(process.cwd(), "public", p.icon!)), p.id).toBe(true);
    });
  });
});
