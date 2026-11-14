# solomoneseme.com: personal homepage redesign

Date: 2026-11-12 · Owner: Solomon Eseme · Status: design, awaiting approval

## 1. Intent

Solomon wants his own space on the internet: one page that holds everything he has built and published (products, books, newsletter, blog, videos and sponsorships), with **real, verifiable revenue** pulled from payment providers. The reference is marclou.com, but the page must look like Solomon's site, not Marc's.

**Primary audience: indie hackers and founders.** They usually arrive from X, a launch, or a shared revenue screenshot, and they ask: "Is this person actually making money from what he builds?" The page answers with live numbers taken straight from the providers. Secondary audiences (backend learners, sponsors, press) are served lower on the page.

**What visitors should leave believing:** Solomon builds many real products, and the revenue numbers are true.

**Primary action:** subscribe to the newsletter (Backend Weekly on Substack). **Secondary:** click through to products, and book a sponsorship.

## 2. Goals, non-goals, anti-goals

**Goals**
- Every revenue number is computed from a payment provider's API. None are typed in by hand.
- All content blocks (newsletter, blog, video, books) refresh on their own.
- One page that works on phones and on desktop, in light and dark.
- Easy to add a product or switch a product to a new payment account: edit one config entry.

**Non-goals (v1)**
- Tweets. They were dropped: X's free endpoints can't list a user's latest tweets (the timeline endpoint returns `429`), and the paid API isn't worth it now. The X link and follower count stay in the bio.
- Health data, the travel globe, and sub-pages like Marc's `/newsletter`, `/tweets` and `/health`.
- A CMS or admin UI. Hand-edited values live in one config file in the repo.

**Anti-goals (would be a failure even if it works)**
- Any number that looks invented or inflated. One fake-looking figure breaks trust with this audience.
- Showing MasteringBackend company revenue. MB is a company with staff, and its revenue is never shown or included in totals.
- Payment API keys reachable from the browser.
- A broken or empty page because one provider's API is down.

## 3. Current state

- Repo: `solomoneseme` (local only, no git remote yet). It contains one hand-written `index.html` with a plain link list of 14 products, a yellow top banner (Python30 promo), domains, podcast and blog links. Google Analytics tag `G-SZJV1XR97S`. Assets: `img/headshot@1x.png`, `img/headshot@2x.png` (greyscale photo), favicons.
- Domain `solomoneseme.com` currently resolves to `104.219.250.37` (shared hosting). DNS needs repointing at launch.
- All outbound links carry `?ref=solomoneseme&utm_source=solomoneseme`. Keep that convention.

## 4. Decided by Solomon

1. **Layout: option A, Marc-style.** On desktop, the bio sits in a sticky left column and a scrolling feed sits on the right. On phones, everything is one column with the bio first.
2. **Colours: the current site's palette, following the device theme.**
   - Light: white background, near-black text (zinc scale).
   - Dark: near-black `#0a0a0a` background, charcoal cards (`#141414`, borders `#232323`), white text.
   - Only one accent colour, yellow `#FACC15` (from the current banner), used sparingly: the MasteringBackend "Company" tag and card outline (in dark), the subscriber-count highlight, and the top banner.
   - Buttons are black pills in light mode and white pills in dark mode.
   - Greyscale headshot.
   - Approved mockups: `.superpowers/brainstorm/25780-1794438048/content/products-layout-v2.html` (light) and `products-layout-v3-dark.html` (dark).
3. **Tagline, exactly:** "I got fired from an unpaid internship, so I built **X** products from Lagos. One became a company with a team." X is computed from the product list. ("so" is lowercased after the comma; Solomon was told and can revert.)
4. **MasteringBackend revenue is never shown.** Its card is pinned first and shows company stats instead: learners, countries, founding year and team size. MB company products are excluded from the revenue chart and the total.
5. **Exact revenue is shown for every solo product.**
6. **Products with no mapped payment account show `$0/mo`.**
7. **Gumroad books count as Solomon's revenue.** They get a revenue card and are included in the 12-month total.
8. **Content sources:**
   - Newsletter: Substack, `kaperskyguru.substack.com` ("Backend Weekly")
   - Videos: YouTube, `@solomoneseme`
   - Blog: `blog.masteringbackend.com/authors/kaperskyguru`
   - Books: Gumroad store `store.masteringbackend.com`
   - Sponsorships: Passionfroot, `passionfroot.me/solomon-eseme`
9. **Tweets are out of v1.**
10. **All 14 products on the current site are still live,** so there are no "sold" or "shut down" badges for now. Keep support for those badges.

## 5. Page structure (top to bottom)

**Optional top banner.** Yellow strip with text and a black pill CTA, like the current Python30 banner. On or off via config.

**Left column (sticky on desktop):**
- Headshot, name, tagline.
- Newsletter pitch: "Join **N** founders and engineers reading Backend Weekly …". N is highlighted in yellow and comes from config (see §7).
- Subscribe box: email input and a button that subscribes on Substack. Using Substack's own subscribe endpoint or embed is left to the builder; the visitor must land subscribed, or be on Substack's confirm step.
- Social row with follower counts: X `@kaperskyguru`, YouTube (live count), LinkedIn `solomoneseme`. X and LinkedIn counts come from config.
- Small nav or anchor links: Products, Books, Writing, Sponsor.

**Right column:**
1. **Revenue chart.** "$TOTAL in 12 months" over 12 monthly bars, solo products only, with the current, unfinished month hatched. A dropdown filters to a single product. No "investments" series (Marc has one; Solomon doesn't).
2. **"My products" header with count.**
3. **MasteringBackend flagship card**, full width and pinned first: company tag, one-liner, company stats, and its family (Backend Projects, Backend Weekly, Get Backend Jobs) listed inside the card as small links, with no revenue anywhere.
4. **Revenue cards,** two per row and sorted by last-30-days revenue, highest first. Each card has: icon, name, `$X/mo` pill (last 30 days), one-liner, and a 12-month sparkline whose final segment (the current month) is dashed. The Gumroad books card sits among them.
5. **Compact list** of products under a threshold the builder picks (e.g. `$0/mo` or no data): icon, name and one-liner in a 3-column grid, as on Marc's page. This keeps the page from filling up with zero-revenue cards. Badge support: "Sold for $X", "Shut down".
6. **Books shelf.** Covers sorted by downloads, each with rating and real download/sales count. Header: "N books · X downloads · rating from R reviews" (currently 18 books, 4.7 from 80 reviews). Links to Gumroad product pages.
7. **Newsletter + Blog,** side by side on desktop and stacked on phones. Each shows its 3 latest items with title and date, plus an "All issues" or "All posts" link. Newsletter items show likes (Substack doesn't expose views). Blog items link to blog.masteringbackend.com.
8. **Latest YouTube video.** Large thumbnail with play button, title, date, real view count, and an "All videos" link. Clicking plays inline or opens YouTube; the builder decides.
9. **Sponsor block,** one row per channel, with audience stats, starting prices, a "Book on Passionfroot" button and past partner logos. Data comes from config (Passionfroot has no API) with an "as of <date>" note. Current values, from Passionfroot on 2026-11-12:
   - Backend Weekly: 13K subscribers, 35% open, 5% CTR · Top ad $500 · 3-issue bundle $1,200 · Classified $300
   - X @Kaperskyguru: 37.7K followers, 1.6M impressions · Tweet $200 · Thread $500
   - LinkedIn: 14.2K followers, 5.9K impressions/post · Post $200 · 2-post bundle $325
   - Past partners: Treblle, Larafast, Bright Data, Blackbox.ai, Remix
10. **Footer:** name, tagline, copyright, and a short "How revenue is measured" note (see §6).

Reference measurements and behaviour come from marclou.com, inspected 2026-11-11: desktop column split is about 30/70; the revenue card shows "$X/mo in the last 30 days"; the compact grid has 3 columns. Match the feel, not the pixels.

## 6. Revenue: how it is measured

- **Per product:** a list of one or more `(provider, account credentials, optional filter)` sources, kept in config. One product can have several sources (Profaily uses two).
- **Providers to support in v1:** Paystack, Paddle, Lemon Squeezy, AsyncPay, Gumroad. Stripe is optional, depending on what Affizy turns out to use.
- **Metric (my call):** gross amount actually paid, minus refunds, before provider fees. "Last 30 days" is a rolling 30 days. Monthly bars are calendar months in UTC.
- **Currency (decided by Solomon 2026-11-12): no conversion.** Totals are kept per currency, mainly USD (`$`) and NGN (`₦`), and shown side by side. Any other currency a provider reports gets its own bucket the same way. My calls on display:
  - Card pill: `$1,234/mo · ₦450,000/mo`, showing only currencies with a non-zero total; `$0/mo` if none.
  - Headline: `$X + ₦Y in 12 months`.
  - Chart: a USD/NGN toggle, defaulting to USD, with bars for the selected currency.
  - Card order: by last-30 USD, then by last-30 NGN.
- **Refresh:** a scheduled server job, at least daily and hourly if cheap, fetches from providers and stores a snapshot. The page renders from the latest good snapshot. If a provider fails, keep that product's previous numbers and log the failure, rather than showing 0 or an error. The visible "updated <time>" reflects the last successful fetch.
- **History:** the 12-month chart needs history. Either query providers by date range on every run or keep monthly snapshots; the builder decides. A product launched within the last 12 months shows bars only from its launch.
- **Keys:** server-side env vars only. Use read-only or restricted keys wherever the provider offers them. Never ship them to the client.

### Product → source map (current best knowledge)

| Product | Group | Source |
|---|---|---|
| MasteringBackend | MB company | none (stats only) |
| Backend Projects | MB company | none (shown inside the MB card) |
| Backend Weekly | MB company | none (shown inside the MB card) |
| Get Backend Jobs | MB company | none (shown inside the MB card) |
| Profaily | solo | Paystack + Paddle |
| Boilerplatesearch | solo | Lemon Squeezy |
| MasteringAI | solo | AsyncPay |
| Books (Gumroad) | solo | Gumroad |
| Affizy | solo | unknown, `$0/mo` until mapped |
| Contentre, Enterprise Vue, Codeplayground, Codeprenuers, NuxifySaaS, Techpad, AI for Developers, Backend Joy | solo | unknown, `$0/mo` until mapped |

Profaily, Boilerplatesearch and MasteringAI providers were inferred from their codebases. Confirm each against the live account during setup.

### Shared accounts: filtering is required (confirmed by Solomon 2026-11-12)

**Profaily's Paddle and Paystack accounts, and MasteringAI's AsyncPay account, are the same accounts MasteringBackend uses.** Pulling "all transactions" from them would leak MB company revenue into solo totals, which breaks an anti-goal. Every source in config therefore carries a **required filter**, and a source without one is treated as an error, not as "everything".

| Product | Account | Filter (from the product's own code) |
|---|---|---|
| Profaily | Paddle (shared with MB) | Profaily's Paddle **price IDs**, the `PADDLE_PRICE_*` values in Profaily's env |
| Profaily | Paystack (shared with MB) | Profaily's Paystack **plan codes**, the `PAYSTACK_PLAN_*` values in Profaily's env |
| MasteringAI | AsyncPay (shared with MB) | AsyncPay metadata **`source`** (set in `masteringai/lib/automation.ts`) |
| Boilerplatesearch | Lemon Squeezy | store ID (filter even if the account looks dedicated) |
| Books | Gumroad | whole account, minus the `exclude` list |

**Known risk: AsyncPay.** In past MB work, AsyncPay's *completed* payment event dropped `meta_data`, so metadata didn't reach MB's backend. It's unproven whether AsyncPay's transaction-listing API returns the `source` field. **First task of the build:** a throwaway spike that lists recent AsyncPay transactions with a read-only key and checks whether MasteringAI's payments can be told apart. If they can't, fall back to MasteringAI's own payment records, in its database, as that product's source. Don't show a MasteringAI number until one of the two paths is verified against the dashboard.

**Spike result (2026-11-12): Path A works.**
- **Endpoint:** `GET https://api.asyncpay.io/v1/payment-requests?per_page=50&page=N`, with a Bearer key. Paginate until `next_page_url` is null. About 688 rows on that date.
- **MasteringAI filter:** `meta_data.source` ∈ {`scholarship_page`, `ai_automation_scholarship`}.
- **Paid** means `status == "successful"`, OR `status == "awaiting_verification"` with `last_transaction.status == "successful"`. 77 such rows exist, mostly Aug–Sep, and the charge went through. *Confirmed by Solomon 2026-11-12: count them.*
- **MB rows are also distinguishable:** `learn-tech` source, or no source with `intent=subscription`.
- **Amounts:** `amount` is a **string in major units** (naira, e.g. `"15000"` or `"9999.00"`). The adapter converts it to minor units (×100). `currency` is a top-level field, and all rows are NGN.
- **Refunds:** no refund representation is visible through this API.
- **PII:** responses contain customer PII, so they stay server-side and are never stored in the snapshot.
- **Path B rejected:** MasteringAI stores no payments itself, and academy's `Payment` ledger mixes products and drops `meta_data`.

Same check for Paddle and Paystack: confirm the price IDs and plan codes catch every Profaily sale (including one-off payments, renewals and refunds) before launch.

**Product count X (my call):** the number of product entries in config, excluding the books card. That's the 14 on today's site plus MasteringAI and Affizy, so 16.

**Product copy:** reuse the one-liners from the current `index.html`. Update Profaily's to its current positioning ("Typefully for video"); the copy is the builder's to draft, for Solomon's review. Affizy and MasteringAI need one-liners.

**Gumroad scope (my call):** every product in the Gumroad account counts as a book. On 2026-11-12 the store listed 18 products, all PDF or EPUB ebooks, with no courses or bundles. The shelf's download count includes free downloads; revenue counts paid sales only. Add an `exclude` list in config in case a non-book product is ever added.

### Sections from today's site (my calls)

| Old section | Fate |
|---|---|
| Roadmap Courses (6 MB course links) | Small links inside the MasteringBackend card |
| Challenges (Python30 + "launching soon") | Python30 goes inside the MB card and can feature in the banner. "Launching soon" items are dropped. |
| Domains (designbuddy.org, getrustjobs.com, rustdaily.com, backendconf.com) | Dropped. They're parked domains, not products. |
| Podcast (YouTube, Backend FM) | YouTube is already in the video block. Backend FM goes as a link in the footer. |
| Others (Medium, Dev.to, blog, publication) | Footer link row |
| Email link | Kept in the bio social row (`solomon@masteringbackend.com`) |

All kept outbound links keep the `ref`/UTM tags.

## 7. Values Solomon edits by hand (one config file)

- Newsletter subscriber count (currently 13K per Passionfroot; Substack has no public count).
- X and LinkedIn follower counts.
- MasteringBackend stats: learners, countries, founding year and team size. Pulling these live from the MB API is a later improvement.
- Sponsor block data and its "as of" date.
- Banner text, link and on/off switch.
- Product list: name, URL, icon, one-liner, group, sources, and an optional badge.

## 8. Live content sources

| Block | Source | Notes |
|---|---|---|
| Newsletter items | Substack archive API `kaperskyguru.substack.com/api/v1/archive` (verified working) or `/feed` RSS | Title, date, likes |
| Blog posts | Strapi API behind blog.masteringbackend.com (same one the `mb-blog` repo uses: `BASE_ENDPOINT_URL` / `STRAPI_TOKEN`), filtered to author `kaperskyguru` | Title, date, URL |
| Latest video + YouTube subscribers | YouTube Data API v3 (API key) | View counts are real |
| Books | Gumroad API (access token) | Downloads, sales, revenue, rating if available. Otherwise show rating from config |

Same rule as revenue: on failure, keep the last good copy.

## 9. How it gets made (my calls, open to override)

- Replace the static `index.html` with a **Next.js (App Router) + TypeScript + Tailwind** site in the same repo. Tailwind isn't required; the builder may choose plain CSS.
- Host on **Vercel**, using a Vercel cron for the refresh job. Snapshot storage (Vercel Blob, KV, or a small Postgres) is the builder's call.
- Keep Google Analytics `G-SZJV1XR97S`.
- System font stack, matching today's site.
- Add `.superpowers/` to a new `.gitignore`. Create a GitHub remote when Solomon wants one.
- Solomon's standing rule: nothing is committed without his explicit approval.

## 10. Left to the builder

Snapshot storage, refresh frequency (at least daily), chart library (or hand-rolled SVG), compact-list threshold, Substack subscribe mechanism, video play behaviour, and exact spacing and type scale within the approved mockups.

## 11. Launch checklist (outline)

1. Solomon provides read-only keys or tokens: Paystack, Paddle, Lemon Squeezy, AsyncPay, Gumroad, YouTube, Strapi.
2. Verify every product's numbers against its provider dashboard for the same window before going public.
3. Point `solomoneseme.com` DNS to Vercel.
