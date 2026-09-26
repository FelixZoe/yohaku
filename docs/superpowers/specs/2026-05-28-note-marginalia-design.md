# Note Marginalia — Decouple Note Header Info from Generic NoticeCard

**Date:** 2026-05-28
**Scope:** Add `apps/web/src/components/modules/note/NoteMarginalia.tsx` containing the primitive plus four compositions: `NoteAISummary`, `NoteBannerMarginalia`, `NoteTranslationMarginalia`, `NotePrivateMarginalia`. Delete `apps/web/src/components/modules/note/NoteHeaderNoticeCard.tsx`. Edit `apps/web/src/app/[locale]/notes/(note-detail)/NoteDetailClient.tsx` to render the new marginalia siblings in place of `NoteHeaderNoticeCard` and the existing `<NoteBanner type="warning">` private warning. Remove the unused `NoteRootBannerItem` export from `apps/web/src/components/modules/note/NoteBanner.tsx`. Update the module re-exports in `apps/web/src/components/modules/note/index.ts`. Post detail, preview, and peek surfaces are not touched.
**Status:** spec, not implemented

## 1. Background & Goal

The note detail page today routes its header info — `meta.banner`, the translation indicator, and the AI summary — through `NoteHeaderNoticeCard` → shared `NoticeCard` → `SummarySwitcher` → `AISummary` (inline variant). The private/unpublished warning lives separately above YohakuShell but also wraps itself in `NoticeCard` via the generic `NoteBanner` FC. All four pieces inherit the generic card chrome: border, gradient backgrounds, tonal radial glow, internal padding, dividers between items.

The note surface has its own physical-paper aesthetic — `PaperWithEntrance`, `NoteTopicBinderClip`, `Signature`, `NoteHeadCover`, `YohakuShell` — and prefers breathing whitespace and barely-perceptible color tints (≈ 1% mix; see `feedback_color_subtlety` and `feedback_yohaku_indent_breathing`). The generic NoticeCard chrome reads as a foreign UI block sitting on top of the paper.

Goal: detach the note detail page from the shared NoticeCard pattern. The note's header info adopts a typographical "marginalia" form — a hanging glyph on the left, a static mono uppercase wordmark, an optional right-corner action, and a soft body. No card chrome. Post detail and preview/peek surfaces keep the existing NoticeCard pattern unchanged.

## 2. Non-goals

- Do not change `apps/web/src/components/modules/shared/SummarySwitcher.tsx`, the generic `AISummary` inline variant, `NoticeCard`, `NoticeCardItem`, `BannerNoticeItem`, or `TranslationNoticeContent`. Post detail still uses them.
- Do not add a new variant to `NoticeCard`. The "脱通用" intent motivated bespoke note components, not a variant prop. (See decision history in §11.)
- Do not change `PostNoticeCard` or any post-detail wiring.
- Do not change `NoteRootBanner` or the generic `NoteBanner` FC — `apps/web/src/app/[locale]/preview/page.tsx` and `apps/web/src/components/modules/peek/NotePreview.tsx` keep their NoticeCard-wrapped banner.
- Do not change `YohakuSummaryChip` — it still ships its inline-flex button styling for post-detail use. The note marginalia renders its own button.
- Do not change `meta.banner` data shape, AI summary data shape, translation indicator data shape, or any i18n keys. New code only reuses existing keys.
- Do not change `NoteMetaBar`, `NoteHeadCover`, `YohakuShell`, or the article content rendering.
- Do not delete the standalone variant of generic `AISummary` (it is unused after this change but the cleanup is out of scope).

## 3. Architecture

### Files added

| File | Purpose |
| --- | --- |
| `apps/web/src/components/modules/note/NoteMarginalia.tsx` | `'use client'` module. Exports primitive `<NoteMarginalia>` plus four compositions: `NoteAISummary`, `NoteBannerMarginalia`, `NoteTranslationMarginalia`, `NotePrivateMarginalia`. Estimated < 250 lines. |

### Files edited

| File | Change |
| --- | --- |
| `apps/web/src/components/modules/note/index.ts` | Remove the `NoteHeaderNoticeCard` re-export. Add re-exports for `NoteMarginalia.tsx` exports. |
| `apps/web/src/components/modules/note/NoteBanner.tsx` | Remove the `NoteRootBannerItem` export (no consumer remains after `NoteHeaderNoticeCard` is deleted). Keep `NoteRootBanner` and the `NoteBanner` FC (preview/peek consumers remain). |
| `apps/web/src/app/[locale]/notes/(note-detail)/NoteDetailClient.tsx` | Replace `<NoteBanner type="warning" message={privateLoginOnlyMessage}>` with `<NotePrivateMarginalia message={privateLoginOnlyMessage}>` in the same position. Replace `<NoteHeaderNoticeCard ...>` inside `YohakuShell` with three sibling marginalia: `<NoteBannerMarginalia>`, `<NoteTranslationMarginalia>`, `<NoteAISummary>`. See §5 for the exact JSX. |

### Files deleted

| File | Reason |
| --- | --- |
| `apps/web/src/components/modules/note/NoteHeaderNoticeCard.tsx` | All consumers move to the new marginalia siblings. |

### Files unchanged (verify imports still resolve)

- `apps/web/src/components/modules/shared/NoticeCard.tsx`
- `apps/web/src/components/modules/shared/SummarySwitcher.tsx`
- `apps/web/src/components/modules/shared/BannerNoticeItem.tsx`
- `apps/web/src/components/modules/ai/Summary.tsx`
- `apps/web/src/components/modules/yohaku/YohakuSummaryChip.tsx`
- `apps/web/src/app/[locale]/posts/(post-detail)/[category]/[slug]/pageExtra.tsx`
- `apps/web/src/app/[locale]/preview/page.tsx`
- `apps/web/src/components/modules/peek/NotePreview.tsx`

## 4. Component contract

### 4.1 Primitive `<NoteMarginalia>`

```ts
type MarginaliaTone = 'accent' | 'warning' | 'info' | 'success' | 'error'

interface NoteMarginaliaProps {
  glyph: ReactNode                 // a character (※ / ⓘ / ⚠) or an <i className="i-mingcute-..."/> element
  tone?: MarginaliaTone            // default 'accent'
  wordmark: string                 // static uppercase short label, e.g. 'AI ─ NOTE'
  action?: ReactNode               // right-end of head row, baseline-aligned
  inlineMsg?: ReactNode            // single-line body next to wordmark
  children?: ReactNode             // multi-line body, rendered as its own row below the head
  className?: string
}
```

Behavior:
- `inlineMsg` and `children` are mutually exclusive. If both are passed, `children` wins.
- `action` is optional. When absent, the head row only shows the wordmark and (when present) `inlineMsg`.
- Outer container always carries `data-hide-print`.
- The glyph slot accepts both raw characters and icon components so each composition picks the natural form.

Visual contract (using `@yohaku/design-system` tokens):

| Slot | Class / token |
| --- | --- |
| Outer container | `relative my-4 ml-6` (ml-6 = 24px hang offset, matches breathing preference) |
| Hanging glyph | `absolute -left-6 top-[2px] text-copy-14` ; color per tone (see §4.4) ; `aria-hidden="true"` |
| Head row | `flex items-baseline justify-between gap-3 mb-1` |
| Wordmark | `font-mono text-caption-10 tracking-[1.5px] uppercase text-neutral-6 flex-none` |
| `inlineMsg` slot | `text-copy-13 leading-[1.7] text-neutral-7 flex-1 min-w-0` |
| Body (`children`) | `text-copy-13 leading-[1.9] text-neutral-7 mt-1` |
| Action slot | `flex-none` (the action manages its own typography internally) |

### 4.2 Compositions

| Component | Data source | Glyph | Tone | Wordmark | Body shape | Action |
| --- | --- | --- | --- | --- | --- | --- |
| `NoteAISummary` | props: `summary: string`, `showYohakuChip: boolean` | `※` (character) | `accent` | `AI ─ NOTE` | multi-line via `<Markdown disableParsingRawHTML removeWrapper>{summary}</Markdown>` | self-rendered button (see §4.3). Hidden when `!showYohakuChip` or when `useYohakuActionsOptional()` returns null. |
| `NoteBannerMarginalia` | reads `meta?.banner` via `useCurrentNoteDataSelector`, normalizes via `normalizeBannerMeta` | character map: `info`/`secondary` → `ⓘ`, `success` → `✓`, `warning` → `⚠`, `error` → `✗` | matches normalized banner tone | `NOTICE` | single-line `inlineMsg` = the banner message | none |
| `NoteTranslationMarginalia` | props: `articleTranslation: ArticleTranslation` | `<i className="i-mingcute-globe-line">` (matches today's `TranslationNoticeContent` icon for color/dark-mode consistency) | `accent` | `TRANSLATED` | single-line `inlineMsg` derived from translation labels (see §4.5) | `view original ↗` button when `canSwitchToOriginal` |
| `NotePrivateMarginalia` | props: `message: string` | `⚠` (character) | `warning` | `UNPUBLISHED` | single-line `inlineMsg` = `message` | none |

Each composition returns `null` early when its data preconditions are not met.

### 4.3 AI summary action button

`NoteAISummary` does not import `YohakuSummaryChip`. It renders its own button so the marginalia styling stays cohesive while reusing the same actions/state/loading hooks and i18n keys:

```tsx
const actions = useYohakuActionsOptional()
const state = useYohakuState()
const loading = useYohakuLoading()
const t = useTranslations('common')

if (!actions || !showYohakuChip) return null

const active = state !== 'idle'

return (
  <button
    aria-expanded={active}
    data-yohaku-chip=""
    disabled={loading}
    type="button"
    onClick={actions.toggle}
    className={clsxm(
      'font-mono text-label-12 tracking-[1.2px] uppercase',
      'border-b border-accent/40 pb-px',
      'text-accent transition-colors duration-150 hover:border-accent/90',
      loading && 'opacity-60 cursor-wait',
    )}
  >
    {active ? t('yohaku_chip_close') : t('yohaku_chip_open')}
    <span aria-hidden> →</span>
  </button>
)
```

The `data-yohaku-chip=""` attribute is preserved so existing selectors (if any) continue to match.

### 4.4 Tone → color mapping

| Tone | Glyph color class | Wordmark color class | Notes |
| --- | --- | --- | --- |
| `accent` (default) | `text-accent/55` | `text-neutral-6` | Used by AI summary and translation |
| `warning` | `text-warning/75` | `text-warning/85` | Slightly elevated so UNPUBLISHED reads without being loud |
| `info` | `text-info/55` | `text-neutral-6` | Banner default fallback |
| `success` | `text-success/55` | `text-neutral-6` | Banner success tone |
| `error` | `text-error/65` | `text-neutral-6` | Banner error tone (slightly stronger than 55) |

The opacity numbers are intentional — they sit in the "barely perceptible to gently present" band that matches `feedback_color_subtlety`.

### 4.5 Translation indicator helper

Extract a small hook from today's `TranslationNoticeContent` to avoid copy-pasting the original-language switching logic:

```ts
// new: apps/web/src/components/modules/note/useTranslationOriginalSwitch.ts
// or inline inside NoteMarginalia.tsx if kept short
function useTranslationOriginalSwitch(articleTranslation: ArticleTranslation) {
  // returns: { sourceLangLabel: string, canSwitch: boolean, onSwitch: () => void, switchLabel: string }
  // wraps useLocale + useRouter + usePathname + locales lookup the same way TranslationNoticeContent does today
}
```

The decision between "inline helper in `NoteMarginalia.tsx`" vs "new helper file" is left to implementation taste. Either is acceptable; the contract is what matters.

`NoteTranslationMarginalia` renders:
- `inlineMsg` = `t('translation.banner_title')` + a small separator + the source-language label (or a compact equivalent — implementation may simplify the existing `TranslatedBadge` content to a single inline string)
- `action` = a `<button>` showing `t('translation.banner_viewOriginal')` with the same accent underline style as the AI summary chip, when `canSwitch` is true

## 5. Layout & order in NoteDetailClient

Inside `apps/web/src/app/[locale]/notes/(note-detail)/NoteDetailClient.tsx` → `PageInner`:

```tsx
return (
  <>
    <AckRead id={data.id} type="note" />

    <NoteHeadCover image={data.meta?.cover} />
    <div>
      <NoteTitle />
      <NoteTopicInlineTag />
      <NoteMetaBar />

      {!data.isPublished && (
        <NotePrivateMarginalia message={privateLoginOnlyMessage} />
      )}
    </div>

    <NoteHideIfSecret>
      <YohakuShell lang={contentLang} nid={data.id!}>
        <NoteBannerMarginalia />
        {articleTranslation?.isTranslated && (
          <NoteTranslationMarginalia articleTranslation={articleTranslation} />
        )}
        {aiSummary?.text && (
          <NoteAISummary
            summary={aiSummary.text}
            showYohakuChip={!!hasInsightsInLocale}
          />
        )}

        <WrappedElementProvider eoaDetect>
          {/* unchanged */}
        </WrappedElementProvider>
      </YohakuShell>
    </NoteHideIfSecret>

    <Signature />
    {/* unchanged tail */}
  </>
)
```

Order rationale:
- `NotePrivateMarginalia` stays above `YohakuShell` so the unpublished state remains visually outside the paper sheet, preserving today's "critical-ish state lives outside the paper" semantics.
- Inside `YohakuShell`, the order is `banner → translation → AI summary`. The AI summary is closest to the body so it reads as the epigraph that introduces the article.

## 6. Edge cases & invariants

1. **All-empty header**: when `meta.banner`, translation, and `aiSummary` are all empty, no marginalia render inside `YohakuShell`. The cover fades into the body the same way it does today when `NoticeCard` returns null.
2. **Multi-paragraph AI summary**: `<Markdown disableParsingRawHTML removeWrapper>` renders multiple paragraphs. The hanging `※` stays at the top-left of the first paragraph because it is positioned absolutely relative to the outer container (`top-[2px]`).
3. **Action absent**: head row degrades to wordmark only (or wordmark + `inlineMsg` for single-line items).
4. **Translation switch unavailable**: when `canSwitch` is false the action slot is empty; `inlineMsg` still shows the "from {lang}" line.
5. **Yohaku actions not provided** (`useYohakuActionsOptional()` returns null): the AI summary chip is hidden but the summary body still renders.
6. **`showYohakuChip` false** (no insights in locale): same as above — chip hidden, summary still renders.
7. **Long `inlineMsg`**: wraps naturally via `flex-1 min-w-0`. The action stays baseline-aligned on the same row. On very narrow viewports the action may wrap to a new line — acceptable.
8. **Dark mode**: relies on token auto-inversion. No special dark-mode classes needed.
9. **Print**: `data-hide-print` hides all marginalia.
10. **A11y**: glyph slot is `aria-hidden`. Wordmark is plain text. AI summary chip is a real `<button aria-expanded disabled>` driven by the same yohaku state.
11. **NoticeCard still shrinks gracefully on other surfaces**: post/preview/peek `NoticeCard.tsx` is unchanged; its `validChildren.length === 0` short-circuit continues to apply where relevant.

## 7. Migration notes

- `NoteHeaderNoticeCard` is the only consumer of `NoteRootBannerItem`. After `NoteHeaderNoticeCard.tsx` is deleted, remove the `NoteRootBannerItem` export from `NoteBanner.tsx` and any stale re-exports in `index.ts`.
- The `SummarySwitcher` import in `NoteHeaderNoticeCard` goes away with the file deletion. `SummarySwitcher` is still imported by `pageExtra.tsx` (post). No change needed there.
- The standalone variant of generic `AISummary` (`apps/web/src/components/modules/ai/Summary.tsx`) becomes unused after this change. Deleting it is a follow-up cleanup outside this spec's scope.
- The `NoteHeaderNoticeCard` symbol export is removed; any external grep for it should be empty after migration. Verify with `grep -rn 'NoteHeaderNoticeCard' apps/web/src`.

## 8. Visual tokens reference

From `@yohaku/design-system` (`packages/design-system/references/tokens.md`):
- `--font-mono` for the mono wordmark and chip text
- `--a` for the dynamic accent (used via `text-accent`, `text-accent/55`, `border-accent/40`, `border-accent/90`)
- `--color-warning`, `--color-info`, `--color-success`, `--color-error` for banner / private tones
- Neutral scale: `neutral-6` (wordmark), `neutral-7` (body / inlineMsg)
- Text scale: `text-copy-13` (body), `text-label-12` (chip), `text-caption-10` (wordmark), `text-copy-14` (glyph)
- Spacing: `my-4` between marginalia siblings, `ml-6` for the hang offset

No new tokens are required.

## 9. Testing plan

This is a visual refactor. Verification is manual + lint:

1. Published note with `aiSummary` only — AI marginalia renders; chip toggles yohaku state correctly; Markdown body wraps multi-paragraph content.
2. Published note without `aiSummary` and without `meta.banner` and not translated — no marginalia render inside YohakuShell.
3. Note with `meta.banner` for each tone (`info` / `warning` / `success` / `error` / `secondary`) — glyph character and color match the tone table in §4.4.
4. Translated note — `inlineMsg` shows the from-language line; `view original ↗` action renders only when `canSwitch` is true; clicking it routes the same way `TranslationNoticeContent` does today.
5. Unpublished note (`!data.isPublished`) — `NotePrivateMarginalia` renders above YohakuShell with warning tone; published notes do not render it.
6. Combined: unpublished + banner + translated + aiSummary — all four marginalia stack in the order specified in §5 with correct breathing between them.
7. Dark-mode parity for all of the above (toggle via the theme switcher).
8. Print preview: all marginalia hidden.
9. Mobile narrow viewport (≤ 375px): single-line `inlineMsg` wraps; the hanging glyph remains visible at -24px (no horizontal scroll); AI summary body wraps within the hang offset.
10. Preview page (`/preview`) and Note peek card — visually unchanged (regression check).
11. Post detail page — visually unchanged (regression check).

Run `pnpm --filter @yohaku/web lint` scoped to the changed files. The design-system check (`pnpm --filter @yohaku/design-system check`) only matters if design-system files change — this spec does not change them, so it is a no-op here.

## 10. Open questions

None at spec time.

## 11. Decision history (selected forks)

- **Visual direction**: explored α (epigraph), β (letterhead), γ (folded slip), δ (hairlines), ε (marginalia mono), ζ (pull quote serif). Chose ε with the action elevated to a head-row right corner using mono uppercase + accent underline + `→` arrow. Reason: ε keeps the literary/quiet feel while the head-row action gives the Yohaku chip the prominence it needs as the primary CTA.
- **Scope**: started with AI summary only; expanded to "no NoticeCard on note detail" so banner, translation, and private warning also adopt the marginalia form. Reason: leaving them in NoticeCard would split note's voice in two.
- **Variant vs bespoke**: considered adding `variant="marginalia"` to the shared `NoticeCard` family. Rejected because the card and marginalia shapes are structurally different (chrome + internal padding + dividers vs. no chrome + hanging glyph + in-flow), the variant would touch ~7 files vs. ~3 for bespoke, and every future change to `NoticeCard` would need to consider both shapes. The "脱通用" intent is better served by a small bespoke module.
- **Action prominence**: explored quiet placements first (head-row right with no underline, inline trailing link, below-body centered). Settled on accent-colored mono uppercase with a 1px accent underline that strengthens on hover. The chip is the primary CTA and needs to read; mono + accent gives it weight without breaking the typographical character of the marginalia.
