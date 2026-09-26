# `@yohaku/rich-content` — manual simulator verification checklist

Everything below requires an iOS simulator and cannot be done by an agent. It consolidates:
brief Steps 1–5 (`.superpowers/sdd/2026-08-10-shared-rich-content-package/task-6-brief.md`),
the simulator checklist from `task-5-review.md`, and the additions from `task-5-rereview.md`.

Design reference: `docs/superpowers/specs/2026-08-10-shared-rich-content-package-design.md`.

Status as of Task 6: package/mobile/web checks are green (see `task-6-report.md`), the anchor-scroll
chain and dark-mode palette were fixed in `46e654e0`, and the code-block fallback was styled in
`9bac4c6e`. This checklist re-verifies those fixes on-device and covers everything static review
cannot see.

## Setup

```bash
cd apps/mobile && npx expo run:ios
```

Prepare (or reuse) one test article covering every block type — easiest via a temporary admin
post: alert/banner, blockquote, table, details/collapsible, todo list, at least two headings
(including two with **identical text**, see Part D), a code block, an image, a gallery, a mermaid
diagram, a nested doc, a poll, a stock block, a map block, an excalidraw scene, and one unknown/
unregistered node type if you can produce one. Open it side-by-side with the web version of the
same article.

## Part A — per-block comparison

| Block | Expected on mobile |
|---|---|
| alert / banner | Yohaku tag styling, matches web |
| blockquote | Open-quote glyph + attribution |
| table | Header divider + horizontal scroll |
| details / todo list | Matches web |
| heading anchor | Tap scrolls the outer ScrollView smoothly to the heading |
| code block | Syntax highlighted via the package's default renderer (not required to match web's Shiki exactly) |
| image | Tap opens the RN image viewer; EXIF overlay shows |
| mermaid | Renders as a diagram |
| nested doc | Tap expands **inline** (not a modal/overlay) |
| poll | Shows options + vote-count bars |
| stock | Static snapshot card (**not** a K-line chart) |
| gallery (afilmory) | Thumbnail grid, tap opens viewer |
| map | Static placeholder card + "open in browser" |
| excalidraw | Static scene render |
| unknown type | Placeholder paragraph, **no white screen** |

## Part B — block-boundary isolation

Temporarily corrupt one block's data (e.g. give the stock node an invalid payload, or add a
`throw new Error('test')` inside `snapshot-renderer.tsx`). Confirm only that block degrades to
`〔行情 · 渲染失败〕`-style text and the rest of the article renders normally. Revert the temporary
change afterward — do not commit it.

## Part C — re-verify fixes already shipped (do not treat as hypothetical bugs)

1. **Dark mode, every block type.** Open a dark-theme article with a blockquote, table, nested
   doc, poll, stock block, map, gallery, and excalidraw scene. Confirm no light-parchment panels
   and no dark-on-dark text (this was I2, fixed in `46e654e0` — confirm the fix holds on device).
2. **Heading anchor tap.** Tap directly after a heading's text. Expected: in-app scroll to that
   heading. (This was C1 — pre-fix behavior was Safari opening on the WebView's own bundle URL.)
3. **Anchor landing position.** After tapping, confirm the heading lands at/near the top of the
   viewport, not offset by roughly the header height, on **both** `post-detail` (has an eyebrow +
   title + meta header) and `note-detail` (no such header) — this was I1.
4. **Code block appearance.** Confirm the fallback `<pre>` now has background/padding/border
   (fixed in `9bac4c6e`) and decide: is losing the copy-to-clipboard button and the language badge
   acceptable on mobile? This block has no `slots.CodeBlock` on mobile by design (see spec's "C
   层降级策略"), so this is a product call, not a bug to fix here.

## Part D — additional checks flagged by review

5. **Duplicate heading text.** On an article with two headings sharing identical text, tap the
   *earlier* one's anchor and note which heading you actually land on (`postAnchors()` collapses
   duplicate slugs to the last element's offset, so the later heading may win). Not a blocker —
   just document actual behavior.
6. **Network reachability from the WebView sandbox.** The DOM document is `file://`-origin in
   production. Every `fetchJSON` consumer (poll results, stock quotes, afilmory manifest) depends
   on `https://mx.innei.in/api/v3` accepting an `Origin: null` request. If CORS blocks it, that
   whole block family silently degrades to its error/loading state — this cannot be determined
   from source review.
7. **Pooled-WebView adoption latency, specifically on content-heavy articles.** Adoption now posts
   three messages (`$$match_contents_event` → `yohaku:anchors` → `yohaku:rendered`) instead of two,
   and a 200ms-debounced `ResizeObserver` re-posts anchors after layout-shifting content settles.
   Re-check adoption latency and "no blank frame" specifically on articles containing **code, poll,
   stock, or afilmory blocks** — these are the block types most likely to shift layout after the
   initial paint and trigger the debounced re-post.
8. **Watchdog / `yohaku:rendered` length check.** `article-body.tsx` gates on
   `payload.length !== content.length`. Confirm the reload/fail watchdog does not spuriously trip
   on lexical articles now that the render tree is much heavier than the pre-migration renderer.
9. **Memory / crash on long articles.** ~6,900 modules and the full biz renderer set now run in
   the WebView. Watch for content-process termination (`onContentProcessDidTerminate` silently
   reloads, which looks like an unexplained flash/blank).

## Part E — size & latency remeasurement (brief Step 4)

Reruns Task 0's Step 1–3 methodology. **Must use `EXPO_NO_BUNDLE_SPLITTING=1`** — the default
export path fails with a Metro/Expo CLI serialization bug (`Asset not found: __common-*.js`)
unrelated to this project, and the recorded baseline was measured with the workaround, so
comparability requires the same flag.

```bash
cd apps/mobile
EXPO_NO_BUNDLE_SPLITTING=1 npx expo export --platform ios --output-dir <tmp-dir>
for f in $(find <tmp-dir> -name '*.js'); do
  echo "$(wc -c < "$f") raw  $(gzip -c "$f" | wc -c) gzip  $f"
done | sort -rn -k1
```

Compare against the recorded baseline: **6,088,768 B gzip** (pre-migration) → **6,183,961 B gzip**
(post Task 5, +1.56%). Confirm the final number after Task 6 is still in this range — no new
biz-block imports were supposed to land between Task 5 and Task 6, so a large delta would indicate
an unintended dependency pull-in.

For cold-start / pooled-adoption timing: open the "WEBVIEW POOL" section under the dev-demos
screen (`apps/mobile/src/screens/dev-demos/webview-pool-lab.tsx`, reachable from the dev-demos
route), run cold-start and pooled-adoption 3× each, take the median, and compare against the
existing baseline (cold start 2689ms, pooled adoption 16–27ms).

Record both numbers as a new "迁移后" row in the baseline table at the end of
`docs/superpowers/specs/2026-08-10-shared-rich-content-package-design.md`.

## Part F — decide whether to trim (brief Step 5)

If cold start regressed more than 50% versus the pre-migration baseline (2689ms → >4034ms), record
the real numbers in the spec's "风险" section and open a **new, separate spec** to discuss Metro
code-splitting / dependency trimming for the DOM bundle. Do not attempt that work as part of this
checklist — it is explicitly out of scope for this plan.
