# Timeline & List Pages Redesign

## Summary

Redesign the timeline page and all pages using the `TimelineList` component to a modern, minimal aesthetic. Replace the traditional dot-and-line timeline with a refined hybrid design: large light-weight year headers (timeline page only) + 1px thin vertical line + hover accent bar interaction.

## Affected Pages

| Page | Route | Year Grouping | Rendering |
|------|-------|---------------|-----------|
| Timeline | `/timeline` | Yes | Client |
| Category detail | `/categories/[slug]` | No | Server |
| Tag detail | `/posts/tag/[name]` | No | Server |
| Topic list | `/notes/series` | No | Server |
| Topic detail | `/notes/series/[slug]` | No | Client |

## Visual Design

### Year Header (timeline page only)

- Font size: 3rem (42px), font-weight 200, color `text-neutral-10/20` (light gray)
- Letter-spacing: -2px
- Entry count displayed beside year in 12px muted text
- Spacing: 20px below header, 40px between year groups

### List Items

**Layout change:** All pages adopt a consistent left-to-right layout: `date | title | meta`. This is a deliberate change — category/tag/topic pages previously placed the date on the right side; the new design unifies date placement to the left across all list pages.

**Static state:**
- Container: `border-left: 1px solid var(--color-border)` (uses project's existing `--color-border` token)
- Each item: `border-left: 2px solid transparent` (overlaps the container line via `margin-left: -1px`)
- Padding: 9px vertical, 24px left
- Date: 12px tabular-nums, muted color, fixed width
- Title: 14px, `text-neutral-10/70`
- Meta (right-aligned, desktop only): 11px, very muted. Optional — only used by the timeline page (category/mood/weather). Other pages omit meta.

**Hover state (CSS only):**
- Item `border-left: 2px solid var(--color-accent)`
- Background: `linear-gradient(90deg, color-mix(in oklch, var(--color-accent) 4%, transparent), transparent 70%)`
- Date color changes to accent
- Title: font-weight 500, color deepens

**Date format:**
- Timeline page: `MM-DD` (since year is in the header)
- Other pages: `YYYY-MM-DD` (no year header context)

### Link Styles

The existing `.shiro-timeline a` animated underline styles (layer.css lines 18-58) should be preserved. The hover accent bar and link underline animation are complementary — the bar highlights the row, the underline highlights the link text.

### Dark Mode

No special handling needed — uses existing CSS variables (`--color-accent`, `--color-border`, theme text tokens). The accent color automatically switches between light (浅葱 #33A6B8) and dark (桃 #F596AA) themes.

## Component Architecture

### 1. Replace `.shiro-timeline` CSS (in `layer.css`)

Remove the old dot-and-line styles (lines 60-114). Keep the link styles (lines 18-58) unchanged. Replace with:

```css
.shiro-timeline {
  position: relative;
  border-left: 1px solid var(--color-border);
  margin-left: 4px;
  list-style: none;

  & > li {
    position: relative;
    padding: 9px 0 9px 24px;
    margin-left: -1px;
    border-left: 2px solid transparent;
    transition: border-color 0.2s, background 0.2s;
  }

  & > li:hover {
    border-left-color: var(--color-accent);
    background: linear-gradient(90deg, color-mix(in oklch, var(--color-accent) 4%, transparent), transparent 70%);
  }
}
```

### 2. Keep `TimelineList` component (`TimelineList.tsx`)

No changes needed — it remains a styled `<ul>` wrapper.

### 3. Create `TimelineListItem` component

New shared component for individual list items with consistent layout:

```tsx
// components/ui/list/TimelineListItem.tsx
interface TimelineListItemProps {
  date: Date
  label: string            // title or name — generic to support both posts and topics
  href: string
  meta?: string[]          // right-side meta (desktop only), optional
  dateFormat?: 'MM-DD' | 'YYYY-MM-DD'  // defaults to 'YYYY-MM-DD'
  important?: boolean      // shows bookmark icon; click navigates to ?memory=true (same as current behavior)
  id?: string              // maps to data-id attribute on <li> for jump-to-item feature
  peek?: boolean           // true = PeekLink (hover preview), false = plain Link. Defaults to false.
}
```

Renders a `<li>` with the flex row: `date | link (PeekLink or Link) | meta`.

**Animation integration:** The component renders the `<li>` element directly. Pages that need staggered entry animation should NOT use `<BottomToUpTransitionView as="li">` wrapping `<TimelineListItem>` (which would create nested `<li>`). Instead, `TimelineListItem` accepts a `className` and `style` prop, and the parent page applies motion styles via those props, or the animation is applied at the `<TimelineList>` / year-group level rather than per-item.

### 4. Create `TimelineYearGroup` component

Used only in the timeline page:

```tsx
// components/ui/list/TimelineYearGroup.tsx
interface TimelineYearGroupProps {
  year: number
  count: number
  children: React.ReactNode  // TimelineList with items
}
```

Renders the large light-weight year number + count, followed by children.

## Page Changes

### Timeline page (`/timeline/page.tsx`)

- Replace inline year header markup with `TimelineYearGroup`
- Replace inline `Item` component with `TimelineListItem` (props: `dateFormat="MM-DD"`, `peek={true}`)
- Bookmark icon click behavior preserved: navigates to `?memory=true` URL (carried over from current `Item` component)
- Keep `TimelineProgress`, `useJumpTo`, bookmark/memory logic unchanged

### Category page (`/categories/[slug]/page.tsx`)

- Replace inline `<li>` with `TimelineListItem` (props: `dateFormat="YYYY-MM-DD"`)
- Remove `BottomToUpTransitionView as="li"` wrapper — apply animation at parent level or via `TimelineListItem` className/style
- Date format changes from `MM/DD/YYYY` to `YYYY-MM-DD`
- Date moves from right side to left side (layout unification)

### Tag page (`/posts/tag/[name]/page.tsx`)

- Replace inline `<li>` with `TimelineListItem` (props: `dateFormat="YYYY-MM-DD"`)
- Date format changes from `MM/DD/YY` to `YYYY-MM-DD`
- Date moves from right side to left side (layout unification)

### Topic list (`/notes/series/page.tsx`)

- Replace inline `<li>` with `TimelineListItem` (props: `dateFormat="YYYY-MM-DD"`)
- Map `item.name` to `label` prop (topics use `name` field, not `title`)
- Remove `BottomToUpTransitionView as="li"` wrapper
- Date format changes from `MM/DD/YYYY` to `YYYY-MM-DD`
- Date moves from right side to left side (layout unification)

### Topic detail (`/notes/series/[slug]/page.tsx`)

- Replace inline `<li>` with `TimelineListItem` (props: `dateFormat="YYYY-MM-DD"`)
- Remove `BottomToUpTransitionView as="li"` wrapper
- Date format changes from `MM/DD/YYYY` to `YYYY-MM-DD`
- Date moves from right side to left side (layout unification)
- Keep infinite scroll / `LoadMoreIndicator` — `TimelineListItem` works correctly with dynamically appended pages since each item has a unique `key` from `child.id`

## Files to Modify

1. `apps/web/src/styles/layer.css` — replace `.shiro-timeline` styles (lines 60-114 only; keep lines 18-58 link styles)
2. `apps/web/src/components/ui/list/TimelineList.tsx` — no changes
3. `apps/web/src/components/ui/list/TimelineListItem.tsx` — new file
4. `apps/web/src/components/ui/list/TimelineYearGroup.tsx` — new file
5. `apps/web/src/app/[locale]/timeline/page.tsx` — use new components
6. `apps/web/src/app/[locale]/categories/[slug]/page.tsx` — use `TimelineListItem`
7. `apps/web/src/app/[locale]/posts/tag/[name]/page.tsx` — use `TimelineListItem`
8. `apps/web/src/app/[locale]/(note-topic)/notes/series/page.tsx` — use `TimelineListItem`
9. `apps/web/src/app/[locale]/(note-topic)/notes/(topic-detail)/series/[slug]/page.tsx` — use `TimelineListItem`

## Out of Scope

- `/posts` page (PostItem has its own loose/compact design)
- `/notes` page (NoteListTimeline has card-based design)
- `/thinking`, `/says`, `/projects` pages (different layout paradigms)
- TimelineProgress component (unchanged)
- Jump-to-item animation logic (unchanged)
- Bookmark/memory filtering logic (unchanged, only visual container changes)
