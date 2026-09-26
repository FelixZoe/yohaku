# Home Timeline Redesign — Horizontal Year Rail

## Context

The homepage's `HomePageTimeLine` section (title key `timeline_title`, currently "笔耕不辍")
renders a tinted rounded card containing up to 4 season columns, each listing up to 8 article
titles — as many as 32 dense links. It is the highest-information-density block on the
homepage and reads as an "information wall," conflicting with the site's 余白 (negative-space)
design intent.

This redesign converts the section from a **content list** into an **ambient "year in
review"** section: it visualizes the *rhythm* of a year's writing and surfaces the current
season's latest piece, delegating the full browsable list to the existing `/timeline` page.

This was chosen via brainstorming over three alternatives (decompressed 4-column list;
vertical seasonal stack; ambient rail). The "ambient" route was explicitly selected — the
section is no longer required to expose many clickable titles on the homepage.

## Goals

- Eliminate the dense 4-column title wall.
- Preserve a sense of the year's writing rhythm and the four-season identity.
- Keep the section visually consistent with the adjacent `SecondScreen` — no width step.
- Keep the section short, calm, and full-width.

## Non-goals

- No changes to `Hero`, `SecondScreen` (RecentWriting / Musings / Letters), or `Windsock`.
- No changes to the `/timeline` page.
- No new API endpoints — reuse existing data.

## Design

### Function

Ambient section. Shows the year's writing rhythm plus the current-season latest post. The
full list lives at `/timeline`.

### Data

- Source: `apiClient.activity.getLastYearPublication()` → `{ posts, notes }`. Unchanged,
  still a client-side `useQuery(['home-timeline', locale], ...)`.
- Merge posts + notes into a single item list: `{ id, title, createdAt, href, type }`.
  - `href` built via the existing `buildItemHref` logic (`Routes.Post` / `Routes.Note` +
    `getNoteRouteParams`).
- Rail time axis spans from the earliest to the latest `createdAt` in the dataset (~1 year).
  Each item maps to a fractional position `0..1` along the axis by `createdAt`.
- Season grouping keeps the existing `getSeasonFromMonth` logic plus the winter
  year-boundary handling (`adjustedYear`). The mobile layout groups items by
  `${adjustedYear}-${season}`.
- Empty dataset (`yearData` missing or 0 items) → render nothing (`return null`), same as
  the current component.
- Drop the "merge small seasons (< 3 items)" logic — that was a column-layout concern; the
  rail and mini-rails show seasons as-is.

### Desktop layout — Horizontal Year Rail

- Container: `mx-auto max-w-[1400px]` keeping the current horizontal padding rhythm and the
  `mt-16` top spacing. No card background, no rounded box, no column dividers.
- Title: reuse `timeline_title`, centered, current eyebrow style (uppercase, tracked,
  `text-neutral-6`).
- Rail:
  - A 1px horizontal line (`bg-border`) spanning the content width.
  - The current-season segment of the line is tinted with `--color-accent` at low opacity.
  - Each item is a dot, absolutely positioned at `left: <fraction>%`, vertically centered
    on the line.
  - Current-season dots use accent color; other dots use a neutral tier (neutral-5/6).
  - Each dot is a `<Link>` to the item's `href`, keyboard-focusable, with `aria-label` set
    to the title.
  - Hover or focus on a dot reveals a tooltip above it: title + month. The tooltip must
    clamp within the section's horizontal bounds (clamp `translateX` near the edges).
  - A "今" marker (`timeline_season_current`) sits at the current-date position on the axis.
- Season labels: a row beneath the rail — four labels via `timeline_season_{spring,summer,
  autumn,winter}`, each centered within its season's axis range. The current season label
  uses accent color.
- Default caption: one centered line beneath the rail/labels — `timeline_latest` ("近作")
  followed by the most recent item's title rendered as a link. This is the always-visible
  content anchor shown when no dot is hovered.
- Footer: `timeline_year_total` ("本年 N 篇") plus a "翻阅完整时间线 →" link
  (`timeline_view_all`) to `/timeline`.
- Entrance animation: the rail line draws in (scaleX) and dots fade in staggered. Gentle,
  following the existing LCP-safe `motion` patterns; opacity-led, no layout-shifting
  transforms.

### Mobile layout — Stacked Seasonal Mini-Rails

- Shown below the `lg` breakpoint (`lg:hidden`); the desktop rail is `hidden lg:block`,
  matching the dual-layout pattern already in this file.
- Title: same as desktop.
- For each season present in the dataset (ordered oldest → newest), one row:
  - Header line: season name (left) + item count (right, e.g. "5 篇").
  - A mini-rail beneath: a short 1px line with dots for that season's items, positioned
    within that season's own date range.
  - A small, faint year hint, e.g. "2025" / "2025–26".
- Current-season row:
  - Season name suffixed with "· 本季", accent-colored.
  - Mini-rail line and dots accent-colored; a "今" marker at the end.
  - One extra line beneath: `timeline_latest` + the most recent item's title.
- Each season row is a single `<Link>` to `/timeline` (the whole row is tappable). Mini-rail
  dots are decorative (`aria-hidden`) — not individually tappable, since they are too dense
  at mobile width.
- Footer: same as desktop.

### Interaction degradation

- Desktop: mouse hover / keyboard focus reveals the per-dot tooltip; clicking a dot
  navigates to that post.
- Mobile: no hover; the per-row link to `/timeline` is the entry point; dots convey rhythm
  only.

## Files & Changes

- **Rewrite** `apps/web/src/app/[locale]/(home)/components/HomePageTimeLine.tsx`:
  - Two layout branches (desktop rail / mobile mini-rails) using the existing `hidden lg:*`
    pattern.
  - Keep / adapt helpers: `getSeasonFromMonth`, `buildItemHref`, `formatMonth`, the winter
    year-boundary logic.
  - New pure helpers: axis-fraction for a date within a range; per-season date ranges. If
    the file approaches the project size/clarity limit, extract the pure data helpers into a
    sibling module (e.g. `home-timeline.utils.ts`).
- **Edit** `apps/web/src/styles/animation.css`: remove the `tl-scroll-*` rules
  (container / title / divider / col / footer). Leave `ws-scroll-*` (Windsock) untouched.
- **Edit** i18n `home.json` for all five locales (`zh`, `zh-TW`, `en`, `ja`, `ko`):
  - Add `timeline_view_all` ("翻阅完整时间线" / locale equivalents).
  - Add `timeline_latest` ("近作" / locale equivalents).
  - `timeline_more` is no longer used by this component. Verify whether the `/timeline` page
    still references it; only remove it if nothing else uses it — do not delete blindly.

## Testing / Verification

- Lint + typecheck the modified files only (not the whole project).
- Manual, desktop width: rail renders; dots positioned by date; hover/focus tooltip works
  and clamps at edges; current season tinted; "今" marker placed; caption shows the latest
  post; footer link navigates to `/timeline`.
- Manual, mobile width: stacked mini-rails render; current season accented with the latest
  line; each row links to `/timeline`.
- Edge cases: zero items (section hidden); items in only one season; multiple items on the
  same day (dots overlap — acceptable for an ambient visualization).
- Dark mode: accent and neutral tiers invert correctly; no card background remains.

## Resolved decisions

- **Featured / larger dots**: dropped. All dots have equal weight; only current-season
  tinting distinguishes them. (The mockup's larger dots were illustrative; "featured" would
  need a data definition that does not exist.)
- **Tooltip vs caption**: keep both — the tooltip is the discoverable hover affordance
  attached to each dot; the caption line is the static default content anchor.
- **Mobile per-dot tap**: not supported — the season-row link replaces it.
- **Scope**: timeline section only. The rail keeps the full `max-w-[1400px]` width, so it
  stays edge-aligned with `SecondScreen` and no other section needs to change.
