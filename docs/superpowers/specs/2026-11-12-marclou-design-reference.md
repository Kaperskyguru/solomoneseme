# marclou.com — measured design reference (layout clone, re-skinnable)

Measured 2026-11-12 with the gstack headless browser at **1536×960** (desktop), **1100×900** (lg spot-check) and **390×844** (mobile), via `getBoundingClientRect()` + `getComputedStyle()` + stylesheet inspection. All px values are measured unless marked "(class)" (read from the Tailwind class and consistent with the measurement).

**Stack (observed):** Next.js + Tailwind CSS v4 + shadcn/ui tokens (`--background`, `--card`, `--muted`, …), colours authored in `lab()`/`oklab` with hex fallbacks. Everything is a Tailwind utility — the class names quoted below can be copied directly into a Tailwind v4 project.

> **Most important fact:** the revenue chart is **NOT SVG**. It is absolutely-positioned HTML `<span>`s inside a relative box (bars, gridlines, labels). Only the per-startup sparklines and the health rings are SVG.

---

## 0. Design tokens (copy these, then swap colours)

```css
:root {
  --radius: .625rem;                 /* 10px */
  /* radius scale used: rounded-md = r*.8 = 8px, rounded-lg = r = 10px,
     rounded-xl = r*1.4 = 14px, rounded-2xl = r*1.8 = 18px */
  --background: #fff;  --foreground: #0a0a0a;
  --card: #fff;        --card-foreground: #0a0a0a;
  --popover: #fff;
  --primary: #171717;  --primary-foreground: #fafafa;
  --secondary: #f5f5f5; --secondary-foreground: #171717;
  --muted: #f5f5f5;    --muted-foreground: #737373;
  --border: #e5e5e5;   --input: #e5e5e5;  --ring: #a1a1a1;
  --surface-shadow:       0 0 0 1px #0000000f, 0 1px 2px -1px #0000000f, 0 2px 4px 0 #0000000a;
  --surface-shadow-hover: 0 0 0 1px #00000014, 0 1px 2px -1px #00000014, 0 2px 4px 0 #0000000f;
}
.dark {
  --background:#0a0a0a; --foreground:#fafafa; --card:#171717; --popover:#171717;
  --primary:#e5e5e5; --primary-foreground:#171717; --secondary:#262626; --muted:#262626;
  --muted-foreground:#a1a1a1; --border:#ffffff1a; --input:#ffffff26; --ring:#737373;
  --surface-shadow: 0 0 0 1px #ffffff14; --surface-shadow-hover: 0 0 0 1px #ffffff21;
}
/* custom utilities */
.shadow-border       { box-shadow: var(--surface-shadow); }        /* THE card "border" */
.shadow-border-hover { box-shadow: var(--surface-shadow-hover); }
.hatched { background-image: repeating-linear-gradient(-45deg,
           currentColor 0 1px, transparent 1px 4px); }            /* investments */
.bg-dots { background-image: radial-gradient(circle at 1px 1px,
             color-mix(in oklab, var(--foreground) 14%, transparent) 1px, transparent 0);
           background-size: 22px 22px;
           mask-image: radial-gradient(60% 70% at 50% 0, #000 20%, transparent 70%); }
.animate-enter { animation: enter .4s cubic-bezier(.2,0,0,1) both;
                 animation-delay: calc(var(--stagger,0) * 80ms); } /* off under reduced-motion */
```

Cards have **no CSS border**: separation from the (identical white) page comes only from the 1px ring in `--surface-shadow`. Card bg == page bg in light mode.

---

## 1. Page shell

| Item | Desktop 1536 | lg 1100 | Mobile 390 |
|---|---|---|---|
| Body | bg `--background`, color `--foreground`, 16px/24px Geist, `-webkit-font-smoothing: antialiased` | same | same |
| Outer container | `mx-auto max-w-7xl px-5` → **1280px** wide, padding **0 20px**, x=128 | | 390 wide, 20px gutters |
| Layout | `lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-12 xl:grid-cols-[21rem_minmax(0,1fr)] xl:gap-16` → **336px + 840px, gap 64px** | **272px + 740px, gap 48px** | block (stacked) |
| Left column (`<aside>`) | `lg:sticky lg:top-0 lg:self-start lg:py-14` → sticky at **top:0**, padding **56px 0** (so visual top = 56px). Height 509px | same rules | `pt-8` (32px), not sticky |
| Right column | `min-w-0 pt-8 pb-24 lg:pt-14` → padding **56px 0 96px** | | padding 32px 0 96px |
| Page height | 4713px | | 9164px (incl. footer) |

No top nav and no footer on the desktop home page (see §13/§14). Only the floating popup is fixed.

---

## 2. Left bio column

Structure: `aside.relative.isolate` → dots layer, avatar+text block, newsletter block (desktop only), social row.

**Dotted background**
- `div.pointer-events-none.absolute.-inset-x-5.top-0.-z-10.h-56.lg:h-96.bg-dots` — **CSS radial-gradient**, not SVG/image.
- Box: 376×384 at desktop (bleeds 20px left/right of the 336 column; **384px tall**), 390×224 on mobile.
- Dot: 1px-radius circle at 1px,1px of every **22×22px** tile, colour foreground @ **14%**.
- Faded by `mask-image: radial-gradient(60% 70% at 50% 0, black 20%, transparent 70%)` → strongest top-centre, gone by ~70%.
- Because it lives inside the sticky aside, it scrolls *with* the sticky column.

**Avatar + identity block** (`flex items-center gap-4 lg:flex-col lg:items-start lg:gap-5`)
- Avatar `img.size-14.lg:size-20.rounded-full.object-cover` → **80×80** desktop / **56×56** mobile, full circle, `outline: 1px solid rgb(0 0 0/.1); outline-offset:-1px`, `box-shadow: 0 8px 24px -8px rgb(0 0 0/.25)`.
- Gap avatar→h1: **20px** (desktop column), **16px** (mobile row: avatar left, text right, vertically centred).
- `h1` "Marc Lou": `text-2xl lg:text-3xl font-semibold tracking-tight` → **30px / 36px lh / 600 / -0.75px** desktop; 24px/32px mobile. Colour foreground.
- Para 1: `mt-2 text-[15px] text-muted-foreground text-pretty` → **15px / 22.5px / 400, #737373, margin-top 8px**.
- Para 2: same but `mt-4` (16px).
- **Bold numbers** inside paragraphs: `<span class="font-medium text-foreground tabular-nums">` → 15px **500**, colour **foreground** (#0a0a0a) — i.e. emphasis by weight+colour switch, not bold 700.

**Newsletter block** (`mt-4 max-lg:hidden` — desktop only; moves into Newsletter card on mobile, §8)
- Copy `p.text-[15px].text-muted-foreground.mb-3` (margin-bottom 12px), with tabular number span as above.
- "my newsletter" link: `underline decoration-foreground/30 underline-offset-4 hover:text-foreground hover:decoration-foreground` → muted text colour, underline colour **foreground @30%**, offset **4px**, thickness auto; on hover text + underline go full foreground (150ms).
- Form wrapper: `flex items-center gap-1.5 rounded-xl bg-background p-1.5 shadow-border focus-within:shadow-border-hover focus-within:ring-3 focus-within:ring-ring/25` → **336×48, radius 14px, padding 6px, gap 6px**, ring-shadow border (no CSS border).
- Input: `h-9 flex-1 bg-transparent px-2.5 text-base outline-none` → **36px tall, 16px font, padding 0 10px**, placeholder `you@example.com` in muted colour. No border of its own.
- Button "Subscribe": **99.6×36, radius 8px, padding 0 16px, 14px / 500**, bg `--primary` (#171717), text #fafafa, 1px transparent border, `active:scale-[0.96]`, hover bg primary/80.

**Social row** (`ul.flex.flex-wrap.items-center.gap-x-5.lg:gap-x-4.xl:gap-x-6.mt-4`)
- 4 items (X, YouTube, LinkedIn, Instagram), column-gap **24px** xl / 16px lg / 20px mobile; margin-top 16px.
- Each link: `-mx-2 flex h-8 items-center gap-1.5 rounded-full px-2 text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground` → **32px tall pill**, 13px/19.5px muted, gap 6px; negative margin so the hover pill bleeds 8px past the text.
- Icon: **14×14** (`size-3.5`) — *two stacked SVGs*: a muted monochrome one and a brand-coloured one (`opacity-0 group-hover:opacity-100`, e.g. YouTube `#ff0000`, LinkedIn `#0a66c2`, X/Instagram foreground) → icon cross-fades to brand colour on hover.
- Count text (`423K`) `tabular-nums`.

---

## 3. Revenue chart card (HTML, not SVG)

**Card:** `rounded-2xl bg-card p-4 sm:p-5 shadow-border` → **840×282.5**, radius **18px**, padding **20px** (16px mobile).

**Header row** `mb-4 flex items-start justify-between gap-4` (margin-bottom 16px)
- `p.text-sm.text-muted-foreground.tabular-nums` containing `<span class="text-xl font-semibold tracking-tight text-foreground max-sm:block">$1,252,231</span> in 12 months`
  - Number: **20px / 28px / 600 / -0.5px**, foreground. Suffix: **14px / 20px muted**, inline on desktop; on mobile the number becomes `block` so the suffix drops to line 2.
- Dropdown (shadcn Select trigger, `data-size=sm`): **144×28** (`min-w-36 h-7`), `border 1px var(--input)` (#e5e5e5), radius **8px** (`min(var(--radius-md),10px)`), padding **8px 8px 8px 10px**, 14px text foreground, gap 6px, transparent bg, chevron-down lucide **16px** muted, `justify-between`.

**Plot area** `grid grid-cols-[auto_1fr] gap-x-2 sm:gap-x-3 text-[11px] text-muted-foreground tabular-nums`
- Y-label column: auto width (33px desktop / 24px mobile), font **11px desktop / 10px mobile**, leading 1. Labels are `absolute right-0 -translate-y-1/2` at `top: N%`. Desktop labels `$250K / $125K / $0 / −$80K`; mobile drops the `$` (`250K / 125K / 0 / −80K`). Uses real minus `−` (U+2212). An invisible copy of the widest label sizes the column.
- Plot box: `relative h-28 sm:h-36` → **755×144** desktop, **286×112** mobile. Column gap 12px desktop / 8px mobile.
- **Gridlines:** one `span.absolute.inset-x-0.border-t.border-dashed.border-border` per tick at `top: 0% | 37.88% | 75.76% (zero line) | 100%` — **1px dashed #e5e5e5**, browser default dash pattern. The zero line is just another dashed line (same style).
- Ticks are data-driven: domain −80K…250K → zero at 75.76% from top.
- **Bars** (inside `div[role=img].absolute.inset-0`), 12 month slots:
  - Slot centre: `left: (i+0.5)/12 * 100%` (4.1667%, 12.5%, …, 95.833%), `-translate-x-1/2`.
  - Bar width **5% of plot width** (≈37.8px desktop, ≈14.3px mobile) — slot is 8.333%, so gap ≈ 40% of slot.
  - **Startup revenue bar:** `absolute bottom-0` with inline `bottom: 24.24%` (zero line) and `height: max(H%, 2px)`; `bg-foreground`; `rounded-t-[3px]` (top corners 3px, bottom square) — **but `rounded-t-none` when a positive investment segment is stacked on top**.
  - **Positive investment:** stacked on top with a **2px gap**: `bottom: calc(zero% + max(H%,2px) + 2px)`; `hatched bg-foreground/[0.05] text-foreground/50 rounded-t-[3px]`.
  - **Negative investment:** hangs below the zero line with 2px gap: `bottom: calc(zero% - max(h%,2px) - 2px)`; same hatch, `rounded-b-[3px]`.
  - Hatch = `repeating-linear-gradient(-45deg, currentColor 0 1px, transparent 1px 4px)` where currentColor = foreground @50%, over a fill of foreground @5% → 1px diagonal lines every ~4px.
  - **Current/partial month (last bar)**: revenue `bg-foreground/25` (faded grey); its investment hatch `bg-foreground/[0.02] text-foreground/20`.
  - Minimum height for any segment: 2px.
  - Transition: `transition-[height,bottom,opacity] duration-300 ease-[cubic-bezier(0.2,0,0,1)]` (animates when the dropdown filter changes).
- **X labels:** `div.relative.col-start-2.mt-3.h-3.5` (12px below plot, 14px tall). Each label `absolute top-0 leading-none` at `left: centre%` with `transform: translateX(-centre%)` — this proportional shift keeps the first/last labels inside the box. 11px muted. On mobile every other month is `hidden sm:block` (shows Jan, Mar, May, Jul, Sep, Nov).

**Legend row** `mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[11px] text-muted-foreground`
- Left: `p.flex.gap-4` with two items `flex items-center gap-1.5`: swatch **8×8, radius 2px** (`size-2 rounded-[2px]`): solid foreground for "Startups"; hatched (same classes as bar) for "Investments".
- Right: `label` "Show investments" with custom checkbox: `size-3` (**12px**) `appearance-none rounded-[3px] border border-foreground/20`, checked → `bg-foreground/40` + white lucide check **8px** stroke 3.5; label hover → text foreground, border /35. Hit-area enlarged via `after:-inset-x-2 after:-inset-y-2.5`.

**Hover / tooltip** (an overlay `div.absolute.inset-0.touch-pan-y` above the bars catches pointer events)
- Column highlight: `span.absolute.inset-y-0.-translate-x-1/2.rounded-md.bg-foreground/[0.05]` at the slot centre, **width 8.333% (one full slot), full plot height, radius 8px**.
- Tooltip: `absolute top-0 z-10 w-max min-w-36 flex flex-col gap-1.5 rounded-lg bg-popover px-3 py-2.5 text-xs shadow-lg ring-1 ring-border/70` → **min 144px wide, radius 10px, padding 10px 12px, 12px text, rows gap 6px**, shadow `0 10px 15px -3px rgb(0 0 0/.1), 0 4px 6px -4px rgb(0 0 0/.1)` + 1px ring border@70%. Aligned to the plot top, placed beside the hovered column via inline `left: Npx` (to the left of the column when near the right edge).
  - Row 1: month "September 2026" `font-medium`.
  - Rows: `flex justify-between gap-4`; left `flex items-center gap-2 text-muted-foreground` with **14px** icon (`rounded-[3px]`) + name; right value `font-medium tabular-nums`. "Others" uses an 8px swatch `bg-muted-foreground/25`; "Investments" uses the hatched 8px swatch; negative shown as `−$7,356`.
  - Total row: `mt-0.5 border-t border-border pt-2 items-baseline`; label `text-[10px] font-medium tracking-wider uppercase text-muted-foreground` "TOTAL", value font-medium.

Cleaned structure:

```html
<div class="rounded-2xl bg-card p-4 sm:p-5 shadow-border">
  <div class="mb-4 flex items-start justify-between gap-4">
    <p class="text-sm text-muted-foreground tabular-nums">
      <span class="text-xl font-semibold tracking-tight text-foreground max-sm:block">$1,252,231</span> in 12 months</p>
    <button class="h-7 min-w-36 rounded-lg border border-input py-2 pr-2 pl-2.5 text-sm flex justify-between gap-1.5">43 startups <ChevronDown class="size-4 text-muted-foreground"/></button>
  </div>
  <div class="grid grid-cols-[auto_1fr] gap-x-2 sm:gap-x-3 text-[11px] text-muted-foreground tabular-nums">
    <div class="relative text-[10px] sm:text-[11px]">            <!-- y labels -->
      <span class="invisible">−$80K</span>
      <span class="absolute right-0 -translate-y-1/2 leading-none" style="top:100%">−$80K</span>
      <span ... style="top:75.76%">$0</span> <span ... style="top:37.88%">$125K</span> <span ... style="top:0%">$250K</span>
    </div>
    <div class="relative h-28 sm:h-36">
      <span class="absolute inset-x-0 border-t border-dashed border-border" style="top:0%"></span> ×4
      <div role="img" class="absolute inset-0">
        <span class="absolute bottom-0 -translate-x-1/2 bg-foreground rounded-t-[3px]"
              style="left:20.83%;width:5%;bottom:24.24%;height:max(22.76%,2px)"></span>
        <span class="absolute -translate-x-1/2 hatched bg-foreground/[0.05] text-foreground/50 rounded-b-[3px]"
              style="left:20.83%;width:5%;bottom:calc(24.24% - max(2.8%,2px) - 2px);height:max(2.8%,2px)"></span>
        … (24 spans: revenue + investment per month; last month bg-foreground/25)
      </div>
      <div class="absolute inset-0 touch-pan-y"><!-- hover band + tooltip injected here --></div>
    </div>
    <div class="relative col-start-2 mt-3 h-3.5">
      <span class="absolute top-0 leading-none" style="left:12.5%;transform:translateX(-12.5%)">Jan</span> …
    </div>
  </div>
  <div class="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[11px] text-muted-foreground">…legend…</div>
</div>
```

---

## 4. Section header ("My startups 43")

Shared by My startups / GitHub / Newsletter / Tweets:
`div.mb-5.flex.flex-wrap.items-center.justify-between.gap-x-6.gap-y-3.border-b.border-border/40.pb-3`
- Height 35.5px: text row + **12px padding-bottom** + **1px border, colour --border @40%** (≈ #e5e5e5 at 40%); **margin-bottom 20px**.
- `h2.text-[15px].font-medium.tracking-tight` → **15px / 22.5px / 500 / -0.375px**, foreground.
- Right side: count `text-sm text-muted-foreground tabular-nums` (14px muted) **or** link `text-sm text-muted-foreground flex items-center gap-1.5` + 14px lucide arrow (`arrow-right` for internal "All issues", `arrow-up-right` for external "marclou"/"All videos"); arrow nudges `translate-x-0.5` (and `-translate-y-0.5` for up-right) on hover; hit area expanded with `after:-inset-x-2 after:-inset-y-2.5`.
- There is no section header above the compact startup grid — it just follows after a 48px gap.

---

## 5. Startup revenue card (featured, 16 cards)

- Grid: `ul.grid.gap-4.sm:grid-cols-2` → **2 columns × 412px, gap 16px** desktop; 1 column (350px) mobile. Rows equal-height (`li > article.h-full`).
- Card: `article.relative.flex.h-full.flex-col.rounded-2xl.bg-card.p-5.shadow-border` → **412×172** desktop (172 or 192 when the tagline wraps to 2 lines, e.g. mobile), radius **18px**, padding **20px**.
- Hover: `has-[a:hover]:shadow-border-hover` (ring darkens from 6% → 8% black), name gets underline (`decoration-foreground/30 underline-offset-4`), and a 16px lucide `arrow-up-right` fades in after the name with a 2px up-right nudge. Whole card is clickable via `a::after { position:absolute; inset:0; border-radius:18px }`. Focus: `ring-3 ring-ring/50`.
- Header row `flex items-center gap-3` (12px):
  - Icon `img.size-7.rounded-md.object-contain` → **28×28, radius 8px**, no border.
  - Name `h3.min-w-0.flex-1.font-semibold.tracking-tight` → **16px / 24px / 600 / -0.4px**, truncates.
  - Revenue pill `span.shrink-0.rounded-full.bg-muted.px-2.py-0.5.text-xs.font-medium.tabular-nums` → **≈86×20, full radius, padding 2px 8px, 12px / 16px / 500**, bg `--muted` (#f5f5f5), text foreground. Content `$34,073/mo`.
- Tagline `p.mt-2.line-clamp-2.text-sm.text-muted-foreground.text-pretty` → **14px / 20px muted, margin-top 8px, max 2 lines**.
- Sparkline wrapper `div.relative.z-10.mt-auto.pt-5 > div.relative.h-14` → pushed to the **bottom** by `mt-auto`, 20px top padding, **56px tall**. The SVG sits **inside the card padding** (20px inset on left, right and bottom — it does NOT bleed to the card edge). Width = card inner width (372px desktop).

**Sparkline SVG (cleaned):**

```html
<svg viewBox="0 0 300 56" preserveAspectRatio="none" aria-hidden="true"
     class="absolute inset-0 size-full overflow-visible">
  <!-- area: line points, then down to the baseline and back -->
  <path class="fill-foreground/[0.05]"
        d="M0,35.6 L27.3,26.3 L54.5,28 L81.8,23.7 L109.1,30.5 L136.4,30 L163.6,28.3 L190.9,14.1
           L218.2,14.8 L245.5,7.3 L272.7,17.9 L300,44.2 L300,56 L0,56 Z"/>
  <!-- solid line: all completed months (points 0..n-2) -->
  <path d="M0,35.6 L27.3,26.3 … L272.7,17.9" fill="none" stroke="currentColor"
        stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
        vector-effect="non-scaling-stroke" class="text-foreground/75"/>
  <!-- dashed last segment: previous month → current partial month -->
  <path d="M272.7,17.9 L300,44.2" fill="none" stroke="currentColor" stroke-width="1.5"
        stroke-dasharray="3 3" stroke-linecap="round"
        vector-effect="non-scaling-stroke" class="text-foreground/40"/>
</svg>
<div aria-hidden="true" class="absolute inset-0 touch-pan-y"><!-- hover layer --></div>
```

- 12 points evenly spaced: x step = 300/11 = 27.27. Straight segments (no curve smoothing). Y scaled per-card to its own max (top ~7, baseline 56).
- Area fill: foreground @ **5%** solid (no gradient). Line: foreground @ **75%**, **1.5px** constant (non-scaling). Last segment dashed **3 3**, foreground @ **40%**. The area fill does include the last segment.
- `preserveAspectRatio="none"` stretches horizontally to any card width.
- Hover: 1px vertical rule `w-px bg-foreground/20` full height at the point; dot `size-2` (**8px**) `rounded-full bg-foreground ring-2 ring-card` at the point; same tooltip component as §3 with one row (`July 2026` / icon + name / value).

---

## 6. Compact startups grid (PoopUp …, 27 items)

- `div.mt-12` (48px after featured grid) → `ul.grid.gap-x-8.sm:grid-cols-2.xl:grid-cols-3` → **3 cols × 259px, column-gap 32px, row-gap 0** at ≥1280; 2 cols at lg/sm (354px at 1100); 1 col mobile.
- Item `article.group.relative.-mx-3.flex.items-start.gap-3.rounded-xl.px-3.py-3.hover:bg-muted/60` → row box 283 wide (bleeds 12px each side via `-mx-3`), **padding 12px, radius 14px, gap 12px**; height 90 (2-line desc) / 70 (1-line). Hover bg `--muted` @60%.
- Icon `img.mt-0.5.size-6.rounded-md` → **24×24, radius 8px**, 2px top offset to align with name.
- Name `h3.flex.items-center.gap-2.font-medium.tracking-tight` → **16px / 24px / 500 / -0.4px** (note 500 here vs 600 on featured cards); link text truncates; stretched link `after:absolute after:inset-0 after:rounded-xl`.
- Desc `p.mt-0.5.line-clamp-2.text-sm.text-muted-foreground.text-pretty` → **14px / 20px muted, margin-top 2px, max 2 lines**.
- Badge (inline after name, gap 8px): `span.shrink-0.rounded-full.bg-muted.px-2.py-0.5.text-[11px].font-medium.text-muted-foreground` → full-radius pill, padding 2px 8px, **11px / 500 muted text on #f5f5f5** ("Sold for $35K", "Shut down" — same style for both).

---

## 7. GitHub section

- `section#github.pt-16` (64px top padding) → section header (§4) with right link "marclou ↗" (GitHub mark 14px + text + 14px arrow-up-right).
- Card `rounded-2xl bg-card p-5 sm:p-6 shadow-border` → **840×229, padding 24px** (20px mobile), radius 18.
- Summary `p.text-sm.text-muted-foreground` "**5,360** contributions in the last year" (number `font-medium text-foreground tabular-nums`).
- Graph `div.mt-4.flex.gap-2.text-[10px].leading-none.text-muted-foreground` (16px below, 8px gap between day-label column and grid):
  - Day labels: `grid shrink-0 grid-rows-[1rem_repeat(7,minmax(0,1fr))]` (21px wide) — first row 16px reserved for month labels, then 7 rows; only Mon/Wed/Fri labelled, 10px.
  - Grid area `flex min-w-0 flex-1` split into two halves: first `basis-0` with `flex-grow:27` and `max-sm:hidden`; second `flex-grow:26` → **mobile shows only the last 26 weeks**.
  - Each half: month labels row `relative h-4` (labels `absolute bottom-1` at `left: calc(X% + 1.5px)`), then `grid auto-cols-fr grid-flow-col grid-rows-[repeat(7,auto)]` of cells.
  - **Cell:** `span.aspect-square.rounded-[3.5px].border-[1.5px].border-transparent.bg-clip-padding` → fluid square (**14.39px** box at desktop, **10.8px** mobile). The transparent 1.5px border + `bg-clip-padding` fakes a **3px gap** → visible square ≈11.4px (desktop), radius 3.5px outer. No grid gap.
  - Levels (5): `bg-foreground/[0.07]`, `/25`, `/45`, `/70`, `bg-foreground` (100%).
- Legend `mt-3 flex items-center justify-end gap-1.5 text-[11px]`: "Less" + five **10×10 radius-2px** swatches + "More".

---

## 8. Newsletter + Tweets (two columns)

- Wrapper `div.grid.grid-cols-1.gap-x-6.lg:grid-cols-2` → **2 × 408px, gap 24px** at lg+; stacked on mobile.
- Each `section.flex.flex-col.pt-16` (64px) → header (§4: "Newsletter" + "All issues →", "Tweets" + "All tweets →") → card `flex-1 rounded-2xl bg-card p-5 sm:p-6 shadow-border` (**408×302, padding 24px**, equal heights via flex-1).
- List `ol.-my-3.flex.flex-col` (negative 12px vertical margin cancels item padding at card edges).
- Item `article.group.relative.-mx-3.grid.grid-cols-[4rem_minmax(0,1fr)].sm:grid-cols-[5rem_minmax(0,1fr)].items-center.gap-x-4.sm:gap-x-5.rounded-xl.px-3.py-3.hover:bg-muted/60` → **93px tall each**, padding 12px, radius 14px, columns 80px | 1fr, gap 20px (mobile: 64px | 1fr, gap 16px). No dividers between items.
  - Thumbnail `span.relative.aspect-[10/7].w-16.sm:w-20.overflow-hidden.rounded-lg.bg-muted.outline.-outline-offset-1.outline-black/10` → **80×56** (64×45 mobile), **radius 10px**, inner 1px outline black@10%.
  - Meta `span.flex.items-center.gap-1.5.text-sm.text-muted-foreground.tabular-nums`: `<time>Sep 8</time> · <eye 1.1em/> 3K` (tweets use a heart icon + likes). 14px muted, gap 6px, icon `size-[1.1em]`. Wrapper column `flex flex-col gap-0.5` (2px).
  - Title `h3.line-clamp-2.min-h-[2.75em].text-[17px].leading-snug.font-semibold.tracking-tight.text-pretty.group-hover:underline.decoration-foreground/30.underline-offset-4` → **17px / 23.375px (1.375) / 600 / -0.425px**, always reserves 2 lines (min-height 2.75em), underline on row hover.
- **Mobile only:** the Newsletter card starts with the subscribe block `div.mb-6.lg:hidden` (copy paragraph + the same 48px form), i.e. the form moves from the aside into this card.

---

## 9. Latest video

- `section#video.pt-16` → `div.grid.gap-6.md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)].md:items-center.md:gap-x-10` → **467px | 333px, column gap 40px**, vertically centred. Stacked (gap 24px) below md.
- Thumbnail `div.group/video.relative.isolate.aspect-video.overflow-hidden.rounded-2xl.bg-muted.shadow-border` → **467×262.5 (16:9), radius 18px**; hover `shadow-border-hover` and image `scale-103` over 700ms ease-out.
  - Overlay `span.absolute.inset-0` with `radial-gradient(closest-side, rgb(0 0 0/.22), transparent), linear-gradient(to top, rgb(0 0 0/.3), transparent 50%)` at opacity .8.
  - Inner edge `span.absolute.inset-0.z-10.rounded-[inherit].shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)]`.
  - Play button: whole thumbnail is the `<button>`; disc `size-14 sm:size-16` → **64px desktop / 56px mobile**, `rounded-full bg-white/80 backdrop-blur-md backdrop-saturate-150`, shadow `0 10px 30px -8px rgb(0 0 0/.5), inset 0 0 0 1px rgb(255 255 255/.6)`, icon lucide `play` **24px** filled, `translate-x-0.5` (optical centring), colour neutral-950. Hover: bg white + `scale-108`; active `scale-96`.
- Text column (333 wide):
  - Kicker `p.flex.items-center.gap-2.text-sm.text-muted-foreground` with 16px YouTube glyph: "My latest video" (14px muted).
  - Title `p.mt-1.5.text-2xl.font-semibold.tracking-tight.text-balance` → **24px / 32px / 600 / -0.6px**, margin-top 6px.
  - Meta `p.mt-2.text-sm.text-muted-foreground`: `Nov 2 · **42,638** views` (number medium + foreground).
  - Link `a.mt-6.text-sm.text-muted-foreground` "All videos ↗" (24px above, 14px arrow).

---

## 10. Book block

- Row wrapper `div.grid.gap-x-10.xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)].xl:items-center` → **Book 467px | Health 333px, gap 40px** at ≥1280; stacked below xl.
- `section#book.pt-16` → `div.grid.items-center.gap-8.sm:grid-cols-[auto_minmax(0,1fr)]` (gap 32px).
- Cover `span.group/book.relative.block.aspect-[5/8].justify-self-center.sm:order-first` with inline `width:160px` → **160×256**, left of text on ≥sm, *below* the text (centred) on mobile.
  - 3D trick: inner `span.absolute.-inset-1/2` (rendered at 2× size) with `transform: scale(0.5) perspective(3600px) rotateY(-13deg) rotateZ(-2.5deg)` and `drop-shadow(8px 16px 12px rgb(29 42 29/.2))`; hover → `rotateY(-8deg) rotateZ(-1deg)` over 450ms.
  - Page edge: `span.absolute.top-[6px].bottom-[4px].left-[calc(100%-2px)].w-[10px].-skew-y-[8deg].rounded-r-[4px]` with `repeating-linear-gradient(90deg,#d6d4cb 0,#efeee7 2px,#f8f7ef 4px,#e7e5dc 6px)` + `inset -2px 0 2px #cecdc3`.
  - Cover face: `rounded-[4px_8px_8px_4px] bg-white shadow-[inset_0_0_0_2px_#ddd]` with a spine-shading `::after` linear-gradient (`rgb(0 0 0/.17) 0, rgb(255 255 255/.2) 2.2%, rgb(0 0 0/.035) 4.8%, transparent 7.5% … 97%, rgb(0 0 0/.04) 100%`).
- Text column (275 wide):
  - "I wrote a book" `p.text-2xl.font-semibold.tracking-tight` → **24px / 32px / 600**.
  - Desc `p.mt-2.text-sm.text-muted-foreground.text-pretty` (14px muted, 8px top).
  - Buttons `div.mt-5.flex.flex-wrap.gap-2` (20px top, 8px gap): **PDF** primary (`bg-primary text-primary-foreground`), **EPUB** secondary (`bg-secondary text-secondary-foreground`); both **36px tall, radius 10px, padding 0 12px 0 10px, 14px/500, gap 6px**, 16px lucide `download` icon leading.
  - `p.mt-3.text-sm.text-muted-foreground`: "Free · **14,451** downloads" (12px top).

---

## 11. Health card + "Now in" globe (layout only)

- **Health** `section#health.pt-16` → card `rounded-2xl bg-card p-5 sm:p-6 shadow-border` **333×251, padding 24px**. Header row `flex justify-between` (date muted 14px | "All health data →"). `div.mt-5.grid.grid-cols-3.gap-4` of figures (84px each desktop, 92px mobile): ring SVG `viewBox 0 0 100 100`, `-rotate-90`, track `circle r=44 stroke-width=6 stroke-muted`, value centred `text-xl sm:text-2xl font-semibold`, caption 14px muted, `gap-3`. Footer sentence `p.mt-6.text-[15px].text-muted-foreground`.
- **Where** `section#where.pt-16` → `grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:items-center md:gap-x-10` (same rhythm as video). Globe card `@container relative overflow-hidden rounded-2xl bg-card shadow-border h-72 sm:h-80 md:h-92 md:order-first` → **467×368** desktop (288 tall mobile, below the text). Text: kicker "Now in" with 16px round flag, title `text-2xl font-semibold` "Paphos, Cyprus", `mt-6` stat line, then `mt-3 flex flex-wrap gap-1.5` of **20px round flag chips** (`size-5 rounded-full shadow-border`).

---

## 12. Floating book/QR popup (desktop only)

`div.fixed.right-6.bottom-6.z-40.w-64.rounded-2xl.bg-popover.p-4.shadow-lg.ring-1.ring-border/70.animate-enter.max-lg:hidden` → **256×210, 24px from right/bottom, radius 18px, padding 16px**, popover shadow (`0 10px 15px -3px /.1, 0 4px 6px -4px /.1` + 1px ring). Content: 80px-wide 3D book + 116px QR side by side (gap 20px), caption "Scan to download my book" / "It's free", close (×) button top-right. Hidden below 1024px. (It did not reappear in a later scrolled capture, so it is likely dismissible / time-gated.)

---

## 13. Top nav

**Not shown on the home page at any width.** A header exists in the DOM but is `[body:has([data-site-home])_&]:hidden`. On sub-pages it is: `header.sticky.top-0.z-30.border-b.border-border/60.bg-background/80.backdrop-blur-md` → inner `mx-auto flex h-14 max-w-5xl items-center justify-between px-5` (56px tall, 1024px max): avatar 32/36px + name (`sm:text-lg font-semibold`), nav links `inline-flex h-8 rounded-full px-3 text-sm text-muted-foreground hover:bg-muted` (Newsletter hidden < sm), small primary "Subscribe" button (h-8, px-3, text-[0.8rem], radius min(8px,12px)).

## 14. Footer

`footer.border-t.border-border/60` with `lg:[body:has([data-site-home])_&]:hidden` → **hidden on the desktop home page, visible on mobile** (and on sub-pages). Mobile: 241px tall; `mx-auto grid max-w-5xl gap-6 px-5 pt-10 pb-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end`: 28px avatar + "Marc Lou" (font-medium), one-line bio (14px muted, max-w-sm); icon row of 36px round ghost buttons (16px icons, gap 2px, hover bg-muted); `© 2026 Marc Lou` 12px muted, pb-10.

---

## 15. Vertical rhythm (desktop 1536, y = page px)

| From → To | Gap | How |
|---|---|---|
| Page top → aside content / chart card | **56px** | aside `py-14`, right col `pt-14` (both start at y=56) |
| Avatar → h1 | 20px | `lg:gap-5` |
| h1 → para 1 → para 2 → newsletter copy | 8 / 16 / 16px | `mt-2`, `mt-4`, `mt-4` |
| Newsletter copy → form | 12px | `mb-3` |
| Form → social row | 16px | `mt-4` |
| Chart card bottom (338) → "My startups" header (387) | **48px** | `mt-12` |
| Section header → content | 20px (+12px pb + 1px border) | `pb-3 border-b mb-5` |
| Featured cards row → row | 16px | `gap-4` |
| Featured grid bottom (1930) → compact grid (1978) | **48px** | `mt-12` (no header) |
| Compact grid → GitHub header | **64px** | `pt-16` on section |
| GitHub → Newsletter/Tweets headers | **64px** | `pt-16` |
| Newsletter/Tweets → Video | **64px** | `pt-16` |
| Video → Book/Health | **64px** | `pt-16` |
| Book/Health → Where | **64px** | `pt-16` |
| Last block → page bottom | **96px** | right col `pb-24` |

Rule of thumb: **every top-level section = `pt-16` (64px) + header; inside the startups section the sub-blocks use `mt-12` (48px).**

## 16. Fonts

- **Geist** (variable 100–900) via `next/font` (self-hosted webfont, class `geist_…__variable`, CSS var `--font-geist-sans`), stack: `Geist, "Geist Fallback", ui-sans-serif, system-ui, sans-serif`. **Geist Mono** is declared but not used on the home page.
- Weights used: 400, 500 (emphasis numbers, h2, compact names, pills, buttons), 600 (h1, card names, titles, headline number).
- `tracking-tight` = **-0.025em** on all headings/names. `tabular-nums` on every number. `text-pretty` on paragraphs, `text-balance` on big titles.
- Type scale in use: 10, 11, 12, 13, 14, 15, 16, 17, 20, 24, 30px.

## 17. Mobile (390) — what changes

Stack order: **bio (aside) → revenue chart → My startups cards → compact list → GitHub → Newsletter (now containing the subscribe form) → Tweets → video → book → health → where → footer.** No floating popup, no header.

- Aside: not sticky, `pt-8`; avatar **56px** left of the text block (row, `gap-4`, centred); h1 **24px**; subscribe block hidden (moved to Newsletter card); dots layer **224px** tall, full-bleed 390.
- Right column `pt-8` (32px after the social row).
- Chart card: padding **16px**; headline number on its own line; plot **112px** tall; y-labels **10px** without `$`; y-gutter gap 8px; only 6 x-labels (alternate months hidden); bars ≈14px wide.
- Featured startup cards: **1 column**, 350 wide, padding still 20px; heights 172/192.
- Compact grid: **1 column**, column gap irrelevant.
- GitHub: only the **last 26 weeks** (first half `max-sm:hidden`), cells 10.8px box; card padding 20px.
- Newsletter/Tweets: stacked; thumbs **64×45**, grid gap 16px; cards padding 20px.
- Video: stacked (`gap-6`), thumbnail full width 350×197, play disc **56px**.
- Book: text first, cover centred below (160×256).
- Health: 3 rings 92px each; Where: text first, globe card 288px tall below.
- Footer visible.

Breakpoints that matter: `sm` 640 (2-col cards, chart sizes, labels), `md` 768 (video/where 2-col), `lg` 1024 (sidebar + sticky, form in aside, popup, footer hidden, news/tweets 2-col), `xl` 1280 (sidebar 21rem / gap 64, compact grid 3-col, book|health 2-col).

---

## Colour roles (map these onto your palette)

| Role | Light value | Dark value | Where |
|---|---|---|---|
| Page background | `#ffffff` | `#0a0a0a` | body |
| Card background | `#ffffff` (= page) | `#171717` | all cards, form wrapper |
| Card edge ("border") | ring `0 0 0 1px rgb(0 0 0/.06)` + `0 1px 2px -1px /.06` + `0 2px 4px /.04` | `0 0 0 1px #ffffff14` | `shadow-border` |
| Card edge hover | same at .08/.08/.06 | `#ffffff21` | `shadow-border-hover` |
| Primary text | `#0a0a0a` | `#fafafa` | headings, numbers, values |
| Muted text | `#737373` | `#a1a1a1` | body copy, labels, meta, axis |
| Muted surface | `#f5f5f5` | `#262626` | pills/badges, video placeholder, hover row (@60%), social hover pill, secondary button |
| Hairline / gridline | `#e5e5e5` | `#ffffff1a` | dashed chart gridlines, select border, tooltip total divider |
| Section-header rule | `--border` @40% | same rule | under h2 |
| Footer/header rule | `--border` @60% | | |
| Primary button | bg `#171717`, text `#fafafa` | bg `#e5e5e5`, text `#171717` | Subscribe, PDF |
| Bar fill (startups) | foreground 100% | | revenue bars, legend swatch |
| Bar fill (current month) | foreground @25% | | last bar |
| Investments hatch | lines foreground @50% over fill @5% (current month: @20% over @2%) | | hatched bars & swatch |
| Hover column band | foreground @5% | | chart hover |
| Sparkline line / area / projection | foreground @75% / @5% / @40% dashed | | startup cards |
| Sparkline hover rule / dot | foreground @20% / foreground with 2px card-colour ring | | |
| Contribution levels | foreground @7%, 25%, 45%, 70%, 100% | | GitHub grid + legend |
| Dot pattern | foreground @14% | | behind avatar |
| Checkbox | border fg@20% (hover 35%), checked fill fg@40%, check white | | "Show investments" |
| Popover / tooltip | bg `#ffffff`, ring `--border` @70%, shadow-lg | bg `#171717` | tooltips, floating popup |
| Focus ring | `#a1a1a1` @50% (3px) | `#737373` | inputs, cards |
| Link underline | foreground @30%, offset 4px | | "my newsletter", titles on hover |
| Avatar edge | outline black @10%, shadow `0 8px 24px -8px rgb(0 0 0/.25)` | outline white @10% | |
| Brand accents (hover only) | YouTube `#ff0000`, LinkedIn `#0a66c2` | | social icon cross-fade |

The whole design is monochrome: every data colour is the foreground colour at a different alpha. To re-skin, change `--foreground`, `--muted-foreground`, `--muted`, `--border`, `--primary` and (optionally) give bars an accent instead of `--foreground`. All alpha-based roles then follow.

---

## Screenshots

Folder: `/private/tmp/claude-501/-Users-kap-Downloads-workspace-academy/7e8aaa8b-1ca0-4451-bfb9-7661c55c5fa5/scratchpad/marc-research/`

- `/private/tmp/claude-501/-Users-kap-Downloads-workspace-academy/7e8aaa8b-1ca0-4451-bfb9-7661c55c5fa5/scratchpad/marc-research/desktop-full.png` — full page 1536
- `/private/tmp/claude-501/-Users-kap-Downloads-workspace-academy/7e8aaa8b-1ca0-4451-bfb9-7661c55c5fa5/scratchpad/marc-research/desktop-above-fold.png` — first viewport 1536×960
- `/private/tmp/claude-501/-Users-kap-Downloads-workspace-academy/7e8aaa8b-1ca0-4451-bfb9-7661c55c5fa5/scratchpad/marc-research/desktop-sticky-aside-scrolled.png` — scrolled to y=2900, shows sticky aside
- `/private/tmp/claude-501/-Users-kap-Downloads-workspace-academy/7e8aaa8b-1ca0-4451-bfb9-7661c55c5fa5/scratchpad/marc-research/desktop-chart-card.png` — revenue chart close-up
- `/private/tmp/claude-501/-Users-kap-Downloads-workspace-academy/7e8aaa8b-1ca0-4451-bfb9-7661c55c5fa5/scratchpad/marc-research/desktop-chart-hover.png` — chart hover band + tooltip
- `/private/tmp/claude-501/-Users-kap-Downloads-workspace-academy/7e8aaa8b-1ca0-4451-bfb9-7661c55c5fa5/scratchpad/marc-research/desktop-startup-cards.png` — 4 startup cards close-up
- `/private/tmp/claude-501/-Users-kap-Downloads-workspace-academy/7e8aaa8b-1ca0-4451-bfb9-7661c55c5fa5/scratchpad/marc-research/desktop-sparkline-hover.png` — sparkline hover (rule + dot + tooltip)
- `/private/tmp/claude-501/-Users-kap-Downloads-workspace-academy/7e8aaa8b-1ca0-4451-bfb9-7661c55c5fa5/scratchpad/marc-research/mobile-full.png` — full page 390
- `/private/tmp/claude-501/-Users-kap-Downloads-workspace-academy/7e8aaa8b-1ca0-4451-bfb9-7661c55c5fa5/scratchpad/marc-research/mobile-chart-card.png` — mobile chart
- `/private/tmp/claude-501/-Users-kap-Downloads-workspace-academy/7e8aaa8b-1ca0-4451-bfb9-7661c55c5fa5/scratchpad/marc-research/mobile-startup-card.png` — mobile startup card
- `/private/tmp/claude-501/-Users-kap-Downloads-workspace-academy/7e8aaa8b-1ca0-4451-bfb9-7661c55c5fa5/scratchpad/marc-research/mobile-scrolled-viewport.png` — mobile viewport mid-page

Raw data in the same folder: `tree-desktop.txt`, `tree-mobile.txt` (DOM tree with boxes + classes), `chart.html` (full chart card markup), `styles-desktop.json`, `css-root.txt` (theme tokens).
