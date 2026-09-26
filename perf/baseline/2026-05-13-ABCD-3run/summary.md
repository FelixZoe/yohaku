# Lighthouse Baseline — 2026-05-13-ABCD-3run

- host: `http://127.0.0.1:3939`
- api: `http://localhost:2333 (local mx-core)`
- preset: lighthouse 13.3.0 — mobile, slow-4g, 4× cpu (default)
- rounds: warm-up discarded + 3 measured runs (median per metric)

## Scorecard (median across runs)

| Page | Path | Runs | Score | LCP | FCP | TBT | CLS | SI | TTFB | TTI | JS | CSS | Font | Total |
| --- | --- | ---:| ---:| ---:| ---:| ---:| ---:| ---:| ---:| ---:| ---:| ---:| ---:| ---:|
| home | `/en` | 3 | 68 | 9.40s | 3.00s | 83ms | 0.029 | 3.55s | 7ms | 10.58s | 992KB | 229KB | 370KB | 2864KB |
| post | `/en/posts/experience/ai-era-efficiency-paradox-productivity-gains-cause-fatigue` | 3 | 54 | 14.59s | 3.61s | 384ms | 0.078 | 5.47s | 13ms | 16.91s | 1551KB | 287KB | 370KB | 2384KB |
| posts | `/en/posts` | 3 | 63 | 10.80s | 3.60s | 207ms | 0.000 | 3.98s | 11ms | 11.08s | 990KB | 229KB | 29KB | 1478KB |
| timeline | `/en/timeline` | 3 | 70 | 24.49s | 2.55s | 98ms | 0.000 | 3.71s | 4ms | 24.49s | 989KB | 229KB | 29KB | 4127KB |

## Top Opportunities (first run, ≤5)

### home

- Reduce unused JavaScript — est. 1.20s
- Reduce unused CSS — est. 750ms
- Initial server response time was short — est. 7ms

### post

- Reduce unused JavaScript — est. 1.38s
- Reduce unused CSS — est. 900ms
- Initial server response time was short — est. 13ms

### posts

- Reduce unused JavaScript — est. 910ms
- Reduce unused CSS — est. 610ms
- Initial server response time was short — est. 11ms

### timeline

- Reduce unused JavaScript — est. 970ms
- Reduce unused CSS — est. 740ms
- Initial server response time was short — est. 4ms


## Detail (transfer, mainthread, LCP element, CLS)

| Page | JS KB | CSS KB | Img KB | Font KB | Total KB | Reqs | Bootup | Main work | LCP el |
| --- | ---:| ---:| ---:| ---:| ---:| ---:| ---:| ---:| --- |
| home | 992 | 229 | 0 | 370 | 2864 | 138 | 738ms | 2.01s | `<h1 class="text-center text-title-24 font-normal leading-rel…` |
| post | 1551 | 287 | 12 | 370 | 2384 | 180 | 1.29s | 2.63s | `<h1 class="mb-3 text-balance text-center text-display-36 fon…` |
| posts | 990 | 229 | 0 | 29 | 1478 | 123 | 708ms | 1.42s | `<span>` |
| timeline | 989 | 229 | 0 | 29 | 4127 | 150 | 725ms | 2.49s | `<span class="text-[4.5rem] leading-none font-extralight trac…` |

## CLS culprits (where layout shifts originate)

### home (CLS = 0.031)

- score=0.0304 — `<h1 class="text-center text-title-24 font-normal leading-relaxed text-neutral-9 lg:te…" style="opaci…`
- score=0.0002 — `<span>`

### post (CLS = 0.036)

- score=0.0107 — `<span class="min-w-0 truncate">`
- score=0.0093 — `<div class="group/comment-block relative lg:pr-8" data-comment-gutter-host="">`
- score=0.0047 — `<div class="group/comment-block relative lg:pr-8" data-comment-gutter-host="">`
- score=0.0026 — `<div class="group/comment-block relative lg:pr-8" data-comment-gutter-host="">`
- score=0.0026 — `<div class="group/comment-block relative lg:pr-8" data-comment-gutter-host="">`

### timeline (CLS = 0.000)

- score=0.0002 — `<span class="ml-0.5 text-copy-14 text-neutral-10/55">`


## Render-blocking resources

_none flagged on any page_

