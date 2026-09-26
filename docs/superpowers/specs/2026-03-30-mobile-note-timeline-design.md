# Mobile Note Timeline Design

## Summary

Replace `NoteFooterNavigation` (prev/next links only) with a richer mobile-only footer component inside the Paper container. Combines a typographic prev/next page-number bar with an expandable timeline list in a sheet-style container.

Desktop `NoteTimeline` in `NoteLeftSidebar` remains unchanged.

## Design

### Placement

- Inside Paper, below article content, above existing bottom elements (comments, etc.)
- Mobile only (`OnlyMobile` wrapper)
- Replaces `NoteFooterNavigationBarForMobile`

### Structure (two states)

**State 1 — Collapsed (default):**

```
· · ·                          ← article end mark
─────────────────────────────  ← thin separator line
PREV                    NEXT   ← 9px uppercase letter-spaced labels
深夜的胡思乱想    周末的咖啡馆  ← 13px note titles, truncated

──── 更多笔记 ▾ ────           ← centered divider, clickable
```

**State 2 — Expanded:**

```
· · ·
─────────────────────────────
PREV                    NEXT
深夜的胡思乱想    周末的咖啡馆

──── 更多笔记 ▴ ────           ← arrow flips

┌─────────────────────────┐   ← sheet container (rounded-xl, subtle bg)
│       ━━━ handle ━━━     │
│  ● 春日散策记             │
│  ● 深夜的胡思乱想         │
│  ● 关于写作这件事  ← current (accent highlight)
│  ● 周末的咖啡馆           │
│  ● 夏夜的星空             │
└─────────────────────────┘
```

### Visual Specs

**Page-number bar (prev/next):**
- Top border: 1px `border-neutral-3/50`
- Labels: 9px uppercase, letter-spacing 1.5px, `text-neutral-5`
- Titles: 13px, `text-neutral-8`, single line truncate, max-width 45%
- Left-aligned prev, right-aligned next
- Either side optional (hide if no prev/next exists)

**Expand divider:**
- Horizontal lines: 1px `border-neutral-3/30`
- Text: 10px `text-neutral-5`, letter-spacing 0.5px
- Arrow: 10px `text-accent`
- Entire row is clickable

**Sheet container (timeline list):**
- Background: `bg-neutral-2/50`
- Border: 1px `border-neutral-3/30`, rounded-xl
- Horizontal margin: 12px inset from Paper padding
- Handle bar: 28px wide, 2.5px tall, `bg-neutral-4`, centered, decorative only
- List items: 12px, `text-neutral-6`, 7px vertical padding, 12px horizontal padding
- Dot indicator: 4px circle, `bg-neutral-4`
- Current item: `text-accent`, `bg-accent/7`, dot `bg-accent`
- Animate expand/collapse with Motion (height auto transition)

### Data

- Prev/next: from existing `useCurrentNoteDataSelector` (same as current `NoteFooterNavigation`)
- Timeline list: from `useQuery(['note_timeline', noteId])` (same query as desktop `NoteTimeline`)
- No date display (compact)

### Component Structure

```
NoteFooterNavigationMobile (OnlyMobile)
├── NoteFooterPrevNext        ← page-number bar
└── NoteFooterTimeline        ← expand divider + sheet list
    ├── expand trigger
    └── timeline sheet (collapsible)
        └── NoteTimelineItem (reuse or simplified)
```

### Files to Modify

1. **Create** `apps/web/src/components/modules/note/NoteFooterNavigationMobile.tsx` — new component
2. **Modify** note detail layout/page to render new component instead of `NoteFooterNavigationBarForMobile`
3. **Delete or deprecate** `NoteFooterNavigation` usage on mobile (keep desktop usage if any, otherwise delete entirely)

### Interaction

- Default: collapsed, only prev/next + divider visible
- Tap "更多笔记 ▾": expand sheet with timeline, arrow flips to ▴
- Tap again: collapse
- Tap any timeline item: navigate to that note
- Tap prev/next title: navigate to that note

### Edge Cases

- No prev AND no next: hide prev/next bar entirely, show only expand divider
- No prev only: show next aligned right, left side empty
- No next only: show prev aligned left, right side empty
- Timeline loading: show nothing in sheet until data arrives
- Single note in timeline: still show sheet with one highlighted item
