import { z } from "zod";

const nonEmpty = z.array(z.string().min(1)).min(1);

export const SourceSchema = z.discriminatedUnion("provider", [
  z.object({ provider: z.literal("paystack"), account: z.literal("mb_shared"), planCodes: nonEmpty }),
  z.object({ provider: z.literal("paddle"), account: z.literal("mb_shared"), priceIds: nonEmpty }),
  z.object({ provider: z.literal("lemonsqueezy"), storeId: z.string().min(1), productIds: nonEmpty }),
  z.object({
    provider: z.literal("asyncpay"),
    account: z.literal("mb_shared"),
    filter: z.object({ field: z.string().min(1), values: nonEmpty }),
  }),
  z.object({ provider: z.literal("gumroad"), exclude: z.array(z.string()) }),
]);
export type Source = z.infer<typeof SourceSchema>;

export const ProductSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  url: z.string().url(),
  icon: z.string().min(1).optional(),
  tagline: z.string().min(1),
  group: z.enum(["mb", "solo"]),
  sources: z.array(SourceSchema),
  revenueModel: z.enum(["recurring", "one-off"]).default("recurring").optional(),
  badge: z.object({ kind: z.enum(["sold", "shutdown", "archived"]), label: z.string().min(1) }).optional(),
});
export type Product = z.infer<typeof ProductSchema>;
export const ProductsSchema = z.array(ProductSchema);

const stat = z.object({ label: z.string(), value: z.string() });
export const SiteSchema = z.object({
  newsletter: z.object({ name: z.string(), substackUrl: z.string().url(), subscribers: z.number(), asOf: z.string() }),
  socials: z.object({
    x: z.object({ handle: z.string(), followers: z.number() }),
    linkedin: z.object({ url: z.string().url(), followers: z.number() }),
    youtube: z.object({ channelHandle: z.string() }),
    email: z.string().email(),
  }),
  github: z.object({ username: z.string().min(1) }),
  mb: z.object({
    learners: z.number(),
    founded: z.number(),
    team: z.number(),
  }),
  sponsor: z.object({
    asOf: z.string(),
    bookingUrl: z.string().url(),
    channels: z.array(
      z.object({
        name: z.string(),
        stats: z.array(stat),
        offers: z.array(z.object({ name: z.string(), price: z.string() })),
      }),
    ),
    partners: z.array(z.string()),
  }),
  banner: z.object({ enabled: z.boolean(), text: z.string(), cta: z.string(), url: z.string().url() }),
  footerLinks: z.array(z.object({ label: z.string(), url: z.string() })),
});
export type Site = z.infer<typeof SiteSchema>;
