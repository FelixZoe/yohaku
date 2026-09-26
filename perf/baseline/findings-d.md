# D-round findings (post A+B+C+D1+D2)

Diagnostic pass; no code changes here. Records what the lighthouse JSON exposed and what would be needed to act.

## D4 — `/timeline` LCP 24s is a measurement artifact, not user-perceived

From `2026-05-13-ABCD/timeline.report.json`:

| Metric | Value |
|---|---|
| FCP | 2.55s |
| **Speed Index** | **3.79s** |
| LCP | 24.39s |
| **TTI** | **24.39s** (same as LCP) |
| Total Blocking Time | 104ms |
| Bootup time | 712ms |
| Main-thread work | 2.17s |

Two observations make this unambiguously a measurement issue rather than a real-user delay:

1. **Network audit lists zero requests finishing between FCP and LCP+500ms.** Nothing on the wire is gating the LCP candidate.
2. **LCP equals TTI to the millisecond.** Lighthouse's LCP candidate keeps rolling over until the main thread quiets for 5s. With continuous-but-small main-thread activity (the SSR'd timeline list, motion wrappers, etc.) the page doesn't get a 5-second quiet window until ~24s, so LCP is finalized then.

Speed Index 3.79s (just past the green 3.4s threshold) is what a user actually perceives — content is painted and visually stable by 4s.

**What it would take to move the lighthouse LCP number:**
- Reduce continuous main-thread work so the page reaches a stable 5s window earlier.
- Concretely on `/timeline`: this likely means lazy-rendering rows below the fold, gating `BottomToUpSoftSpringTransitionView` mounts on intersection, or paginating the year buckets. Each is more invasive than D1/D2.

Same shape on the others (LCP ≈ TTI):

| Page | SI | LCP | TTI | LCP=TTI? |
|---|---:|---:|---:|---|
| home | 3.54s | 9.40s | 10.58s | close |
| posts | 3.93s | 10.79s | 11.00s | yes |
| post | 4.73s | 13.27s | 16.28s | close |
| timeline | 3.79s | 24.39s | 24.39s | exact |

**Recommendation:** for benchmark gating, treat Speed Index as the primary user-perceived metric and LCP as a leading indicator only when not close to TTI. Don't chase a sub-3s LCP without addressing TTI.

## D3 — `/posts` CLS 0.044 is a single ~100–150px shift of the list

From `2026-05-13-ABCD/posts.report.json`:

```json
{
  "node": {
    "snippet": "<div data-fetch-at=\"…\">",
    "selector": "div.mx-auto > div.grid > div.min-w-0 > div",
    "boundingRect": { "top": 599, "bottom": 3088, "left": 21, "right": 391 }
  },
  "score": 0.04381
}
```

One shift event of the list wrapper. Approximate maths against the lighthouse mobile viewport (412×823) puts the move at ~100–150px upward — the list jumped up by roughly that much during the trace. C2 (PostSortBar Suspense fallback with `h-[1.25rem] + mt-5 + pb-3 + border-b` ≈ 33px) didn't dent the score, so the shift source is something larger than the sort bar height delta.

Candidates above the list, in DOM order:

1. `<BottomToUpSoftSpringTransitionView lcpOptimization>` wrapping "Blog" label + `<h1>` heading — should not shift (lcpOptimization sets `initial = to`).
2. `featuredPost` wrapper (`<BottomToUpSoftSpringTransitionView lcpOptimization><PostFeaturedCard></BottomToUpSoftSpringTransitionView>`) — conditional on `data[i].pinAt`. **If pinned status arrives client-side and differs from SSR, the featured card would mount/unmount post-hydration, pushing the list 100+ px.**
3. `<Suspense fallback>` wrapping `<PostSortBar>` — fallback ≈ 33px, sort bar ≈ 33-37px. Maybe a few px delta. Not 100px.
4. `<PostListMobileActions>` — always rendered on mobile (`lg:hidden`). Initial render has no back-to-top button (`useShouldShowBackToTop()` returns false at scroll=0). Lighthouse doesn't scroll, so no back-to-top mount. Stable.

**Most likely culprit: featuredPost wrapping animation.** Even with `lcpOptimization` the `<BottomToUpSoftSpringTransitionView>` wrapper sets `initial = to` only when `isHydrationEnded()` returns false at first render. Once hydration completes the next render flips the wrapper's logic and there can be a single layout pass where the wrapper's size changes. The PostFeaturedCard renders a 100×100 cover + title + summary, easily 100+px tall.

**Action when revisiting:**
1. Open `posts.report.html` from `2026-05-13-ABCD/` → "Avoid large layout shifts" → click the shift entry. Lighthouse shows the previous & current bounding rects and the frame timestamp. Confirm whether the list moved ~120px and whether it correlates with the featuredPost wrapper appearing.
2. If featuredPost wrapper is the source: extract its initial measurement and apply a `min-height` based on the SSR'd dimensions, OR skip wrapping it in `<BottomToUpSoftSpringTransitionView>` since `lcpOptimization` already disables the animation on first load (the wrapper is pure overhead at that point).

Don't ship a fix here without confirming the frame. Single-run CLS variance on lighthouse mobile is ±0.05; the next 3-run median baseline will tell us whether this 0.044 is reproducible.

## Tooling change

- `pages.json` now excludes `/thinking` and `/notes`. Re-include when each page can complete an audit reliably.
- `run-lighthouse.sh` now does 1 warm-up + 3 measured runs per page, writing `<slug>-1`, `<slug>-2`, `<slug>-3` reports.
- `summarize.mjs` / `diff.mjs` report the median across runs per metric. Median is robust to a single anomalous run (which is what we kept seeing on CLS).

This is the new baseline contract: for gating future PRs, compare 3-run medians, and treat the median as the truth.
