# Home Second Section — Yohaku Redesign

**Date:** 2026-05-15
**Status:** Implemented
**Scope:** `apps/web` home page `SecondScreen` and its children

## Implementation Notes (shipped 2026-05-15)

The sections below capture the original approved design. Two decisions
changed during implementation:

- **Typography — serif, not sans.** The sibling home sections
  (`HomePageTimeLine`, `Windsock`) use `font-serif` throughout, so the
  second section was shipped with `font-serif` on its root for visual
  consistency rather than the sans-serif treatment described below. The
  numbered nodes keep `tabular-nums`.
- **Social icons — hero footer, not second-section footer.** The social
  icon row moved into the `Hero` component, at the bottom of the first
  screen, instead of a footer inside `SecondScreen`. `SecondScreen` ends
  at the two-column grid; it has no footer and no social row. `Hero.tsx`
  is therefore also an affected file.

## Overview

Re-conceive the home page's second section (`SecondScreen`) so it expresses the
Yohaku design contract instead of fighting it. Today the section renders four
blocks — social icons, recent writing, a decorative fold crease, and a bottom
section (musings + letters) — using raw `rgba()` literals, hard drop shadows,
`neutral-2` as a border color, and ad-hoc tracking. The goal is a layout and
visual treatment that is faithful to `@yohaku/design-system`: paper ground,
pure neutral scale, accent under 5% of surface, hairline division, and generous
negative space (余白).

This is a visual + structural redesign of an existing section. Data fetching,
routing, and the `SocialIcon` component are unchanged.

## Current State and Problems

`apps/web/src/app/[locale]/(home)/components/`:

- `SecondScreen.tsx` — section shell. Renders `SocialIcons` at the top, then
  `RecentWriting`, then a local `FoldCrease`, then `BottomSection` wrapped in
  `lg:[perspective:800px]`.
- `RecentWriting.tsx` — section heading + one `FeaturedPost` (bordered card) +
  up to four `PostRow`s. Exports a `SectionHeading` with a `primary` prop.
- `BottomSection.tsx` — adaptive two-column grid of `Musings` (left rule) and
  `RecentLetters` (filled `neutral-2` cards); has its own local `SectionHeading`.

Design-contract violations to remove:

- Raw color literals: `border-[rgba(200,180,160,0.1)]`, `bg-white/40`,
  `bg-white/5`, `bg-[rgba(200,180,160,0.05)]`, `bg-[rgba(200,180,160,0.15)]`.
- Hard drop shadow: `hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)]`.
- `neutral-2` used as a border (`dark:border-neutral-2`); `neutral-2` is a
  surface tier, never a border. Borders use `--color-border`.
- Per-theme `dark:` overrides that exist only because raw values do not invert.
  Token classes auto-invert, so these overrides disappear.
- `lg:[perspective:800px]` 3D gimmick on the bottom section.
- The fold crease is decorative and no longer needed once the layout changes.

## Approved Design Decisions

Selected through visual brainstorming:

1. **Layout — asymmetric editorial two-column.** Recent Writing is the main
   column (left); Musings + Letters are marginalia (right). Social icons move
   from the top to a quiet footer.
2. **Recent Writing — "fading accent rail" (variant 4).** A continuous 2px left
   rail runs the list; each entry is a numbered node on the rail; the rail is
   accent-colored at the top and fades to a neutral hairline downward, so visual
   freshness decays with age. The first entry is an expanded lede (no card box).
3. **Typography — sans-serif throughout.** No serif. Hierarchy is carried by
   size and weight only. Numerals are upright and tabular.
4. **Letters — hanging quote glyph.** Each letter is led by a single large faded
   quotation glyph; entries are separated by hairlines. No filled card boxes.

## Layout

Section container keeps the existing shell: `mx-auto max-w-[1400px] px-4
lg:px-12`, with the current top margin.

**Desktop (`lg` and up):** a two-column grid.

```
grid-cols-[1.6fr_1fr], column gap 64px (gap-x-16)

┌ left · Recent Writing ─────────────┐   ┌ right · marginalia ──────┐
│  eyebrow + heading                 │ │ │  eyebrow + heading        │
│  ┃01  featured lede + summary      │ │ │  ▏ musing                 │
│  ┃02  row                          │ │ │  ▏ musing                 │
│  ┊03  row                          │ │ │  ── hairline ──           │
│  ┊04  row                          │ │ │  eyebrow + heading        │
└────────────────────────────────────┘ │ │  " letter                 │
                                     gutter │  " letter                 │
                                     hairline└──────────────────────────┘
── full-width hairline ──────────────────────────────────────────────
            social icons (centered, mono)
```

The right column carries a 1px `--color-border` rule on its left edge
(`border-l border-border`), shown only at `lg`, that separates marginalia from
the main column across the gutter.

**Below `lg`:** single column, stacked in order — Recent Writing, Musings,
Letters, then the social footer. The right-column edge rule is hidden.

**Footer:** a full-width hairline (`border-t border-border`) followed by the
centered social icon row, reusing `SocialIcon` with `variant="mono"`.

## Component Spec

### Shared `SectionHeading`

A single shared heading replaces the two divergent local `SectionHeading`
definitions. It renders a two-line block:

- **Eyebrow** — fixed Latin label, `text-caption-10 uppercase tracking-[1.5px]
  text-neutral-5`.
- **Heading** — localized term from the existing i18n key,
  `text-title-20 font-medium text-neutral-9` for the main column,
  `text-copy-16 font-medium text-neutral-8` for the marginalia columns
  (intentionally smaller to read as secondary).

Latin eyebrow text is a code constant (`Recent Writing`, `Musings`, `Letters`)
— decorative, not translated. In the `en` locale the eyebrow would duplicate
the heading, so the eyebrow is omitted when `locale === 'en'`. No new i18n keys
are required; headings continue to use `second_recent_writing`,
`second_musings`, `second_letters`.

`font-medium` (500) is the weight ceiling — never `font-bold` on CJK text.

### Recent Writing (left column)

Data logic is unchanged: merge posts + notes, sort by `createdAt` desc, take 5;
`getItemUrl` for routing; return `null` when there are no items.

Rendering changes:

- **Rail.** The list container is `relative`. A single 2px-wide rail element is
  absolutely positioned at the left, spanning the list height. Its background is
  a vertical gradient: `--color-accent` at the top, fading to `--color-border`
  by roughly 55% down, then holding `--color-border` to the bottom.
- **Items.** Each item is `relative` with `py-4 pl-10` (≈40px left inset — the
  wide marker-to-text breathing the project prefers). The index number is
  absolutely positioned centered on the rail, `text-label-12 font-medium
  tabular-nums tracking-[0.5px]`, with a `bg-paper` background so the rail reads
  as passing behind it. The featured (first) number is `text-accent`; the rest
  are `text-neutral-6`.
- **Featured lede (item 01)** — no border, no fill, no card:
  - meta line: type label + `RelativeTime` + weather (notes only),
    `text-label-12 text-neutral-6`
  - title: `text-title-20 font-medium text-neutral-9`, `hover:text-accent
    transition-colors`, wrapped in the post `Link`
  - summary (when present): `text-copy-13 text-neutral-7 leading-[1.8]`
- **Rows (items 02…0N)**:
  - title + relative time on one baseline-aligned line: title `text-copy-14
    text-neutral-8 hover:text-accent transition-colors`; time `text-label-12
    text-neutral-6 tabular-nums`
  - meta below: `text-label-12 text-neutral-6` — `文章 · {category}` for posts,
    the note label for notes
- The bordered-card `FeaturedPost` component is removed; `PostRow` is replaced
  by the rail row.

### Marginalia (right column — current `BottomSection`)

The adaptive left/right column logic (`leftSections`, `rightSections`,
`lettersWide`, `renderColumn`) is removed. `BottomSection` becomes a single
stacked column: Musings, a hairline gap, then Letters. Data hooks
(`useRecentlyData`, `useRecentComments`), the de-duplication, loading skeletons,
and null-guards are preserved.

- **Musings** — each musing is `border-l border-neutral-4 pl-[18px]`:
  - text: `text-copy-14 text-neutral-7 leading-[1.9]`, keeping the 「」 quotes
  - date below the last musing: `text-label-12 text-neutral-6`
- **Gap** — a hairline (`border-border`) with vertical margin separating the
  two sub-sections.
- **Letters** — each letter is `relative` with a left inset for the glyph,
  separated by `border-b border-border` (last has none):
  - glyph: a decorative `"` (U+201C) at `text-display-36 text-neutral-4
    leading-none`, absolutely positioned at the left
  - text: `text-copy-13 text-neutral-7` (no surrounding quote marks — the glyph
    carries the quotation)
  - attribution line: `text-label-12 text-neutral-6` — article title link on
    the left (`hover:text-accent`), `— {author}` on the right
- **Skeletons** — loading placeholders use `bg-neutral-3 animate-pulse rounded`.

### Social footer

`SecondScreen` renders, after the grid: a `border-t border-border` hairline and
the centered `SocialIcons` row. `SocialIcon` (`variant="mono"`) is reused as-is.

## Empty and Loading States

Behavior must not regress from the current implementation:

- **No posts/notes** — Recent Writing renders nothing. The marginalia column
  then spans the full width of the grid.
- **No musings / no letters** — each sub-section is omitted independently. If
  the whole marginalia column is empty (and not loading), the Recent Writing
  column spans full width.
- **Both columns empty** — only the social footer renders.
- **Single item in Recent Writing** — it is the featured lede; no rows.
- **Loading** — marginalia shows skeletons in place of musings/letters, as today.

## Tokens and Styling

All color, type, spacing, and division values come from `@yohaku/design-system`
tokens. No raw `rgba()`, no `bg-white/*`, no `shadow-[...]`, no `neutral-50…950`,
no hardcoded `text-[Npx]`. Dividers and the rail base use `--color-border`
(`border-border`). Because token classes auto-invert, manual `dark:` overrides
are removed; dark mode is inherited.

**Accent budget.** Accent appears only in: the rail's top gradient segment (a
2px line), the featured index number, and `hover:text-accent` on links. All are
well under the 5% surface ceiling.

**Decorative exceptions.** The oversized quotation glyph uses the
`text-display-36` token (a real scale token), not a hardcoded size.

## Motion

Entrance animation keeps the existing `riseInLcpSafe` approach with LCP-safe
opacity. Animate per block (left column, right column, footer) with a small
stagger — not per row. No `perspective` transform.

## Files Affected

- `apps/web/src/app/[locale]/(home)/components/SecondScreen.tsx` — restructure
  to the two-column grid + footer; remove the local `FoldCrease`; remove
  `lg:[perspective:800px]`.
- `apps/web/src/app/[locale]/(home)/components/RecentWriting.tsx` — rewrite
  rendering as the rail list with numbered nodes and the borderless featured
  lede; keep data logic; drop `FeaturedPost` and the bordered card.
- `apps/web/src/app/[locale]/(home)/components/BottomSection.tsx` — rewrite as
  the single stacked marginalia column; remove the adaptive column logic; keep
  data hooks, skeletons, and guards.
- New shared `SectionHeading` (eyebrow + heading) — extracted to one definition
  used by both columns; the two old local definitions are removed.

## Out of Scope

- `Hero`, `HomePageTimeLine`, `Windsock`, and other home page sections.
- Data fetching, query keys, and routing.
- The `SocialIcon` component internals.
- The `@yohaku/design-system` package — no token changes are needed.
- i18n message files — no new keys.

## Acceptance Criteria

- The three component files contain no raw `rgba()` literals, no `bg-white/*`,
  no `shadow-[...]` hard shadows, and no `neutral-2`-as-border.
- All color, type, and division values resolve to design-system tokens.
- Two-column layout on `lg`; stacked single column below `lg`.
- Empty-state and loading behavior matches the current implementation.
- Dark mode renders correctly with no manual `dark:` color overrides.
- Lint and typecheck pass for the changed files.
