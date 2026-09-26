# Lighthouse Baseline — 2026-05-13

- host: `http://127.0.0.1:3939`
- api: `http://localhost:2333 (local mx-core)`
- preset: lighthouse 13.3.0 — mobile, slow-4g, 4× cpu (default)
- rounds: warm-up discarded + 1 measured

## Scorecard

| Page | Path | Score | LCP | FCP | TBT | CLS | SI | TTFB |
| --- | --- | ---:| ---:| ---:| ---:| ---:| ---:| ---:|
| home | `/en` | 60 | 29.07s | 4.35s | 95ms | 0.003 | 6.42s | 7ms |
| post | `/en/posts/experience/ai-era-efficiency-paradox-productivity-gains-cause-fatigue` | 51 | 19.54s | 3.75s | 421ms | 0.024 | 7.10s | 11ms |
| posts | `/en/posts` | 60 | 19.23s | 3.60s | 160ms | 0.044 | 6.20s | 12ms |
| thinking | `/en/thinking` | 40 | 24.36s | 2.55s | 127ms | 0.669 | 7.23s | 3ms |
| timeline | `/en/timeline` | 66 | 35.64s | 2.55s | 96ms | 0.000 | 6.01s | 4ms |

## Top Opportunities (per page, ≤5)

### home

- Reduce unused JavaScript — est. 1.05s
- Reduce unused CSS — est. 750ms
- Initial server response time was short — est. 7ms

### post

- Reduce unused JavaScript — est. 1.35s
- Reduce unused CSS — est. 750ms
- Initial server response time was short — est. 11ms

### posts

- Reduce unused JavaScript — est. 920ms
- Reduce unused CSS — est. 600ms
- Initial server response time was short — est. 12ms

### thinking

- Reduce unused JavaScript — est. 1.65s
- Reduce unused CSS — est. 750ms
- Initial server response time was short — est. 3ms

### timeline

- Reduce unused JavaScript — est. 1.08s
- Reduce unused CSS — est. 750ms
- Initial server response time was short — est. 4ms


## Detail (transfer, mainthread, LCP element, CLS)

| Page | JS KB | CSS KB | Img KB | Font KB | Total KB | Reqs | Bootup | Main work | LCP el |
| --- | ---:| ---:| ---:| ---:| ---:| ---:| ---:| ---:| --- |
| home | 992 | 229 | 0 | 2180 | 4675 | 271 | 759ms | 2.12s | `—` |
| post | 1551 | 287 | 12 | 1952 | 3981 | 305 | 1.19s | 2.51s | `—` |
| posts | 990 | 229 | 0 | 1611 | 3068 | 248 | 745ms | 1.55s | `—` |
| thinking | 1448 | 243 | 384 | 1952 | 4109 | 275 | 828ms | 1.90s | `—` |
| timeline | 989 | 229 | 0 | 1611 | 5713 | 275 | 688ms | 2.21s | `—` |

## CLS culprits (where layout shifts originate)

### home (CLS = 0.003)

- score=0.0028 — `<h1 class="text-center text-title-24 font-normal leading-relaxed text-neutral-9 lg:te…" style="opaci…`

### post (CLS = 0.024)

- score=0.0073 — `<div class="group/comment-block relative lg:pr-8" data-comment-gutter-host="">`
- score=0.0043 — `<div class="group/comment-block relative lg:pr-8" data-comment-gutter-host="">`
- score=0.0040 — `<div class="group/comment-block relative lg:pr-8" data-comment-gutter-host="">`
- score=0.0033 — `<div class="group/comment-block relative lg:pr-8" data-comment-gutter-host="">`
- score=0.0029 — `<div class="group/comment-block relative lg:pr-8" data-comment-gutter-host="">`

### posts (CLS = 0.044)

- score=0.0438 — `<div data-fetch-at="2026-05-13T08:43:27.801Z">`

### thinking (CLS = 0.669)

- score=0.6689 — `<main class="mt-9">`


## Render-blocking resources

_None flagged by lighthouse on any page — bundle is async-loaded; LCP issue lies elsewhere._

---

## Headline findings

1. **LCP catastrophic across the board** (19–36s vs. good ≤2.5s / poor >4s). Every page is in the "poor" tier by an order of magnitude under mobile + slow-4G. Score 40–66.
2. **Font payload dominates** — 1.6–2.2 MB of woff2 per page. The Link `rel=preload` header advertises ~50 fonts per response; the browser fans them all out in parallel, saturating the simulated network and starving the LCP candidate. Single biggest lever.
3. **JS transferred 990 KB – 1.55 MB** per page (post detail is fattest at 1.55 MB). "Reduce unused JavaScript" estimates 0.9–1.65s savings per page.
4. **CLS = 0.669 on `/thinking`** — entire `<main class="mt-9">` shifts. This is a poor-tier shift (threshold 0.25). Likely owner status / accent gradient / content swap pushing main down after first paint.
5. **CLS = 0.044 on `/posts`** caused by a single `<div data-fetch-at="…">` re-render — list hydrates after server HTML and reflows.
6. **CLS on `/post` (0.024)** comes from repeated `data-comment-gutter-host` divs — comment gutter mounts after main content.
7. **Bootup time 0.7–1.2s, main-thread work 1.55–2.51s** — not extreme but consistent with the big JS bundle.
8. **`/timeline` totals 5.7 MB transfer** despite no images on first paint — dominated by fonts + JS.

## Notes route: lighthouse cannot audit

`/en/notes/{214,213}` both failed with `Runtime.evaluate timeout` after 90s `max-wait-for-load`. Page itself returns HTTP 200 in ~60ms server-side, so the block is client JS. Hypotheses (verify when triaging):

- Socket.IO retry loop or long-polling fallback when reaching `localhost:2333` from headless Chrome.
- Lexical / haklex editor or renderer doing sync work on mount.
- `data-comment-gutter-host` initialization (also seen as a CLS source on post detail).

Excluded from the scorecard; ticket separately before benchmarking subsequent commits.

## Caveats (read before comparing)

- **Locale**: ran `/en/*`, not `/zh/*`. `next start` + `next-intl` `localePrefix: 'as-needed'` leaks the default-locale rewrite as `307 location: /` locally (Vercel edge consumes this in production, hence `innei.in` serves 200). Translation bundle differs from zh; numbers are commit-to-commit comparable but should not be quoted as "what a zh user sees".
- **Bundler**: built with the default (rspack-wrapped) config. `BENCH_BUNDLER=turbopack` was set only on `next start` to bypass the `next-rspack` webpack-flag guard at server start — it does not affect what was already built.
- **API**: local mx-core dev mode (no `/api/v2` prefix, no CDN cache). TTFB ≤12ms because the API is loopback; real users see longer.
- **Network/CPU emulation**: lighthouse default (slow-4G, 4× CPU). Localhost RTT eliminated separately; do not interpret as fully simulating Cloudflare-fronted prod.
- **Single sample**: 1 measured run per page after a warm-up discard. Numbers can drift ±10% run-to-run on mobile preset. For tighter regression detection, raise to 3 measured runs and median.

## Suggested first cuts (highest ROI)

1. **Trim font preload list.** Auditing `<link rel=preload as=font>` emission — preload only the subset rendered above-the-fold (likely 2–4 woff2), `font-display: swap` everything else. Saves 1.5+ MB per cold load and likely cuts LCP in half.
2. **Reserve space for the comment gutter and the posts list** to drop CLS on /posts and /post below 0.01.
3. **Investigate `/thinking` main shift** (CLS 0.669) — `mt-9` suggests a header-height jump; pin a stable above-the-fold layout.
4. **Diagnose `/en/notes/*` lighthouse hang** — quickest path: open the page in real Chrome with throttling, watch the Performance panel for the offending long task.
5. **Split JS** — 1.55 MB on `/post` is heavy; check haklex/rich-static-renderer footprint and dynamic-import the editor where possible.
