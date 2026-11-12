import type { Product } from "./schema";

// Pseudo-product: Gumroad books. Kept out of `products` so the product count stays 16.
export const books: Pick<Product, "id" | "name" | "url" | "sources"> & {
  rating: { avg: number; count: number };
} = {
  id: "books",
  name: "Books",
  url: "https://store.masteringbackend.com",
  // Shelf header rating until the Gumroad snapshot supplies per-book ratings.
  rating: { avg: 4.7, count: 80 },
  sources: [{ provider: "gumroad", exclude: [] }],
};
