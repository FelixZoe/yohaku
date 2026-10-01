# iOS Article Page Redesign

**Date:** 2026-09-30
**Author:** Innei
**Status:** Draft
**Scope:** `yohaku-oss/apps/mobile` (`src/rich`, `src/screens/details`, `src/screens/comments`, `src/components/navigation`, `modules/yohaku/ios`)
**Design canvas:** https://claude.ai/artifact/SxStD7qJk2g2Sta27DDxbk (artboards 01–08)

## 1. Problems

| # | Area | Today |
| --- | --- | --- |
| 1 | Body type | `richTypography` hard-codes 16/28 (post) and 18/28 (note). `RichTextView` ignores Dynamic Type; only `AppText` scales. |
| 2 | Comment highlights | Accent background at 20% / 40% (`RichTextView.swift:362-382`). Reads as smeared marker. |
| 3 | Selection comment sheet | RN `<Modal pageSheet>`, full height. `visible` and children both key off `state`, so dismiss unmounts content first and the sheet slides out blank (`selection-comment-sheet.tsx:58-64`). |
| 4 | Code block | Well plate + 34pt header (uppercase language, text "复制") + GitHub colors. Cold and heavy on warm paper. |
| 5 | Gist embed | `github-gist` is not handled; falls to `UnsupportedBlock`. |
| 6 | Presence | Ink bar with reader ticks under the nav title. No count, no interaction. |
| 7 | Tail action row | Three 40pt outlined pills. Unrelated to the prose above. |
| 8 | GitHub file embed | `Paper` wrapping `CodeBlock`: two surfaces, two headers, inset plate. |

## 2. Decisions

### 2.1 Type follows Dynamic Type (artboard 01)

- `scale = clampFontScale(useWindowDimensions().fontScale)` — same clamp as `AppText` (14/17 … 23/17, AX ignored).
- Post: `size = max(13, round(15 × scale))`, `lineHeight = round(size × 26/15)`, `paragraphGap = round(20 × scale)`.
- Note: `size = max(15, round(17 × scale))`, `lineHeight = round(size × 28/17)`, `paragraphGap = round(16 × scale)`.
- Headings, quote and code sizes derive from the scaled `size` (heading multipliers unchanged; code `max(11, round(12.5 × scale))`).
- Resulting ladder (xS → XXXL): post 13 13 14 **15** 17 19 20; note 15 15 16 **17** 19 21 23.
- `RichTextView` already takes size/lineHeight as props; this is a JS-only change in `src/rich/typography.ts` + `src/theme/note-typography.ts`, plus re-layout on `fontScale` change.
- No in-app size slider.

### 2.2 Highlight = 朱线 (artboard 02, option A)

- Comment range: accent underline, 1.5pt, offset 5pt; no background.
- Active range: 2pt underline + accent 9% background.
- Comment count: small mono accent numeral drawn after the range end.
- Underline, offset and count are drawn in a custom `NSLayoutManager` (TextKit 1 `.underlineStyle` cannot set thickness/offset). The count is drawn, never inserted into text storage, so anchor offsets stay valid.
- Block comments keep a whole-block wash, lowered to accent 5%.
- Edit menu order: 评论 · 整段评论 · system items.

### 2.3 Selection comment sheet on a native formSheet (artboard 03)

- Replace the RN `Modal` with an expo-router route `selection-comment` (`presentation: 'formSheet'`) — react-native-screens drives `UISheetPresentationController`:
  - `sheetAllowedDetents: [0.5, 1]`, `sheetGrabberVisible: true`, `sheetLargestUndimmedDetentIndex: 0` (article stays undimmed at half height).
- Sheet state moves to a module session (same pattern as `presentArticleToc` / `peekTocSession`). The route renders the existing body (`CommentComposeHost`, `CommentCell`, composer).
- The route unmounts after the native dismiss animation, which fixes the blank slide. The article clears the active anchor on route blur, not on the close tap.
- On present, the article scrolls the anchor into the upper half so it stays visible above the sheet.
- The `ScrollView` must be the screen's direct child (known formSheet zero-height pitfall).
- Header: "N 条评论" + close button; quote in serif with 「」; composer pinned at the bottom.
- The sheet content stays RN. Only the container is native.

### 2.4 Code block = 纸片 (artboard 04, option A)

- Plate: `neutral-1`, 1px `neutral-3` ring, radius 12. Header row removed.
- Copy: icon button top-right (`doc.on.doc` → `checkmark` for 1.5s). Language: mono 10pt `neutral-5`, bottom-right.
- Right-edge fade when content overflows horizontally — drawn natively in `YohakuCodeView` (gradient mask, toggled by content width).
- New "Yohaku ink" theme in `Core/CodeTheme.swift`, replacing GitHub light/dark:

| Capture | Light | Dark |
| --- | --- | --- |
| keyword | `#a8505f` | `#d98a98` |
| type / constructor | `#3d6896` (info) | `#7090b3` |
| string | `#4d8468` | `#8cbea3` |
| number / constant | `#a87a3d` (warning) | `#c8a06b` |
| comment | `neutral-5`, italic | `neutral-5`, italic |
| everything else | `neutral-8` | `neutral-8` |

- This diverges from web (shiki `github-light/dark`). Web is out of scope.

### 2.5 Source card: Gist + GitHub file (artboards 05, 08)

- One `SourceCard` shared by `github-file-block.tsx` and a new gist branch in `embed-block.tsx`:
  - The card uses the same surface as the 2.4 plate, with no inner plate. Code renders through a bare `CodeBlock` variant.
  - Header: file glyph + name (+ `ref` chip for files), copy icon, external link.
  - Second line: owner / path, mono 11pt, truncated.
  - Folds at 12 lines with "展开全部 · N 行".
- Gist fetch: `GET https://api.github.com/gists/{id}` directly (React Query, long `staleTime`). With more than one file, file names become tabs.
- Non-`.md` files: single-layer card (artboard 08, middle column).
- `.md` / `.markdown` files (artboard 08, right column; also applies to each Markdown file in a gist):
  - The header swaps the copy icon for a segmented control, 预览 | 源码. It defaults to 预览, and the `ref` moves into the path line.
  - 预览 renders with the existing `MarkdownBody` (`@/components/ui`). YAML frontmatter is stripped with `stripSkillFrontmatter` (`@/lib/skill-markdown`).
  - 源码 is the bare `CodeBlock` with language `markdown`.
  - The fold works the same way; in 预览 the collapsed height is 12 × 21pt and the label drops the line count ("展开全部").

### 2.6 Presence count + reading map (artboard 06)

- After the ink bar: the reader count (room size including self), mono 10pt `neutral-5`, via `SlotText`. Shown only when ≥ 2.
- Join: new tick drops in (−3pt → 0) tinted accent 60%, settling to neutral over 1.2s; count flips accent then back.
- Leave: tick fades out over 400ms.
- Tap on the nav title opens a reading map listing TOC sections, with a dot per reader in that section and a "你" marker. Tapping a row jumps there.
  - Implementation: extend the existing TOC formSheet (`article-toc-sheet.tsx`) with a header "N 人正在读" and per-section reader dots, instead of a new UIKit popover.
  - Section mapping needs heading offsets as a fraction of content height; the article publishes them into the TOC session.
- Articles without headings: the tap still opens the sheet, with the count only.
- Count comes from the presence room list, not `visitor.online` (site-wide).

### 2.7 Tail = 朱印 (artboard 07, option C)

- Center: 64pt seal, radius 12:
  - Unliked: accent 1.5pt ring, serif 「喜」 in accent on paper.
  - Liked: filled accent, paper-colored glyph, rotated −5°.
  - `en`: a heart glyph replaces 「喜」.
- Stamp animation: scale 1.12 → 1 with a critically damped spring from `src/theme/motion.ts`, medium impact haptic.
- Flanking 44pt round buttons: share (left), support (right, only when IAP is on and the user is not a member).
- Caption below: "12 人喜欢" / "你和另外 12 人盖了章".
- No prev/next article links.

## 3. Non-goals

- Web changes (theme, highlights, embeds).
- Nested-doc `Modal` in `article-body.tsx:264-295`. It has the same unmount-before-dismiss bug; fix it separately with the same pattern.

## 4. Verification

- Simulator at xS / L / XXXL: body sizes match the ladder; no clipped heading or code.
- Highlight: comment, open sheet, drag down — content visible through the whole dismiss; active underline clears after.
- Half-height sheet leaves the anchor sentence visible and undimmed.
- A code block wider than the screen shows the edge fade; a short one does not.
- A single-file gist, a multi-file gist, and a GitHub file each render in `SourceCard` and fold at 12 lines.
- A GitHub `SKILL.md` opens in 预览 without frontmatter; switching to 源码 shows the raw file.
- Two simulators on one article: count shows 2, join/leave animate, and tapping the title jumps to the other reader's section.
- Like stamps once; a disabled state persists after reload.
