# solomoneseme.com Personal Homepage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static `index.html` with a Marc-Lou-style personal homepage. It shows Solomon's products with live, provider-verified revenue (MasteringBackend excluded), plus books, newsletter, blog, latest video and sponsorship, in his white/black/yellow palette that follows the device theme.

**Architecture:** A Next.js App Router site renders one page from a JSON **snapshot**. A protected cron route (`/api/refresh`) pulls revenue from the payment providers (each source filtered to one product), pulls content from Substack, Strapi, YouTube and Gumroad, merges the result with the previous snapshot so failed sections keep their last good data, and writes it to Vercel Blob. Hand-edited values live in typed config files.

**Tech Stack:** Next.js 15 (App Router) + TypeScript (strict) + Tailwind CSS 4 + Zod + Vitest + `@vercel/blob`. Deployed on Vercel with Vercel Cron.

**Spec:** `docs/superpowers/specs/2026-11-12-personal-homepage-design.md` (approved 2026-11-12). Read it before any task.

## Global Constraints

- **Never commit without Solomon's explicit approval.** Each task's last step stages the files and shows a diff summary, and it does not run `git commit`.
- MasteringBackend company revenue (MB, Backend Projects, Backend Weekly, Get Backend Jobs) is never fetched, shown or summed.
- Every revenue source must carry a filter, except Gumroad, which uses the whole account minus `exclude`. Config validation fails on a filter-less source.
- Payment and API keys are server-only env vars. Nothing under `lib/revenue`, `lib/content` or `lib/snapshot` may be imported by a client component.
- Tagline, verbatim: `I got fired from an unpaid internship, so I built {X} products from Lagos. One became a company with a team.` X = `products.length` (books card excluded).
- Revenue metric: paid amount minus refunds, before fees. **No currency conversion**: totals are kept per currency (`USD`, `NGN`, and any other currency reported gets its own bucket). Display: pill `$1,234/mo · ₦450,000/mo` (non-zero currencies only, else `$0/mo`); headline `$X + ₦Y in 12 months`; chart has a USD/NGN toggle, defaulting to USD; cards are sorted by last-30 USD, then last-30 NGN. Last 30 days = rolling 30 × 24h. Months = calendar months in UTC. Chart = 12 months, ending in the current (partial) month.
- Products with no sources show `$0/mo`.
- Colours: accent `#FACC15`. Light: bg `#ffffff`, text `#09090b`, muted `#71717a`, border `#e4e4e7`, card `#ffffff`. Dark: bg `#0a0a0a`, text `#fafafa`, muted `#a1a1aa`, border `#232323`, card `#141414`. Theme follows `prefers-color-scheme`.
- System font stack: `ui-sans-serif, system-ui, sans-serif, Apple Color Emoji, Segoe UI Emoji`.
- Every outbound link gets `?ref=solomoneseme&utm_source=solomoneseme` (helper `withRef(url)`).
- Keep Google Analytics `G-SZJV1XR97S`.
- Approved mockups: `.superpowers/brainstorm/25780-1794438048/content/products-layout-v2.html` (light) and `products-layout-v3-dark.html` (dark).

## Review Focus

1. **A shared-account transaction for an MB price, plan or source appears in the provider response.** Expected: it's excluded from the product's totals. Pinned in Tasks 4, 5 and 6 (`excludes MB transactions`).
2. **A provider or content API fails or times out during refresh.** Expected: that section keeps its previous snapshot data, and the page still renders. Pinned in Task 7 (`keeps previous section on failure`).
3. **A refund lands in a later month than its payment.** Expected: it's subtracted in the refund's month. Month totals and last-30 may then be negative and are shown as-is. Pinned in Task 3 (`refund counts in its own month`).
4. **A transaction at 23:59 UTC on the last day of a month, and the current partial month.** Expected: correct month bucket, and the current month is flagged `partial: true`. Pinned in Task 3 (`buckets by UTC month`).
5. **A provider response spans multiple pages.** Expected: all pages are fetched. Pinned in Tasks 4, 5 and 6 (`follows pagination`).

---

## File Structure

```
package.json, tsconfig.json, next.config.ts, vitest.config.ts, vercel.json, .gitignore, .env.example
config/
  products.ts         # product list + sources (validated)
  site.ts             # hand-edited values: subscribers, socials, MB stats, sponsor, banner
  books.ts            # books pseudo-product: { id: "books", sources: [gumroad], rating }
  schema.ts           # Zod schemas for both
lib/
  links.ts            # withRef()
  revenue/
    types.ts          # Txn, ProductRevenue
    aggregate.ts      # aggregate()
    providers/{paystack,paddle,lemonsqueezy,gumroad,asyncpay}.ts
    index.ts          # fetchAllRevenue()
  content/{substack,strapi,youtube,books}.ts
  snapshot/
    types.ts          # Snapshot
    merge.ts          # mergeSnapshot()
    store.ts          # readSnapshot(), writeSnapshot()
    build.ts          # buildSnapshot()
app/
  layout.tsx, globals.css, page.tsx
  api/refresh/route.ts
components/
  Bio.tsx, Banner.tsx, RevenueChart.tsx, ProductCard.tsx, MbCard.tsx, CompactList.tsx,
  Sparkline.tsx, BooksShelf.tsx, LatestList.tsx, LatestVideo.tsx, Sponsor.tsx, Footer.tsx
tests/                # mirrors lib/ and config/, fixtures in tests/fixtures/<provider>/*.json
public/img/           # headshot + favicons moved from img/
```

Shared types (defined in Task 3, used everywhere):

```ts
// lib/revenue/types.ts
export type Txn = { id: string; at: Date; amountMinor: number; currency: string; kind: "payment" | "refund" };
export type Money = Record<string /* ISO currency, e.g. USD, NGN */, number /* minor units */>;
export type MonthPoint = { month: string /* YYYY-MM */; totals: Money; partial: boolean };
export type ProductRevenue = { productId: string; last30: Money; months: MonthPoint[] /* 12 */; updatedAt: string };
```

---

### Task 1: AsyncPay spike (throwaway, not committed)

Decides how MasteringAI's AsyncPay sales are separated from MB's (spec §6, "Known risk").

**Files:** `scratch/asyncpay-spike.ts` (delete when done). Findings are recorded in the spec.

- [ ] **Step 1:** Ask Solomon for a read-only AsyncPay key in a local env var (`ASYNCPAY_SECRET_KEY`). Never paste it into files.
- [ ] **Step 2:** Find the AsyncPay transaction-listing endpoint and auth header in AsyncPay's docs and in `academy/src/extensions/payment` (the MB backend already calls AsyncPay). Write a script that lists the last 50 transactions and prints each one's id, amount, currency, status, date, and every metadata or description field. Mask customer emails.
- [ ] **Step 3:** Run it with `npx tsx scratch/asyncpay-spike.ts`. Check whether MasteringAI payments carry `source` (the value set in `masteringai/lib/automation.ts`), or another field that reliably identifies MasteringAI.
- [ ] **Step 4:** Add a "Spike result (date)" note under the spec's "Known risk" paragraph. Record either **Path A:** filter on field `X` = value(s) `Y`, or **Path B:** no reliable field, so read MasteringAI's own payment records, naming the table and DB.
- [ ] **Step 5:** Delete `scratch/`. Tell Solomon the result.

---

### Task 2: Scaffold + config

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `.gitignore`, `.env.example`, `config/schema.ts`, `config/products.ts`, `config/site.ts`, `lib/links.ts`, `app/layout.tsx`, `app/globals.css`, `app/page.tsx` (placeholder)
- Move: `img/*` → `public/img/`. Delete `index.html` only after Task 11 reaches parity.
- Test: `tests/config.test.ts`, `tests/links.test.ts`

**Interfaces:**
- Produces: `products: Product[]`, `site: Site`, `withRef(url: string): string`.
- `Product = { id: string; name: string; url: string; icon: string; tagline: string; group: "mb" | "solo"; sources: Source[]; badge?: { kind: "sold" | "shutdown"; label: string } }`
- `Source = { provider: "paystack"; account: "mb_shared"; planCodes: string[] } | { provider: "paddle"; account: "mb_shared"; priceIds: string[] } | { provider: "lemonsqueezy"; storeId: string } | { provider: "asyncpay"; account: "mb_shared"; filter: { field: string; values: string[] } } | { provider: "gumroad"; exclude: string[] } | { provider: "db"; ... }`. Add the `db` variant only if Task 1 chose Path B.
- `Site` holds: `newsletter { name, substackUrl, subscribers: number, asOf }`, `socials { x: {handle, followers}, linkedin: {url, followers}, youtube: {channelHandle}, email }`, `mb { learners, countries, founded, team, links: {label,url}[] }`, `sponsor { asOf, bookingUrl, channels: {name, stats: {label,value}[], offers: {name, price}[]}[], partners: string[] }`, `banner { enabled, text, cta, url }`, `footerLinks`.

- [ ] **Step 1:** Run `npx create-next-app@15 . --ts --tailwind --app --eslint --no-src-dir --import-alias "@/*"` in a temp dir and copy it in, keeping `img/` and `docs/`. Add `zod`, `@vercel/blob`, `vitest` and `@vitest/coverage-v8`. In `.gitignore`, add `.superpowers/`, `.env*.local` and `scratch/`.
- [ ] **Step 2: Write failing tests**

```ts
// tests/config.test.ts
it("every solo source has a filter", () => { expect(() => ProductsSchema.parse(products)).not.toThrow(); });
it("rejects a paddle source with empty priceIds", () => {
  expect(() => SourceSchema.parse({ provider: "paddle", account: "mb_shared", priceIds: [] })).toThrow();
});
it("mb products have no sources", () => { products.filter(p => p.group === "mb").forEach(p => expect(p.sources).toEqual([])); });
it("product count is 16", () => { expect(products.length).toBe(16); });
// tests/links.test.ts
it("adds ref + utm", () => expect(withRef("https://profaily.com")).toBe("https://profaily.com/?ref=solomoneseme&utm_source=solomoneseme"));
it("keeps existing query", () => expect(withRef("https://a.com/?x=1")).toBe("https://a.com/?x=1&ref=solomoneseme&utm_source=solomoneseme"));
```

- [ ] **Step 3:** Run `npx vitest run tests/config.test.ts tests/links.test.ts`. Expected: FAIL (modules missing).
- [ ] **Step 4:** Implement the schemas. Zod `.min(1)` on `planCodes`, `priceIds` and `filter.values`.
- [ ] **Step 5:** Fill in `config/products.ts`:
  - The 16 products: the 14 from the old `index.html` (copy names, URLs and one-liners), plus MasteringAI and Affizy.
  - Profaily's one-liner becomes "Typefully for video". Draft one-liners for MasteringAI and Affizy, and flag them for Solomon.
  - Profaily sources: `priceIds` from `PADDLE_PRICE_*` and `planCodes` from `PAYSTACK_PLAN_*` in `/Users/kap/Downloads/workspace/profaily` env/config. These IDs aren't secret.
  - Boilerplatesearch: `storeId` from its Lemon Squeezy config.
  - MasteringAI: per the Task 1 result.
  - The `gumroad` source sits on a pseudo-product `books`, which lives in `config/books.ts`, not in `products`, so X stays 16.
- [ ] **Step 6:** Fill in `config/site.ts` with the spec §5 sponsor values, `asOf: "2026-11-12"`, and newsletter subscribers `13000`. Follower counts: X `37700`, LinkedIn `14200`. MB stats are placeholders marked `// TODO(Solomon)`; ask him for the real values before Task 11. Banner: the Python30 text and URL from the old `index.html`, `enabled: false`.
- [ ] **Step 7:** In `app/layout.tsx`, add the GA `G-SZJV1XR97S` script via `next/script`, the metadata title "Solomon Eseme", the old description, and favicons from `public/img/icons`. In `globals.css`, define the colour tokens from Global Constraints as CSS variables under `:root` and `@media (prefers-color-scheme: dark)`.
- [ ] **Step 8:** Run `npx vitest run && npx next build`. Expected: tests PASS, build succeeds.
- [ ] **Step 9:** Stage with `git add -A`, show `git status`/diff stat to Solomon, and wait for approval before committing.

---

### Task 3: Revenue core: per-currency aggregation

**Files:**
- Create: `lib/revenue/types.ts` (as above), `lib/revenue/aggregate.ts`
- Test: `tests/revenue/aggregate.test.ts`

**Interfaces:**
- Produces: `aggregate(txns: Txn[], now: Date): { last30: Money; months: MonthPoint[] }`. Each currency is summed separately and never converted. Currencies with a zero total are omitted from a `Money`.

- [ ] **Step 1: Write failing tests**

```ts
it("buckets by UTC month", () => {
  const r = aggregate([txn("2026-10-31T23:59:00Z", 1000)], new Date("2026-11-12T00:00:00Z"));
  expect(r.months.at(-2)).toEqual({ month: "2026-10", totals: { USD: 1000 }, partial: false });
  expect(r.months.at(-1)).toMatchObject({ month: "2026-11", partial: true });
  expect(r.months).toHaveLength(12);
  expect(r.months[0].month).toBe("2025-12");
});
it("refund counts in its own month", () => {
  const r = aggregate([txn("2026-09-10T00:00:00Z", 5000), refund("2026-10-02T00:00:00Z", 5000)], NOW);
  expect(month(r, "2026-09")).toEqual({ USD: 5000 }); expect(month(r, "2026-10")).toEqual({ USD: -5000 });
});
it("last 30 days is rolling", () => {
  const r = aggregate([txn("2026-10-13T00:00:01Z", 100), txn("2026-10-12T23:59:59Z", 999)], new Date("2026-11-12T00:00:00Z"));
  expect(r.last30).toEqual({ USD: 100 });
});
it("keeps currencies separate", () => {
  const r = aggregate([txn("2026-11-01T00:00:00Z", 1000, "USD"), txn("2026-11-02T00:00:00Z", 500000, "NGN")], NOW);
  expect(r.last30).toEqual({ USD: 1000, NGN: 500000 });
});
```

- [ ] **Step 2:** Run `npx vitest run tests/revenue`. Expected: FAIL.
- [ ] **Step 3:** Implement. Refunds have a positive `amountMinor` and are subtracted from their own currency.
- [ ] **Step 4:** Run `npx vitest run tests/revenue`. Expected: PASS.
- [ ] **Step 5:** Stage and show the diff. No commit.

---

### Task 4: Paystack + Paddle adapters (Profaily, shared MB accounts)

**Files:**
- Create: `lib/revenue/providers/paystack.ts`, `lib/revenue/providers/paddle.ts`
- Test: `tests/revenue/paystack.test.ts`, `tests/revenue/paddle.test.ts` + fixtures

**Interfaces:**
- Consumes: `Source` (Task 2), `Txn` (Task 3).
- Produces: `fetchPaystack(src: PaystackSource, since: Date): Promise<Txn[]>` and `fetchPaddle(src: PaddleSource, since: Date): Promise<Txn[]>`, both in original currency.

API facts to confirm against the provider docs while implementing:
- **Paystack:** `GET https://api.paystack.co/transaction?status=success&from=<iso>&perPage=100&page=N` with `Authorization: Bearer $PAYSTACK_SECRET_KEY`. `amount` is in kobo or cents, and `currency` is given. A transaction belongs to Profaily if its `plan` code (`plan.plan_code` or `plan_object.plan_code`) is in `planCodes`. Refunds: `GET /refund`; map each to its original transaction and keep only those whose transaction passed the filter. Page through using `meta.pageCount`.
- **Paddle (Billing):** `GET https://api.paddle.com/transactions?status=completed&billed_at[GTE]=<iso>&per_page=200` with `Authorization: Bearer $PADDLE_API_KEY`, paging via `meta.pagination.next`. Keep a transaction if any line `items[].price.id` is in `priceIds`, and count only those lines' totals (`details.line_items[].totals.total`, minor units as a string) in `currency_code`. Refunds: `GET /adjustments?action=refund&status=approved`, linked by `transaction_id`.
- If Profaily turns out to be on Paddle **Classic** (IDs that aren't `pri_…`), stop and report: the endpoints differ.

- [ ] **Step 1: Write failing tests** with fixtures in which page 1 holds one Profaily and one MB transaction and page 2 holds a Profaily refund:
  - `excludes MB transactions`: result ids contain only Profaily's.
  - `follows pagination`: fetch is called twice, and the refund comes from page 2.
  - `maps amounts and currency`: Paystack NGN `amount: 500000` gives `{ amountMinor: 500000, currency: "NGN" }`.
  - Paddle mixed basket: a transaction with one Profaily line and one MB line counts only the Profaily line total.
- [ ] **Step 2:** Run `npx vitest run tests/revenue/paystack.test.ts tests/revenue/paddle.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement both adapters using global `fetch`. Throw on non-2xx so Task 7 can keep the previous data.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Stage and show the diff. No commit.

---

### Task 5: Lemon Squeezy + Gumroad adapters (Boilerplatesearch, books)

**Files:**
- Create: `lib/revenue/providers/lemonsqueezy.ts`, `lib/revenue/providers/gumroad.ts`, `lib/content/books.ts`
- Test: `tests/revenue/lemonsqueezy.test.ts`, `tests/revenue/gumroad.test.ts`, `tests/content/books.test.ts` + fixtures

**Interfaces:**
- Produces: `fetchLemonSqueezy(src, since): Promise<Txn[]>`, `fetchGumroad(src, since): Promise<Txn[]>` and `fetchBooks(src: GumroadSource): Promise<Book[]>`, where `Book = { id: string; name: string; url: string; cover: string; priceLabel: string; downloads: number; rating?: { avg: number; count: number } }`, sorted by `downloads` descending.

API facts to confirm while implementing:
- **Lemon Squeezy:** `GET https://api.lemonsqueezy.com/v1/orders?filter[store_id]=<id>&page[size]=100` with `Authorization: Bearer $LEMONSQUEEZY_API_KEY` and `Accept: application/vnd.api+json`. Use `attributes.total` (minor units) with `attributes.currency`, no conversion. `status: "refunded"` / `"partial_refund"` with `refunded_amount` produces a refund Txn dated `updated_at`. Page via `links.next`. Stop at orders older than `since`.
- **Gumroad:** `GET https://api.gumroad.com/v2/sales?after=<YYYY-MM-DD>&access_token=$GUMROAD_ACCESS_TOKEN`, paging via `next_page_key`. Paid sale: `price` (cents), `currency` given. A `refunded: true` sale produces a refund Txn. Skip sales whose `product_id` is in `exclude`, and skip `price === 0` for revenue. `GET /v2/products` gives the shelf (`sales_count` counts free downloads too, which is what the spec wants). Ratings: use the API field if present; otherwise omit per book, and the shelf header uses `site.books.rating` from config (4.7 / 80). Add that config field.

- [ ] **Step 1: Write failing tests**
  - `follows pagination` (both providers).
  - `excludes products in exclude` (Gumroad).
  - `free downloads count on shelf but not revenue`: product A has `sales_count: 50` and every sale `price: 0`, so the shelf shows 50 and revenue is `[]`.
  - `partial refund produces refund txn` (Lemon Squeezy).
  - `shelf sorted by downloads desc`.
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run them. Expected: PASS.
- [ ] **Step 5:** Stage and show the diff. No commit.

---

### Task 6: MasteringAI source + revenue orchestration

**Files:**
- Create: `lib/revenue/providers/asyncpay.ts` (Path A) **or** `lib/revenue/providers/db.ts` (Path B), per Task 1. Create `lib/revenue/index.ts`.
- Test: `tests/revenue/masteringai.test.ts`, `tests/revenue/index.test.ts`

**Interfaces:**
- Produces: `fetchAllRevenue(products: Product[], now: Date): Promise<Record<string, ProductRevenue | Error>>`, keyed by product id; the books pseudo-product uses the key `books`.
- Behaviour:
  - Fetch every source of a product since `now − 13 months`, then `aggregate`.
  - A product with `sources: []` produces 12 months with `totals: {}` and `last30: {}` (the `$0/mo` rule).
  - If any source of a product throws, that product's entry is the `Error`, not partial numbers.
  - Products run in parallel with `Promise.allSettled`.

- [ ] **Step 1: Write failing tests**
  - MasteringAI: `excludes MB transactions` and `follows pagination`. Path A uses fixtures from the Task 1 spike's shapes, with all PII removed. Path B uses a fake DB client.
  - `index`: `$0 product has 12 zero months`; `one failing source makes the product an Error`; `mb products are never fetched` (spy on the adapters, with zero calls for group `mb`).
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run them. Expected: PASS.
- [ ] **Step 5:** Stage and show the diff. No commit.

---

### Task 7: Content fetchers + snapshot + refresh job

**Files:**
- Create: `lib/content/substack.ts`, `lib/content/strapi.ts`, `lib/content/youtube.ts`, `lib/snapshot/{types,merge,store,build}.ts`, `app/api/refresh/route.ts`, `vercel.json`
- Test: `tests/content/*.test.ts`, `tests/snapshot/merge.test.ts`, `tests/snapshot/build.test.ts`

**Interfaces:**
- `fetchSubstack(): Promise<Post[]>` uses `https://kaperskyguru.substack.com/api/v1/archive?sort=new&limit=3` and maps to `Post = { title, url, date, likes? }` (`likes` from `reaction_count`).
- `fetchBlog(): Promise<Post[]>` uses Strapi at `BASE_ENDPOINT_URL` with `STRAPI_TOKEN`, filtered to author slug `kaperskyguru`, newest 3. Copy the query shape from `/Users/kap/Downloads/workspace/mb-blog/lib/strapi.ts`. The URL is `https://blog.masteringbackend.com/<slug>`; confirm the URL pattern in mb-blog's `app/[id]`.
- `fetchYoutube(): Promise<{ subscribers: number; latest: { id, title, thumbnail, publishedAt, views } }>` uses YouTube Data API v3 with `YOUTUBE_API_KEY`: `channels?forHandle=@solomoneseme&part=statistics,contentDetails`, then the uploads playlist for the newest item, then `videos?part=statistics`.
- `Snapshot = { generatedAt: string; revenue: { [productId]: ProductRevenue }; books: Book[]; newsletter: Post[]; blog: Post[]; youtube: {...}; sections: { [name]: { updatedAt: string; error?: string } } }`
- `mergeSnapshot(prev: Snapshot | null, next: Partial results with Errors): Snapshot`. For each section or product that is an `Error`, keep `prev`'s value and `updatedAt`, and set `sections[name].error`.
- `readSnapshot(): Promise<Snapshot | null>` and `writeSnapshot(s): Promise<void>` use Vercel Blob at the fixed path `snapshot.json` (`addRandomSuffix: false`, `allowOverwrite: true`).
- `buildSnapshot(now): Promise<Snapshot>` runs the revenue and content fetches in parallel, then merges.
- `GET /api/refresh` returns 401 unless `Authorization: Bearer ${CRON_SECRET}`. It builds, writes and returns `{ ok, errors: string[] }`, then calls `revalidatePath("/")`.
- `vercel.json`: cron `/api/refresh` at `0 * * * *` (hourly).

- [ ] **Step 1: Write failing tests**
  - `keeps previous section on failure`: prev has Profaily revenue R, next has an `Error`, so the merged revenue is R and the error is recorded.
  - `first run with failure leaves the section absent` (prev null): the page treats it as "no data", not a crash.
  - `refresh rejects missing secret` gives 401.
  - The Substack and YouTube mappers each have one fixture test. YouTube `follows the uploads playlist`.
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3:** Implement. Give every external fetch a 15 s `AbortSignal.timeout`.
- [ ] **Step 4:** Run `npx vitest run`. Expected: all PASS.
- [ ] **Step 5:** Fill in `.env.example` with `PAYSTACK_SECRET_KEY`, `PADDLE_API_KEY`, `LEMONSQUEEZY_API_KEY`, `ASYNCPAY_SECRET_KEY` (or the DB URL for Path B), `GUMROAD_ACCESS_TOKEN`, `YOUTUBE_API_KEY`, `BASE_ENDPOINT_URL`, `STRAPI_TOKEN`, `BLOB_READ_WRITE_TOKEN`, `CRON_SECRET`. Note next to each: "read-only/restricted key where the provider offers one".
- [ ] **Step 6:** Stage and show the diff. No commit.

---

### Task 8: Page shell: bio, banner, layout, theme

**Files:**
- Create: `components/Bio.tsx`, `components/Banner.tsx`
- Modify: `app/page.tsx`
- Test: `tests/ui/bio.test.tsx` (Vitest + `@testing-library/react`)

**Interfaces:**
- Consumes: `site`, `products`, `readSnapshot()`.
- `app/page.tsx` is a server component with `export const revalidate = 3600`. It reads the snapshot, passes plain data to components, and never imports `lib/revenue/providers` or `lib/content` (only `lib/snapshot/store`).

- [ ] **Step 1: Write failing tests**
  - The tagline renders exactly, with X = 16, `so` lowercase and `16` bold.
  - The newsletter pitch shows `13,000` highlighted (class using the accent).
  - The banner is hidden when `enabled: false`.
  - The YouTube follower count falls back to an em dash `—` when the snapshot has no youtube section.
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3:** Implement the layout to match the approved mockups:
  - Desktop (≥1024px): a two-column grid at roughly 30/70, with the left column `position: sticky; top: 3rem`.
  - Below that: a single column with the bio first.
  - Greyscale headshot from `public/img/headshot@2x.png`.
  - Subscribe form: `<form action="https://kaperskyguru.substack.com/api/v1/free" method="post" target="_blank">` with an `email` field. Verify this lands the visitor subscribed or on Substack's confirm step. If it doesn't, fall back to linking `https://kaperskyguru.substack.com/subscribe?email=<value>`.
  - Social row: X, YouTube, LinkedIn and email, all via `withRef` except `mailto:`.
  - Anchor nav under the social row: Products, Books, Writing, Sponsor, linking to `#products`, `#books`, `#writing` and `#sponsor`.
- [ ] **Step 4:** Run the tests, then `npx next dev`. Screenshot at 390×844 and 1280×800, in light and dark. Compare against the mockups.
- [ ] **Step 5:** Stage and show the diff with screenshots. No commit.

---

### Task 9: Revenue chart, MB card, product cards, compact list

**Files:**
- Create: `components/RevenueChart.tsx` (client component, for the product filter), `components/Sparkline.tsx`, `components/ProductCard.tsx`, `components/MbCard.tsx`, `components/CompactList.tsx`, `lib/format.ts`
- Test: `tests/ui/products.test.tsx`, `tests/format.test.ts`

**Interfaces:**
- `formatMoney(minor: number, currency: string, opts?: { compact?: boolean }): string` uses `Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 0 })`, giving `$1,234` and `₦450,000`, or compact `$1.2K` and `₦450K`.
- `formatMoneyList(m: Money, suffix?: string): string` gives non-zero currencies, USD first, then NGN, then the rest alphabetically, joined with ` · `. An empty `Money` gives `$0` + suffix.
- `splitProducts(products, revenue): { cards: Product[]; compact: Product[] }`. A product is a card if `last30` or any month has a non-zero amount in any currency. Cards sort by `last30.USD` descending, then `last30.NGN` descending; everything else is compact. The books card joins the cards with the name "Books" and URL `store.masteringbackend.com`. (Threshold: my call.)
- `RevenueChart` props: `{ months: MonthPoint[] /* summed per currency across solo products + books */; products: { id, name, months }[]; currencies: string[] }`. It has a USD/NGN toggle (default `USD`, hidden if only one currency exists) and a product dropdown. Headline: `formatMoneyList(12-month totals)` joined with ` + ` instead of ` · `, followed by "in 12 months". Hand-rolled SVG with no chart library: black bars in light mode, white in dark, the partial month hatched, and a dashed zero line. Negative months render below zero.

- [ ] **Step 1: Write failing tests**
  - `MB card shows stats and no money`: the rendered MB card text doesn't match `/[$₦]/`.
  - `chart total excludes mb`: the per-currency totals equal the sum over solo products plus books only.
  - `currencies never mixed`: a product with `{ USD: 1000, NGN: 500000 }` renders the pill `$10/mo · ₦5,000/mo`, and the chart under USD shows only USD amounts.
  - `product with no revenue goes to compact list and shows $0/mo` (compact rows show `$0/mo` text, per spec decision 6).
  - `Error/absent revenue entry shows $0/mo and no sparkline`, not a crash.
  - `sparkline last segment dashed when month partial` (the sparkline plots USD if present, otherwise NGN).
  - `formatMoney(123456, "USD")` is `"$1,235"`, `formatMoney(-5000, "USD")` is `"-$50"`, and `formatMoney(45000000, "NGN")` is `"₦450,000"`.
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3:** Implement. Card pill: `$X/mo`, with `title="Last 30 days, from <provider names>"`. Badge pills for `sold` and `shutdown`. The MB card has a full-width yellow "Company · team of N" tag, the stats, the `site.mb.links` (family, courses, Python30), and in dark mode a 1.5px `#FACC15` border.
- [ ] **Step 4:** Run the tests, then screenshot both viewports and both themes.
- [ ] **Step 5:** Stage and show the diff. No commit.

---

### Task 10: Books shelf, newsletter + blog, latest video, sponsor, footer

**Files:**
- Create: `components/BooksShelf.tsx`, `components/LatestList.tsx`, `components/LatestVideo.tsx`, `components/Sponsor.tsx`, `components/Footer.tsx`
- Test: `tests/ui/sections.test.tsx`

**Interfaces:**
- Consumes the snapshot `books`, `newsletter`, `blog` and `youtube`, plus `site.sponsor` and `site.footerLinks`.

- [ ] **Step 1: Write failing tests**
  - `shelf header`: `"{n} books · {sum downloads} downloads · 4.7 from 80 reviews"`.
  - `newsletter and blog show 3 items each with "All issues" / "All posts" links`.
  - `sponsor shows "as of Nov 12, 2026"` and every offer's price.
  - `footer has revenue note`. The text names the metric, says amounts are shown in their original currency with no conversion, and gives the update time from `snapshot.generatedAt`.
  - `empty section hides itself`: no books gives no shelf heading.
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3:** Implement:
  - The shelf scrolls horizontally on phones.
  - The video is a thumbnail link to YouTube. No inline player (my call: lighter page).
  - Sponsor offers are "Book on Passionfroot" buttons pointing to `https://www.passionfroot.me/solomon-eseme`. Partner names are plain text, with no logos in v1.
  - Footer links: Medium, Dev.to, Backend FM, Publication. Copy the URLs from the old `index.html` and fix the broken `medium.com/kaperskyguru=solomoneseme` to `medium.com/@kaperskyguru` (confirm it resolves).
- [ ] **Step 4:** Run the tests. Screenshot the whole page at both viewports and in both themes.
- [ ] **Step 5:** Stage and show the diff. No commit.

---

### Task 11: Verify numbers, deploy, cut over

**Files:**
- Delete: `index.html`
- Modify: `docs/superpowers/specs/2026-11-12-personal-homepage-design.md` (append a "Launch verification" table)

- [ ] **Step 1:** Ask Solomon for MB stats (learners, countries, founded, team) and the real one-liners for MasteringAI and Affizy. Update the config.
- [ ] **Step 2:** Run the refresh locally with real read-only keys in `.env.local`: `curl -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/refresh`. Expected: `{ ok: true, errors: [] }`.
- [ ] **Step 3:** For each solo product with sources, compare `last30` and the previous full month against that provider's dashboard, using the same window and the same filter. Record each in the spec table as product / provider / site value / dashboard value / match. **Any mismatch over 1% blocks launch.**
- [ ] **Step 4:** Run `npx vitest run && npx next build`. Expected: green.
- [ ] **Step 5:** With Solomon's approval: create a GitHub repo, commit, set up the Vercel project and env vars, deploy a preview, and screenshot the preview.
- [ ] **Step 6:** Solomon approves the preview. Then hand over the DNS change for `solomoneseme.com` (currently `104.219.250.37`): an A record to Vercel's `76.76.21.21`, or a CNAME for `www`. **Ask before touching DNS.** It's an outward-facing change.
- [ ] **Step 7:** After DNS goes live, check `https://solomoneseme.com` at both viewports. Confirm the GA tag fires and the cron ran once (check the Vercel cron log).

---

### Task 12: Match marclou.com layout (owner request 2026-11-12, after Task 10)

Solomon: "Make it match in layout but keep the color and branding." Reference screenshots of marclou.com (dark, 3072px-wide retina): `/private/tmp/claude-501/-Users-kap-Downloads-workspace-academy/7e8aaa8b-1ca0-4451-bfb9-7661c55c5fa5/images/7.png` … `12.png`. CSS px ≈ screenshot px ÷ 2. Colours and tokens stay ours (white/black + `#FACC15`, light/dark by device). This task overrides spec §5's "match the feel, not the pixels" for layout only.

**Files:** Modify `app/page.tsx`, `components/{Bio,RevenueChart,Sparkline,ProductCard,MbCard,CompactList,BooksShelf,LatestList,LatestVideo,Sponsor,Footer}.tsx`, `lib/split.ts`, `lib/snapshot/types.ts` (add optional `thumbnail?: string` to `Post`), `lib/content/{substack,strapi}.ts` (map thumbnails), `tests/fixtures/snapshot.sample.json`, tests under `tests/ui/`.

**Layout targets (CSS px):**
- Page: `max-w-[1280px] mx-auto px-6 lg:px-12 py-14`; desktop grid `lg:grid-cols-[340px_1fr] gap-16`; left column sticky `top-14`. Mobile: one column, bio first.
- Bio: avatar 80px circle (greyscale); name `text-[32px] font-bold tracking-tight`; paragraphs `text-[17px] leading-relaxed text-muted` with bold numbers in `text-text`; subscribe box: bordered rounded-2xl container (`p-1.5`) holding the input and an inner pill button; social row of inline-SVG icons (X, YouTube, LinkedIn, mail) + counts `text-[15px]`.
- Section header pattern: title `text-[17px] font-medium` left, count or "All … →" link right, `border-b border-border pb-3 mb-6`.
- Revenue chart card (always rendered, even with null snapshot → 12 empty months for the last 12 calendar months): `rounded-3xl bg-card border border-border p-7`. Top row: headline `text-[22px] font-bold` (`$X + ₦Y`) + `text-muted` " in 12 months"; right: bordered rounded-lg `<select>` "N products" / individual products. Plot: y-axis labels (0, mid, max of selected currency, compact format) at left, dashed horizontal gridlines at those values, bars centred in 12 equal slots (bar width ≈ 55% of slot, `rx=3`), month short labels ("Dec", "Jan" …) under every bar, partial month hatched, negatives below zero. Bottom row: legend "■ Products" left; currency toggle (USD/NGN) right, styled as small text toggle. Chart height ≈ 190px plot.
- Products: header "My products" + count. MasteringBackend card first, full width, same card style. Then **revenue cards for every solo product that has `sources` (even at $0) plus Books**, `grid sm:grid-cols-2 gap-5`; card `rounded-3xl bg-card border border-border p-6 h-[220px] flex flex-col`: row (icon 32px rounded-lg, name `text-[19px] font-semibold`, pill right `rounded-full bg-text/5 px-3 py-1 text-[14px]` "$X/mo · ₦Y/mo"), tagline `text-[16px] text-muted mt-3`, sparkline fills the remaining height at the bottom as an **area chart** (line + translucent fill, full card width, last segment dashed when partial).
- Compact list (solo products with no sources): `grid sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-7`, each: icon 24px + name `text-[17px] font-medium` + inline grey badge pill (`$0/mo`, or "Sold for $X"/"Shut down") , description `text-[15px] text-muted` (2 lines max, no truncation to one line).
- Writing: two columns `lg:grid-cols-2 gap-8`, each with header ("Newsletter · All issues →", "Blog · All posts →") then one `rounded-3xl bg-card border p-6` card listing 3 items: thumbnail `w-[104px] h-[72px] rounded-lg object-cover` (letter/blank fallback), meta row `text-[15px] text-muted` ("Sep 8 · ♥ 905" newsletter likes; blog date only), title `text-[18px] font-semibold leading-snug`.
- Latest video: `grid lg:grid-cols-[1.45fr_1fr] gap-10 items-center`: left 16:9 thumbnail `rounded-3xl` with centred 64px white circular play button; right: "▶ My latest video" muted, title `text-[28px] font-bold leading-tight`, "Nov 2 · 42,243 views" (views bold), "All videos ↗".
- Books: `grid lg:grid-cols-[auto_1fr] gap-10 items-center`: top-downloaded book cover (`w-[180px]` shadow, slight rotate `-2deg`; fallback = styled title block) ; right: "I wrote {n} books" `text-[26px] font-bold`, one-line description "Free and paid guides on backend engineering, from Node.js to Rust.", buttons: pill "Browse all books" (bg-text text-bg) + bordered pill "Top: {book name}", then "{downloads} downloads · ★ 4.7 from 80 reviews". Below: horizontal scroll of the other covers (small, 80px).
- Sponsor and Footer: keep, restyled to the same card radius/spacing.

**Tests to add/update:** chart renders 12 month labels and the select with a null snapshot; tracked $0 product (e.g. Profaily with sources, no revenue) renders as a card not compact; untracked product renders in compact with "$0/mo" badge; newsletter item renders thumbnail when present and fallback when absent; video block shows views; books block heading "I wrote 4 books" from sample. Keep every prior currency/MB/withRef guarantee and existing tests green.

**Verify:** `npx vitest run`, `npx tsc --noEmit`, `NEXT_DIST_DIR=.next-verify npx next build` (restore tsconfig byte-identical, delete `.next-verify`). No `next dev`; controller screenshots Solomon's :3000.

---

### Task 13: Pixel-faithful marclou.com layout from measured reference (owner request 2026-11-12)

Solomon: "The design must be clean exactly like the references… include the graphs." **Binding source:** `docs/superpowers/specs/2026-11-12-marclou-design-reference.md` (measured values; follow them exactly — container widths, breakpoints, card ring-shadow instead of border, 18px radius, 20/24px padding, type scale, section rhythm 64px, chart built from positioned HTML (not SVG) with 5%-width bars, hatching spec, 25%-opacity current month, sparkline 56px inside padding with 1.5px line @75% and 5% fill and dashed last segment, dotted radial-gradient pattern behind avatar, mobile changes). Screenshots: `/private/tmp/claude-501/-Users-kap-Downloads-workspace-academy/7e8aaa8b-1ca0-4451-bfb9-7661c55c5fa5/scratchpad/marc-research/`. Map Marc's **colour roles** onto OUR tokens (light: page/card white `#ffffff`, text `#09090b`, muted `#71717a`; dark: page `#0a0a0a`, card `#141414`, text `#fafafa`, muted `#a1a1aa`; ring shadow = black 6% light / white 8% dark; accent `#FACC15` only for subscriber-count highlight and top banner). Our content and data stay as they are.

**Owner decisions (binding):**
1. Any product revenue pill with nothing to show → `$0/mo` (cards and compact list, incl. null snapshot / errored / tracked-without-data). No "—" anywhere for amounts.
2. MasteringBackend is a **regular card** in the startup-card grid, same size/style as others (no full-width box, no stats block, no yellow outline). Single-line tagline (truncate). Where the sparkline goes: one muted line `X learners · Y countries · since YYYY` (omit zero/unknown parts).
3. Remove the "Company" tag/badge everywhere. MB-group products (MasteringBackend card; Backend Projects, Backend Weekly, Get Backend Jobs listings) show **no amount pill at all** (empty). MB revenue is never fetched/shown/summed.
4. Archived products (contentre, nuxifysaas): "Archived" badge, no link, domain never rendered.
5. Include the graphs: revenue chart (with product filter dropdown + our USD/NGN toggle in the legend row where Marc has "Show investments"), per-card sparklines, and a **GitHub contributions graph** section like Marc's (header "GitHub" + username link ↗; card "N contributions in the last year"; 53-week grid of cells with day labels Mon/Wed/Fri, month labels, Less→More legend; 5 levels mapped to our muted→text colour; mobile shows last 26 weeks).
   - Data: add `lib/content/github.ts` `fetchGithub(username)` parsing the public `https://github.com/users/<username>/contributions` HTML (cells `data-date` + `data-level`, and the "N contributions" heading; no token). Add `github?: { username, total, days: {date, level}[] }` to Snapshot, wire into buildSnapshot/merge as section "github" (keep last-good on failure), username from `config/site.ts` `github.username` (default "kaperskyguru"). Hide the section if absent. Tests with an HTML fixture.
6. Section order (desktop right column): revenue chart → "My products" cards (MasteringBackend first, then tracked products by revenue, Books) → compact grid (MB family, untracked, archived) → GitHub → Newsletter + Blog (two columns, like Marc's Newsletter + Tweets) → Latest video → Books block → Sponsor → (footer per reference: mobile-only, plus the revenue-measurement note somewhere visible on desktop too, small, at the very bottom of the right column).
7. Mobile behaviour per reference (subscribe form moves into the Newsletter card on mobile, every other chart month label hidden, etc.).

Keep all existing guarantees/tests (currency never mixed, MB excluded, withRef, client boundary — the chart may become a client component for the dropdown/toggle but must import nothing server-side). Update tests whose expectations change; add tests for decisions 1–5.

**Verify:** `npx vitest run`, `npx tsc --noEmit`, `npx eslint app components lib config`, verify build via `NEXT_DIST_DIR=.next-verify` (restore tsconfig.json + next-env.d.ts byte-identical, delete dir). No `next dev`; controller screenshots Solomon's :3000 at 1536 and 390 and compares side by side with the reference screenshots.
