# Thinking Page Redesign Design

## Overview

Refactor the entire `/thinking` page (list, item, composer, detail) to align with the recently shipped unified `<LinkCardVariant>` system and adhere to Yohaku design tokens. Replace the current 印章 / serif-font / 8-color-Tailwind-palette aesthetic with a modern, sans-serif, Paper-sheet design that emphasizes negative space (留白).

This redesign also clears 12 distinct Yohaku-rule violations currently in `thinking/`.

## Design Decisions

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | Surface per item | Paper sheet (re-use `<PaperSheet>`) | Same textural depth as article body; deckle edge + contact shadow consistent with rest of Yohaku |
| 2 | Stack 3D | None (`stackSheetCount = 1`) | Thinking entries are an independent stream, no prev/next neighbors |
| 3 | Typography | Sans only (`var(--font-sans)`) | Drop SERIF_FONT; "modern + 留白" direction |
| 4 | Type pill | Removed entirely | Sub-type self-evident from embedded LinkCard variant; Text type has no LinkCard and is naturally distinguishable |
| 5 | Embedded LinkCard | Keep full surface (ring + bg) — no `embedded` prop | Same appearance as LinkCard inside post/note/page detail; consistency wins over local minimalism |
| 6 | Meta row | Dashed top divider, mingcute icons, neutral-5, hover → accent | Quiet but discoverable |
| 7 | Delete button color | `text-error` semantic token | Destructive affordance; replaces hardcoded `text-red-600 dark:text-red-400` |
| 8 | Composer surface | Same Paper sheet as list items | Vertical rhythm: 1 (composer) + N (stream) papers |
| 9 | `<MarkdownEditor>` surface | Overridden away (transparent bg/border/shadow) | Avoid double-surface inside composer paper |
| 10 | URL banner | Inline 11px row below editor; mono code chip + pulsing dot | Quiet feedback with no extra surface |
| 11 | Page header | Kicker + title + subtitle (PostList convention) | Aligns thinking list with other Yohaku list pages |
| 12 | RSS pill | Default neutral; `text-[#EE802F]` only on hover | Honor RSS brand color, but quiet by default |
| 13 | Detail page | Same chrome + single ThinkingItem + minimal back link + redesigned comments header | Consistency over bespoke design |
| 14 | Motion | Spring presets only (`microReboundPreset`); remove every inline `transition={...}` | Yohaku rule |

## Section 1 — Item anatomy

Each thinking item is wrapped in a Paper sheet (re-uses `apps/web/src/components/layout/container/PaperSheet.tsx` plus the `#deckle-edge` SVG filter, mounted once at the page or list level).

```
┌─ paper sheet (white, deckle edge, contact shadow) ───────┐
│  Innei                          3 hours ago              │  head: 13px font-medium / mono 11px neutral-5
│                                                          │
│  Markdown body (sans, 15px, line-height 1.82, neutral-9) │
│                                                          │
│  ┌─ <LinkCardVariant> (full ring + bg) ───────┐          │  enrichment (optional)
│  │ icon  Title                                │          │
│  │       meta line                            │          │
│  └────────────────────────────────────────────┘          │
│                                                          │
│  - - - - - - - - - - - - - - - - - - - - - - - - - - -   │  dashed top divider
│  ♡ 12   ✕ 0   💬 3   ✎  🗑                  view →      │  meta row
└──────────────────────────────────────────────────────────┘
```

Inner padding: `26px 30px 22px` (desktop), `18px 18px 16px` (mobile).
Gap between items: `28px`.
Stack count: `1` (no 3D backing layers).

The `RefPreview` component (rendered when `item.ref` exists) keeps its existing `<Divider>` + `i-mingcute-link-3-line` structure; only the divider color tokens change. RefPreview content remains in body region, before the optional LinkCard.

The fallback dashed panel (rendered when `item.enrichmentExternalId` is set but `item.enrichment` is null) is unchanged.

## Section 2 — Type distinction

`TYPE_SEAL` is removed entirely. Type is conveyed implicitly:

- Items with an enrichment surface its type via the `<LinkCardVariant>` variant: `RepoCard`, `MovieCard`, `AlbumCard`, `BookCard`, `PaperCard`, `LeetcodeCard`, `UserCard`, or `FallbackCard`.
- Text-type items have no enrichment and no LinkCard, which itself distinguishes them.

No type pill, dot, icon, or label appears in the head row.

## Section 3 — Embedded LinkCard

`<LinkCardVariant>` renders unchanged inside the thinking paper. Full ring + paper-bg surface preserved (same as inside post/note/page detail Paper containers). No `embedded` prop introduced.

Spacing: `mt-[18px]` from body content (or RefPreview if present).

## Section 4 — Meta actions row

```
- - - - - - - - - - - - - - - - - - - - - - - - - - -      border-t border-dashed border-border, pt-3 mt-4
♡ 12   ✕ 0   💬 3        ✎   🗑                view →     gap-[22px], 11px sans neutral-5
```

Layout details:
- Flex row, `gap-[22px] items-center`
- 11px sans neutral-5; hover → accent (except delete)
- 0-counts still rendered (visual stability of the row)

Public actions (left):
- `i-mingcute-heart-line` + count (handleUp)
- `i-mingcute-heart-crack-line` + count (handleDown)
- `i-mingcute-comment-line` + count — only when `item.allowComment && !isInThinkingDetailRoute`; opens existing `CommentModal`

Owner-only actions (middle, always visible to owner — no hover-reveal):
- `i-mingcute-quill-pen-line` (edit)
- `i-mingcute-delete-line` (delete) — `text-error hover:text-error/80`

Right-aligned (only when `!isInThinkingDetailRoute`):
- `view →` with arrow icon
- `opacity-0 group-hover:opacity-100 transition-opacity duration-250`
- Suppressed when `isInThinkingDetailRoute` is true

## Section 5 — Composer (`PostBox`)

`PostBox` wrapped in a `<PaperSheet>` shell (same surface as list items). Inner padding: `18px 22px`. Gap from composer to first list item: `36px`.

`<MarkdownEditor>` props:
- Override `fieldWrapperBaseClassName` via `className`: `bg-transparent! border-transparent! shadow-none!`
- Inner editor area: 14px neutral-9, line-height 1.7
- Placeholder: 14px neutral-4

Send button (`<TiltedSendIcon>`):
- 28×28 round, `bg-neutral-9 text-white`
- Hover: `rotate(-15deg) scale(1.05)` via `microReboundPreset` (no inline transition object)
- Disabled: `opacity-30 cursor-not-allowed`

Detected URL banner (rendered when `detectedUrl !== null`):
- 11px row, `mt-3`, neutral-5
- Inline `<code>` chip: mono, `bg-neutral-2/40`, `rounded-xs`, truncated to ~360px
- "resolving" indicator: pulsing dot via CSS keyframes (1.2s ease-in-out infinite); respects `prefers-reduced-motion`

Enrichment preview (rendered when `enrichment !== null`):
- `<LinkCardVariant data={enrichment}>` rendered below banner
- Wrapper has `pointer-events-none`
- Same surface as list-item LinkCard (Section 3)

## Section 6 — Page header

```
THINKING                                              kicker: 11px uppercase tracking-[4px] neutral-5
{t('page_title')}                                     title:  28px font-normal neutral-9, mt-2.5
{t('page_subtitle')}                                  subtitle: 15px neutral-6 leading-relaxed, mt-2
```

RSS pill placement: inline at end of the title row (preserves the existing `<h1 className="flex items-end gap-2">` pattern).
- 24×24 round
- Default: `text-neutral-5 bg-neutral-2/40`
- Hover: `text-[#EE802F]` (RSS brand spec — only hardcoded hex remaining in the entire thinking page; gated with a comment that explains the brand-color exception)
- Icon: `i-mingcute-rss-fill`

The current `-mt-12` hack on `<main>` is removed; spacing between header and composer is an explicit `mt-[36px]` (or chosen via container padding).

## Section 7 — Detail page (`thinking/[id]/page.tsx`)

Header reuses Section 6 verbatim (kicker + title + subtitle + RSS pill).

Back nav replaces current bordered rectangle:
- Inline-flex with leading `i-mingcute-arrow-left-circle-line`
- Text: `{tCommon('actions_back')}`
- 12px sans, `text-neutral-6 hover:text-accent`
- No border, no padding rectangle, just `gap-1.5`
- Vertical: `mt-5 mb-6`

Item: single `<ThinkingItem item={data.$serialized}>` (same component as list). The component reads `usePathname()` and detects `Routes.ThinkingItem`; existing `isInThinkingDetailRoute` logic suppresses the right-aligned `view →` link automatically.

Comments section header replaces current SERIF_FONT + double-border h2:
- Top: `border-t border-dashed border-border pt-8 mt-10`
- Kicker: `COMMENTS` (11px uppercase tracking-[4px] neutral-5)
- h2: `{tCommon('comment')}` (20px font-medium neutral-9, mt-2.5)

Existing `Suspense`-wrapped `<CommentBoxRootLazy>` and `<CommentsLazy>` continue to be used, no logic change.

## Section 8 — Motion

Preserved as-is:
- `<BottomToUpSoftSpringTransitionView>` mount stagger for header / composer / each item
- Stagger delay for items: `Math.min(i, 5) * 45ms`

Removed:
- 印章 `<m.div>` block with inline `transition={{ delay: 0.35, type: 'spring', stiffness: 320, damping: 18, mass: 0.8 }}`
- All other inline `transition={...}` literals in thinking files

Replaced/added:
- Send button hover via `motion/react` wrapping `<TiltedSendIcon>`, using `microReboundPreset` from `~/constants/spring.ts`
- Composer pulsing dot: CSS `@keyframes`, 1.2s ease-in-out infinite, with `@media (prefers-reduced-motion: reduce)` static override
- Item paper-shadow strengthen on hover: `transition-shadow duration-250 ease-out`

Yohaku global reduced-motion handling unchanged.

## Section 9 — Refactor scope (rule cleanup)

| # | Current | After |
|---|---------|-------|
| 1 | `SERIF_FONT = 'ui-serif, "STSong", "Songti SC"…'` const | Removed |
| 2 | `TYPE_SEAL` map (8 Tailwind palette colors) | Removed |
| 3 | `dark:text-red-400 dark:border-red-400` etc. manual dark variants | Removed alongside #2 |
| 4 | `font-semibold tracking-[0.05em]` (owner.name) | `font-medium`, default tracking |
| 5 | `text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300` (DeleteButton) | `text-error hover:text-error/80` |
| 6 | Double inset border (`border border-neutral-4` + `inset-[3px]` ghost border) | Removed; PaperSheet replaces all surface chrome |
| 7 | Detail comment h2 `font-semibold tracking-[0.08em]` + SERIF_FONT | Section 7 kicker + h2 |
| 8 | RSS icon default color `text-[#EE802F]` | Default neutral; hover-only brand orange |
| 9 | `style={{ fontFamily: SERIF_FONT }}` inline | Removed |
| 10 | 印章 `m.div` inline `transition={{...}}` | Removed |
| 11 | `<MarkdownEditor>` `fieldWrapperBaseClassName` surface | Override transparent |
| 12 | Detail back button `border border-neutral-4 px-3 py-1` rect | Section 7 minimal text link |

## Files

**Modify:**
- `apps/web/src/app/[locale]/thinking/page.tsx` — header redesign (kicker added), `-mt-12` hack removed, gap spacing
- `apps/web/src/app/[locale]/thinking/post-box.tsx` — wrap in PaperSheet, MarkdownEditor surface override, URL banner restyled, send-button motion via spring preset
- `apps/web/src/app/[locale]/thinking/item.tsx` — primary surgery: drop SERIF_FONT, drop TYPE_SEAL, drop double-border, drop 印章 motion, drop type pill, restyle owner.name, restyle meta row, DeleteButton color token
- `apps/web/src/app/[locale]/thinking/[id]/page.tsx` — drop SERIF_FONT, restructure header (use list-page header pattern), minimal back nav, redesigned comments h2

**No change:**
- `apps/web/src/app/[locale]/thinking/feed/route.ts`
- `apps/web/src/app/[locale]/thinking/constants.ts`
- `apps/web/src/app/[locale]/thinking/resolve-metadata.ts`
- `apps/web/src/app/[locale]/thinking/layout.tsx`
- `apps/web/src/app/[locale]/thinking/loading.tsx`
- `apps/web/src/components/ui/link-card/*` (Section 3 keeps `LinkCardVariant` unchanged)

**Possibly extract (only if duplication warrants):**
- A local `<ThinkingPaper>` wrapper that mounts `<PaperSheet>` + content area. Default to inline; extract only if the pattern recurs in a third place beyond list and composer.

## Out of scope

- Comment / CommentBox UI (used as-is from existing modules)
- Modal stack visuals (unchanged)
- Markdown content rendering internals (unchanged)
- LinkCardVariant variant designs (all 11 stay as-is)
- Backend / API / data model

## Verification

- `pnpm --filter web lint` passes (no Tailwind palette banned tokens, no inline transitions, no hardcoded font-family in thinking files)
- `pnpm --filter web typecheck` passes
- Visual: list shows paper-stream rhythm; an item with link shows nested LinkCard with full ring; composer renders as a paper sheet with transparent inner editor; detail page header matches list; back link is a minimal text link
- Dark mode: PaperSheet auto-inverts via `--surface-paper`; all colors come from Yohaku tokens
- Reduced motion: pulsing dot is static; mount stagger collapsed to 0
