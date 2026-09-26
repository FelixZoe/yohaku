# Lighthouse Baseline — 2026-05-13-ABC

- host: `http://127.0.0.1:3939`
- api: `http://localhost:2333 (local mx-core)`
- preset: lighthouse 13.3.0 — mobile, slow-4g, 4× cpu (default)
- rounds: warm-up discarded + 1 measured

## Scorecard

| Page | Path | Score | LCP | FCP | TBT | CLS | SI | TTFB |
| --- | --- | ---:| ---:| ---:| ---:| ---:| ---:| ---:|
| home | `/en` | 68 | 16.75s | 3.00s | 89ms | 0.022 | 3.97s | 5ms |
| post | `/en/posts/experience/ai-era-efficiency-paradox-productivity-gains-cause-fatigue` | 57 | 13.28s | 3.61s | 346ms | 0.036 | 4.99s | 10ms |
| posts | `/en/posts` | 64 | 10.77s | 3.60s | 161ms | 0.044 | 3.88s | 12ms |
| thinking | `/en/thinking` | 65 | 13.02s | 2.85s | 218ms | 0.000 | 4.16s | 4ms |
| timeline | `/en/timeline` | 70 | 24.51s | 2.55s | 84ms | 0.000 | 3.76s | 4ms |

## Top Opportunities (per page, ≤5)

### home

- Reduce unused JavaScript — est. 1.05s
- Reduce unused CSS — est. 610ms
- Initial server response time was short — est. 5ms

### post

- Reduce unused JavaScript — est. 1.50s
- Reduce unused CSS — est. 930ms
- Initial server response time was short — est. 10ms

### posts

- Reduce unused JavaScript — est. 910ms
- Reduce unused CSS — est. 610ms
- Initial server response time was short — est. 12ms

### thinking

- Reduce unused JavaScript — est. 1.51s
- Reduce unused CSS — est. 740ms
- Initial server response time was short — est. 4ms

### timeline

- Reduce unused JavaScript — est. 1.20s
- Reduce unused CSS — est. 740ms
- Initial server response time was short — est. 4ms


## Detail (transfer, mainthread, LCP element, CLS)

| Page | JS KB | CSS KB | Img KB | Font KB | Total KB | Reqs | Bootup | Main work | LCP el |
| --- | ---:| ---:| ---:| ---:| ---:| ---:| ---:| ---:| --- |
| home | 992 | 229 | 0 | 370 | 2863 | 140 | 740ms | 1.98s | `—` |
| post | 1551 | 287 | 12 | 370 | 2392 | 180 | 1.28s | 2.66s | `—` |
| posts | 990 | 229 | 0 | 29 | 1478 | 123 | 720ms | 1.42s | `—` |
| thinking | 1448 | 243 | 384 | 370 | 2528 | 148 | 835ms | 1.86s | `—` |
| timeline | 989 | 229 | 0 | 29 | 4127 | 150 | 655ms | 2.05s | `—` |

## CLS culprits (where layout shifts originate)

### home (CLS = 0.022)

- score=0.0213 — `<h1 class="text-center text-title-24 font-normal leading-relaxed text-neutral-9 lg:te…" style="opaci…`
- score=0.0007 — `<div class="mb-8 text-center" style="opacity: 1; transform: none;">`

### post (CLS = 0.036)

- score=0.0107 — `<span class="min-w-0 truncate">`
- score=0.0058 — `<div class="group/comment-block relative lg:pr-8" data-comment-gutter-host="">`
- score=0.0045 — `<div class="group/comment-block relative lg:pr-8" data-comment-gutter-host="">`
- score=0.0039 — `<div class="group/comment-block relative lg:pr-8" data-comment-gutter-host="">`
- score=0.0030 — `<div class="group/comment-block relative lg:pr-8" data-comment-gutter-host="">`

### posts (CLS = 0.044)

- score=0.0438 — `<div data-fetch-at="2026-05-13T09:45:40.200Z">`

### timeline (CLS = 0.000)

- score=0.0002 — `<span class="ml-0.5 text-copy-14 text-neutral-10/55">`


## Render-blocking resources

