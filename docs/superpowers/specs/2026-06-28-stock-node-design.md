# Stock Node — Lexical Editor Integration Design

**Date:** 2026-06-28
**Author:** Innei
**Status:** Approved (renderer prototype validated at `/dev/stock-demo`)
**Scope:** Yohaku web (renderer + API) AND `mx-core/apps/admin` (Lexical
node class + authoring dialog + slash/toolbar entries). Lexical type
string is frozen at `'stock'`; the node class is duplicated across both
repos (no new published `@haklex/*` package), matching the `map` and
`afilmory` precedents.

## 1. Context and Goals

Authors writing market commentary, earnings notes, or "here is where I bought"
narratives need a way to embed live or historical stock information into a
Lexical document. The blog already ships custom decorator nodes for
photo galleries (`afilmory`) and maps (`map`); this document adds a third
financial primitive.

Two variants ship together because they answer different editorial needs:

1. **Live snapshot** — a one-line current quote with a 1-day sparkline.
   Inline-feeling, refreshes at request time. Use when the article is about
   "now."
2. **Frozen K-line** — a historical OHLC candle chart over an
   author-specified date range (intraday minutes or daily candles),
   optionally overlaid with EMA indicators. Use when the article is about
   "what happened on that day / week."

A working prototype of the K-line variant is committed at
`apps/web/src/app/[locale]/(dev)/stock-demo/` and visually validated. The
spec promotes that prototype to a first-class Lexical node, adds the
snapshot variant, and wires both into the renderer's module system.

**Non-goals (this iteration):**
- Editor authoring UI (insert dialog, range picker, EMA config). That work
  lives in `../haklex` and gets a separate spec.
- Multiple indicators beyond EMA (no MACD, RSI, Bollinger, etc.).
- A pan/zoomable interactive overlay (deferred to a future "expand to full
  screen" iteration).
- Stock avatars / company logos. The design is deliberately logo-less to
  preserve Yohaku's negative-space aesthetic — typography carries identity
  via mono ticker plus serif italic company name.

## 2. Architecture and Data Flow

```
Author (haklex editor — out of scope here)
  └─ writes a Lexical decorator node into post body:
     { type: 'stock-snapshot', symbol: 'NASDAQ:AAPL' }
     { type: 'stock-kline', symbol: '...', range: {...}, ema?: [...] }

Reader hits Yohaku post
  └─ LexicalContent walks node tree
     └─ stock-snapshot → StockSnapshotRenderer (RSC, async)
        └─ fetch('/api/stock/quote?symbol=...')   ← Next.js cache (revalidate 600/3600)
           └─ StockProvider.getQuote(symbol)
              └─ Yahoo Finance unofficial chart endpoint
        └─ render paper card + hand-SVG sparkline
     └─ stock-kline → StockKLineRenderer (client, lazy)
        └─ Next.js fetch('/api/stock/bars?symbol=...&from=...&to=...')
           └─ Next.js cache (force-cache, historical immutable)
              └─ StockProvider.getBars(...)
                 └─ Yahoo Finance unofficial chart endpoint
        └─ pass bars to <YohakuKLineCard> client component
           └─ dynamic import('klinecharts') in useEffect
              └─ render candle_up_stroke + EMA + crosshair tooltip
```

The snapshot path is **fully server-rendered**: the RSC fetches the quote,
renders the paper card with an inline SVG sparkline, and ships zero stock-
related JS to the client (except for whatever hydration the surrounding
Lexical content needs).

The K-line path **must be client-side** because `klinecharts` references
`window` at module scope; it cannot evaluate during SSR. The renderer is a
thin client wrapper that takes server-fetched `bars` as a prop and
dynamically imports `klinecharts` inside `useEffect`. The chart library is
therefore code-split into a separate chunk (~80 KB gzip) loaded only when a
post actually contains a K-line node.

## 3. One Node, Two Variants

A single Lexical node class `StockNode` (type string frozen at `'stock'`),
duplicated between `mx-core/apps/admin` (authoring) and `apps/web`
(rendering) per the established afilmory / map pattern. The variant
distinction lives in the payload — same overall structure as the `map`
node, which carries both location pins and GPX tracks under one type.

### 3.1 Variants

| Variant | Purpose | Renderer | Data freshness | Bundle impact |
|---|---|---|---|---|
| `snapshot` | "Right now this stock is at X" — ticker, current price, delta, 1-day sparkline | Client component fetching `/api/stock/quote?symbol=…`, hand-SVG sparkline | 10 min market hours / 1 hr off-hours (driven by API route cache) | Lightweight — only the chrome + svg path math |
| `kline` | "What the chart looked like over <date range>" — candlestick + EMA + crosshair | Client component fetching `/api/stock/bars?symbol=…`, dynamic `klinecharts` | Immutable historical range — `force-cache` on the API route | `klinecharts` (~80 KB gzip), code-split. Prototype on `10.0.0-beta3`; v9 stable is the fallback if v10 stays in beta |

**Renderer placement note:** Both renderers are client components because `LexicalContent.tsx` (the host) carries `'use client'`. Importing `yahoo.server.ts` (with `'server-only'`) anywhere reachable from that module breaks the Next.js client bundle. The data layer therefore reaches the renderers via the public HTTP API routes (`/api/stock/quote`, `/api/stock/bars`) rather than a direct module import — the cache benefits of §6.3 still apply at the route level.

### 3.2 Serialized form

```ts
type StockKLineInterval = '5m' | '15m' | '1h' | '1d'

type StockNodePayload =
  | {
      variant: 'snapshot'
      symbol: string   // '<EXCHANGE>:<TICKER>' | bare '<TICKER>' | '<TICKER>.<SUFFIX>'
    }
  | {
      variant: 'kline'
      symbol: string
      range: {
        from: string   // ISO 8601, e.g. '2024-12-02' or '2024-12-14T09:30:00-05:00'
        to: string     // ISO 8601, exclusive end
        interval: StockKLineInterval
      }
      ema?: [number, number] | false   // default [5, 20]; false hides indicator
    }

type SerializedStockNode = {
  type: 'stock'
  version: 1
} & StockNodePayload
```

Validation rules enforced by the renderer (graceful fallback rather than
hard error — see §8):

- `from < to`, both in the past.
- Intraday intervals (`5m`, `15m`, `1h`) are bounded by Yahoo's
  per-interval window limits (currently ~60 d for 5m / 15m, ~730 d for
  1h — exact values are read off `meta.validRanges` at fetch time, not
  hard-coded). If a node's range exceeds the limit, the provider clamps
  `from` to the maximum window and the dev console logs a one-line
  warning.
- `ema` periods, if provided, must each be in `[2, 200]`; longer than
  available bars → that EMA line silently returns `n/a` (klinecharts
  default behavior, already verified in prototype).

### 3.3 Symbol Format

Three accepted shapes, normalized internally to Yahoo Finance form:

| Input | Yahoo form | Notes |
|---|---|---|
| `AAPL` | `AAPL` | US default |
| `NASDAQ:AAPL` | `AAPL` | exchange stripped (Yahoo infers) |
| `9988.HK` | `9988.HK` | passthrough |
| `600519.SS` | `600519.SS` | Shanghai passthrough |
| `7203.T` | `7203.T` | Tokyo passthrough |

Stored as authored. The provider layer normalizes at the network boundary
so the node serializes cleanly. Header display uses the canonical form:
`<exchange> · <ticker>` when an exchange is known, otherwise just the
ticker.

## 4. Visual Design

Both variants share the same **paper card chrome** so they read as a
single visual family:

```
─────────────────────────────────────────────────    ← top hairline
   NASDAQ · AAPL                       232.86
   Apple Inc.  (serif italic)          +9.46 · +4.23%
                                       (muted green/red)

   [variant-specific body — sparkline OR klinecharts canvas]

   1d candles · 15 sessions    Dec 02 – Dec 20, 2024
─────────────────────────────────────────────────    ← bottom hairline
```

Shared style tokens (declared once in `_shared.tsx`):

| Role | Value |
|---|---|
| Paper background | `oklch(0.99 0.005 90)` (warm light) |
| Top/bottom hairline | `rgba(0,0,0,0.07)` |
| Body text (price) | `rgba(0,0,0,0.92)`, weight 450, letter-spacing -0.015em |
| Mono ticker | `rgba(0,0,0,0.42)`, 11px, tracking 0.1em uppercase, `ui-monospace` family |
| Serif italic name | `rgba(0,0,0,0.92)`, 15px, `"Times New Roman", "Songti SC", serif` |
| Footer meta | `rgba(0,0,0,0.42)`, 11px tracking 0.03em |
| Up green | `#7AB892` stroke (hollow body fills) / `#5A9C73` text |
| Down red | `#C4715B` filled / `#B85E45` text |
| EMA fast (5) | `#7A95C4` (muted azure), 1.4px |
| EMA slow (20) | `#8B7355` (warm ink), 1.6px |

Card width caps at 520 px and centers in its column. On mobile (full
column width), padding stays at 28 px horizontal so the card never looks
crowded.

### 4.1 K-line Specific

- `candle.type: 'candle_up_stroke'` — up candles render as hollow strokes,
  down as filled. The EMA line is rendered in a layer **behind** the
  candles, so it is visually visible through the hollow up bodies and
  occluded by filled down bodies. This "穿透 / penetrating" treatment is
  the visual hallmark of the design and is achieved natively by
  klinecharts' default render order plus our color choices.
- `grid.show: false`, both axes' `axisLine.show` and `tickLine.show` false
  — only tick text labels remain. Negative space dominates.
- Y-axis labels (right side, mono 10 px) and X-axis date ticks (mono 10 px)
  use the same muted neutrals as the card chrome.
- High/low price marks (klinecharts built-in `priceMark.high/low`) show as
  tiny mono annotations beside the candle that hit the period high/low.
  `priceMark.last` is hidden — the card header already shows the current
  price.

## 5. UX — Read-Only Interactions

The K-line is a **frozen historical snapshot in the middle of an
article**, not a trading workstation. The interaction model is scoped to
match:

| | Enabled |
|---|---|
| Crosshair (vertical + horizontal dashed) on hover/touch | ✅ |
| OHLC + EMA tooltip pinned top-left during crosshair | ✅ |
| Y-axis crosshair value label (price at cursor) | ✅ |
| X-axis crosshair value label (date at cursor) | ✅ |
| Mouse-wheel zoom | ❌ |
| Drag pan | ❌ |
| Indicator add / remove / reconfigure | ❌ |

Disabled via `chart.setScrollEnabled(false)` and
`chart.setZoomEnabled(false)`. The author chose the range; the reader
inspects, doesn't navigate.

Snapshot card has **no on-card interactions** — the sparkline is a glanceable
SVG with no hover state. (Future iteration may add a thin "current →
delta" tooltip; deferred.)

A future "expand to full screen" overlay (pan/zoom enabled, indicator
editor visible) is a possible follow-up but explicitly out of scope here.

## 6. Data Provider Layer

A single interface, two implementations behind a feature flag, lets us
swap providers without touching the renderer:

```ts
interface StockProvider {
  getQuote(symbol: string): Promise<Quote>
  getBars(args: {
    symbol: string
    from: Date
    to: Date
    interval: StockKLineInterval
  }): Promise<Bar[]>
}

type Quote = {
  symbol: string                   // canonical
  exchange?: string                // e.g., 'NASDAQ'
  longName?: string
  shortName?: string
  currency: string                 // 'USD', 'HKD', 'JPY'
  price: number                    // regularMarketPrice
  previousClose: number            // chartPreviousClose
  dayHigh: number
  dayLow: number
  fiftyTwoWeekHigh: number
  fiftyTwoWeekLow: number
  volume: number
  sparkline: { timestamp: number; close: number }[]   // 1d intraday closes
  asOf: number                     // unix seconds — most recent bar time
  marketState: 'pre' | 'regular' | 'post' | 'closed'  // derived from currentTradingPeriod
}

type Bar = {
  timestamp: number
  open: number; high: number; low: number; close: number
  volume?: number
}
```

### 6.1 Initial implementation — Yahoo Finance

Endpoint: `https://query1.finance.yahoo.com/v8/finance/chart/<symbol>`

Confirmed shape (validated 2026-06-28 against AAPL):

```jsonc
{
  chart: {
    result: [{
      meta: {
        symbol, currency, exchangeName, fullExchangeName, instrumentType,
        longName, shortName,
        regularMarketPrice, chartPreviousClose,
        regularMarketDayHigh, regularMarketDayLow, regularMarketVolume,
        fiftyTwoWeekHigh, fiftyTwoWeekLow,
        timezone, gmtoffset,
        dataGranularity, range, validRanges,
        currentTradingPeriod: { pre, regular, post },
      },
      timestamp: number[],
      indicators: { quote: [{ open, high, low, close, volume }] },
    }],
    error: null,
  },
}
```

Maps 1:1 onto `Quote` and `Bar`. **No logo / avatar is returned** — the
design choice to omit logos sidesteps the need for a second provider.

### 6.2 Provider abstraction rationale

Yahoo's unofficial endpoint occasionally changes shape or rate-limits
without warning. The `StockProvider` interface lets us drop in Finnhub /
Polygon / Alpha Vantage as a paid fallback by adding one file under
`apps/web/src/app/api/stock/_providers/` and switching one env var. Not
built up-front — only the Yahoo provider ships in v1.

### 6.3 Caching policy

Implemented at the Next.js `fetch()` call site, before the provider call,
to keep cache keys uniform:

| Route | Cache directive | TTL |
|---|---|---|
| `/api/stock/quote` | `next: { revalidate, tags: ['stock:quote'] }` | 600 s during regular session (`marketState === 'regular'`); 3600 s otherwise |
| `/api/stock/bars` | `cache: 'force-cache'` | indefinite — historical bars never change |

`marketState` is derived from `meta.currentTradingPeriod` on the first
fetch. To avoid a chicken-and-egg ("we need to fetch to know whether to
cache long"), the snapshot route uses a fixed 10-minute revalidate; cards
embedded in posts have a far longer effective TTL via the post body
cache anyway, so the precise off-hours value is not load-bearing.

A small in-memory dedupe wraps the provider so two cards on the same page
referring to the same symbol issue one network request per request cycle.

## 7. Renderer Integration (Yohaku web)

File layout follows the established `afilmory` / `map` pattern:

```
apps/web/src/components/ui/rich-content/stock/
├── stock-augment.ts              # declaration-merge: STOCK_NODE_KEY + RendererConfig.Stock
├── stock-node.ts                 # single Lexical DecoratorNode (type 'stock', payload.variant)
├── _shared.tsx                   # PaperCardChrome (header + footer + hairlines)
├── StockSnapshotRenderer.tsx     # async RSC — fetches quote + renders SVG sparkline
├── YohakuKLineCard.tsx           # client component — dynamic import('klinecharts')
├── StockKLineRenderer.tsx        # RSC shim — fetches bars, hands to YohakuKLineCard
├── StockBlock.tsx                # dispatches by payload.variant
└── yohaku-stock-module.ts        # exports RichRendererModule registering the renderer

apps/web/src/app/api/stock/
├── quote/route.ts                # GET → quote
├── bars/route.ts                 # GET → bars
└── _providers/
    └── yahoo.ts                  # StockProvider impl

apps/web/src/lib/stock/
├── symbol.ts                     # canonicalize / parse / display helpers
└── types.ts                      # shared StockProvider + Quote + Bar types
```

`yohaku-stock-module.ts` plugs into the existing renderer module slot in
`MainLexicalContent.tsx` next to `yohakuAfilmoryModule` and
`yohakuMapModule`. Nothing in `@haklex/*` packages changes.

### 7.1 Inline-vs-block layout

The card renders as a **block-level decorator node** that takes its own
line in the document flow. Pure inline (mid-paragraph price mentions) is
not supported in this iteration — that would be a separate
`<StockInlineMention>` primitive and is deferred.

## 7-bis. Authoring Integration (mx-core/apps/admin)

File layout follows the canonical pattern observed in the `map`
extension at `mx-core/apps/admin/src/vendor/rich-editor/extensions/map/`:

```
mx-core/apps/admin/src/vendor/rich-editor/extensions/stock/
├── StockNode.ts                  # DecoratorNode<ReactElement>; getType()='stock';
│                                  # import/exportJSON over { variant, ... } payload;
│                                  # decorate() → createRendererDecoration(STOCK_NODE_KEY,
│                                  # StockBlockConnected, slotProps);
│                                  # static commandItems: two entries (Snapshot, K-line) sharing
│                                  # one openStockDialog() bridge with prefilled variant;
│                                  # $createStockNode / $isStockNode helpers
├── stock-augment.ts              # STOCK_NODE_KEY = 'Stock' + RendererConfig.Stock?
├── StockBlock.tsx                # visual block — mirrors Yohaku StockBlock.tsx (D-duplicate)
├── StockBlockConnected.tsx       # passes slot props
├── StockBlockReadonly.tsx        # read-only variant
├── InsertStockDialog.tsx         # presentInsertStockDialog({ initial, variant, onSubmit })
├── stock-plugin-bridge.ts        # register/openStockDialog opener hub
├── StockPlugin.tsx               # registers INSERT_STOCK_COMMAND + dialog opener
└── index.ts                      # re-exports
```

Then wire in `vendor/rich-editor/core/RichEditor.tsx`:
1. add `StockNode` to `defaultExtraNodes`
2. mount `<StockPlugin />` next to `<MapPlugin />` and `<AfilmoryPlugin />`
3. extend `renderer-augment.ts` (or `stock-augment.ts` if locally) so the
   read-only renderer picks up the `Stock` key

### 7-bis.1 Insert dialog UX

`InsertStockDialog.tsx` is a single dialog with a `variant` segmented
control at the top — the slash menu's two `commandItems` simply prefill
this control. Fields per variant:

```
[Snapshot]                            [K-line]
[ Symbol input ]                      [ Symbol input ]
                                      [ Interval ]  5m / 15m / 1h / 1d
                                      [ Range ]    from + to (date+time)
                                      [ EMA ]      off / 5,10 / 5,20 (default) / 12,26 / custom
[ Preview ]   live debounced fetch    [ Preview ]   live debounced fetch
[ Cancel | Insert ]                   [ Cancel | Insert ]
```

The Preview hits the Yohaku API (`/api/stock/quote` or `/api/stock/bars`
on the configured site host) so the author sees the exact card that will
render in the post. A debounce (~400 ms) keeps it from hammering Yahoo
during typing. The dialog reuses the same `StockBlock` component as the
editor's inline decoration — what you see is what you'll get.

### 7-bis.2 Slash menu entries

```ts
static commandItems: CommandItemConfig[] = [
  {
    title: 'Stock — snapshot',
    icon: createElement(LineChart, { size: 20 }),
    description: 'Live quote with 1-day sparkline',
    keywords: ['stock', 'ticker', 'snapshot', 'quote', 'price'],
    section: 'MEDIA',
    placement: ['slash', 'toolbar'],
    group: 'insert',
    onSelect: editor => openStockDialog(editor, { variant: 'snapshot', ... }),
  },
  {
    title: 'Stock — K-line',
    icon: createElement(CandlestickChart, { size: 20 }),
    description: 'Historical candlestick over a fixed date range',
    keywords: ['stock', 'kline', 'candle', 'history', 'chart'],
    section: 'MEDIA',
    placement: ['slash', 'toolbar'],
    group: 'insert',
    onSelect: editor => openStockDialog(editor, { variant: 'kline', ... }),
  },
]
```

Both items resolve to the same `openStockDialog()` bridge with the
variant pre-selected — the dialog still allows switching variants after
opening.

### 7-bis.3 Edit existing node

Tapping the rendered block in edit mode opens the same dialog
pre-populated from the node's current payload (analogous to map / afilmory
blocks). On submit, `node.setPayload(next)` mutates the existing node
rather than creating a new one — preserves block position and key.

## 8. Failure Modes

The renderer never throws. Failure modes degrade to muted in-card text so
a flaky Yahoo endpoint or an invalid ticker can't break post rendering:

| Condition | Behavior |
|---|---|
| Symbol returns 404 / not found | Card shows ticker + "—" placeholder + meta text "Symbol not found" |
| Yahoo network failure / 5xx | Card renders header + footer with "Quote unavailable" body |
| Intraday window too wide for interval | Server caps `to - from` to the maximum allowed by `interval` and surfaces a one-line warning in dev only |
| EMA period exceeds bar count | klinecharts displays `n/a` for that line in the tooltip (validated in prototype) |
| Market closed and snapshot stale | `asOf` is rendered in the footer; UI does not artificially mark "stale" — readers see the timestamp and judge |
| `klinecharts` import fails | Renderer shows a static text card with ticker + range label, no chart |

Errors are logged via the existing site logger (`~/lib/log`) at `warn`
level; they do not surface in the UI.

## 9. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Yahoo unofficial endpoint changes shape | `StockProvider` abstraction — swap in Finnhub / Polygon by adding one file |
| Yahoo rate-limits at scale | Snapshot route is heavily cached (10-min revalidate); per-request dedupe; if it becomes an issue, move to a keyed provider |
| `klinecharts` bundle size adds to posts that don't need it | Dynamic import inside `useEffect` — the chart library only loads when a K-line card is on screen |
| Author types an invalid symbol | Falls into the "Symbol not found" graceful path; editor (haklex) will gain a ticker autocomplete later |
| Server-rendered intraday cache poisons historical bars | Different routes (`/quote` vs `/bars`); historical bars use `force-cache` and key on full `(symbol, from, to, interval)` tuple |
| EMA colors clash with dynamic accent | EMA uses fixed muted azure + warm ink — neither pulls from `--a`. Read fine on any post's accent |
| Future i18n of price formatting | `Intl.NumberFormat` keyed off Yohaku locale; Quote carries `currency` from Yahoo, so cards in HKD / JPY format naturally |

## 10. Implementation Phases

Numbered to feed directly into the implementation plan that follows.
Phases A.* land in **Yohaku web** (`apps/web`); phases B.* land in
**mx-core/apps/admin**.

### A. Yohaku — renderer + data layer

A1. **Provider + types layer** — `lib/stock/{types,symbol}.ts` and
   `lib/stock/yahoo.server.ts` (already drafted in the prototype; needs
   the **crumb auth** path productionized — see §10.1). Unit tests for
   symbol normalization, Yahoo response mapping, and crumb-session
   lifecycle (mock fetch).

A2. **API routes** — `api/stock/quote/route.ts` and
   `api/stock/bars/route.ts`, with the caching directives from §6.3.
   Vitest covers happy path + 404 + network failure + 429.

A3. **Shared chrome** — `_shared.tsx` exporting `PaperCardChrome` plus
   the shared style tokens. Theme tokens flow through CSS variables
   already (`--surface-paper`, neutral scale); klinecharts canvas re-
   themes via `chart.setStyles()` on `useIsDark()` flip.

A4. **Snapshot renderer** — `StockSnapshotRenderer.tsx` (RSC) + hand-SVG
   sparkline component. Server-fetches the quote, renders inline.

A5. **K-line renderer** — promote `YohakuKLineCard.tsx` from
   `/dev/stock-demo` into the rich-content tree (file move + import
   path fixes). Add the RSC shim `StockKLineRenderer.tsx` that
   server-fetches bars. Carry over the **v10 crosshair workaround**
   (compute `dataIndex` from `chart.getBarSpace() + getVisibleRange()`
   inside the `onCrosshairChange` handler — see §10.2) plus the
   SlotText hover-price animation.

A6. **Node + module wiring** — `stock-node.ts` (single class),
   `stock-augment.ts`, `StockBlock.tsx`, `yohaku-stock-module.ts`.
   Register module in `MainLexicalContent`.

A7. **Dev page** — extend `/dev/stock-demo` to include both variants
   pulling live data through the new API, plus an "invalid symbol" case
   to visually validate the failure path. Remove the hand-rolled
   fixture fallback once Yahoo is reliable through crumb auth.

A8. **i18n** — add message keys for "Symbol not found", "Quote
   unavailable", "1d candles", "sessions" etc. across all five locale
   files (i18n test enforces parity).

A9. **Cleanup** — delete `_fallback.ts`, lint touched files, run
   targeted vitest.

### B. mx-core/apps/admin — Lexical node + authoring UI

B1. **StockNode class** — `extensions/stock/StockNode.ts` mirroring
   `MapNode.ts` shape (DecoratorNode, getType()='stock', payload-driven
   variant discrimination, importJSON/exportJSON, decorate() →
   `createRendererDecoration(STOCK_NODE_KEY, StockBlockConnected,
   slotProps)`, static `commandItems[]` with two slash/toolbar entries
   pre-filling the variant).

B2. **stock-augment.ts** — `STOCK_NODE_KEY = 'Stock'` constant +
   `declare module '@haklex/rich-editor' { interface RendererConfig {
   Stock?: ComponentType<StockSlotProps> } }`.

B3. **StockBlock + Connected + Readonly** — port the visual block from
   `YohakuKLineCard.tsx`. Same component file, no published package —
   the admin and Yohaku each maintain a copy, both ride the frozen
   `'stock'` Lexical type.

B4. **InsertStockDialog** — `presentInsertStockDialog({ initial,
   variant, onSubmit })`. Variant segmented control, ticker input,
   range picker (kline only), interval picker (kline only), EMA picker
   (kline only), live debounced preview via the admin's configured
   site host.

B5. **stock-plugin-bridge.ts** — `register/openStockDialog` hub
   matching the `map-plugin-bridge` shape.

B6. **StockPlugin.tsx** — registers `INSERT_STOCK_COMMAND` +
   `register/openStockDialog` opener wiring + (optional) clipboard
   paste of a recognized ticker pattern (`$AAPL`, `NASDAQ:AAPL`, etc.).

B7. **Core wiring** — extend
   `vendor/rich-editor/core/RichEditor.tsx`:
   - add `StockNode` to `defaultExtraNodes`
   - mount `<StockPlugin />` alongside `<MapPlugin />`
   - extend `renderer-augment.ts` to surface `Stock` in `RendererConfig`

B8. **Edit-in-place** — `StockBlock` clicks open the same dialog
   pre-populated; submit calls `node.setPayload()` (analogous to map).

B9. **Cleanup** — vitest covers `StockNode.import/exportJSON` round-
   trip and `commandItems` shape; mx-core's existing lint script.

### 10.1 Crumb auth implementation note

Yahoo's `/v8/finance/chart` endpoint rate-limits aggressively without
session cookies + a `crumb` query parameter. Production implementation
(already drafted in the prototype `yahoo.server.ts`):

1. `GET https://fc.yahoo.com/` → harvest `A1/A3/B` cookies.
2. `GET https://query1.finance.yahoo.com/v1/test/getcrumb` with those
   cookies → returns crumb token (plaintext).
3. Append `&crumb=<token>` and `Cookie: …` to every chart request.

Session lives on a process-level singleton with 12-hour TTL. On 401 /
403 / 429 the session is invalidated and re-fetched. Multi-host
rotation between `query1` and `query2` plus exponential backoff (1.5 s,
3 s, 4.5 s) handles transient 429s. When all three attempts fail the
provider throws and the renderer falls into §8's "Quote unavailable"
state.

### 10.2 klinecharts v10 crosshair workaround

`klinecharts@10.0.0-beta3`'s `onCrosshairChange` event dispatches only
`{ x, y, paneId }` — the `kLineData` field documented for v9 was
dropped (confirmed by reading the v10 source at line 6168 of
`dist/index.esm.js` against the type declaration in `index.d.ts:439`).

The handler reconstructs the bar index from public APIs:

```ts
const visibleRange = chart.getVisibleRange()
const barSpace = chart.getBarSpace()
const k = Math.round((x - barSpace.halfBar) / barSpace.bar)
const dataIndex = visibleRange.realFrom + k
const bar = chart.getDataList()[dataIndex]
```

Also add an explicit `mouseleave` listener on the chart container, since
the crosshair action does not fire when the cursor exits the canvas
(stale `kLineData` would otherwise persist).

## 11. Out of Scope (Tracked Follow-ups)

These are explicitly deferred so the v1 scope stays tight; each becomes
its own spec if pursued:

- **Ticker autocomplete in the insert dialog** — Yahoo's
  `/v1/finance/search` endpoint resolves "appl" → `AAPL`. Defer until
  authors hit friction with hand-typed tickers.
- **Expand-to-fullscreen overlay** — interactive pan/zoom, indicator
  picker. Click on chart card opens overlay.
- **Additional indicators** — MACD, RSI, Bollinger, volume bars beneath
  candles. Hold until the EMA-only design has lived in real posts.
- **Stock inline mention** — `<StockInline symbol="AAPL"/>` for
  paragraph-embedded tickers (current quote in one line). Different
  visual primitive entirely.
- **Watchlist / portfolio surface** — multiple symbols in one card. Out
  of scope; this design is single-symbol.
- **Polygon / Finnhub provider** — paid fallback. Not built until Yahoo
  reliability becomes a real problem.
