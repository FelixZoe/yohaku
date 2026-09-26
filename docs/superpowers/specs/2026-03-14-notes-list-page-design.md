# Notes List Page Design

## Overview

Add a timeline-style list page at `/notes` replacing the current redirect-to-latest behavior. Notes are presented as diary entries grouped by month, with pagination via prev/next buttons.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Layout | Timeline (month-grouped, date-left, card-right) | Strongest diary/journal feel |
| Pagination | Prev/Next buttons ("更近的日记" / "更早的日记") | Avoids scroll position loss on back-navigation; diary page-turn metaphor |
| URL | `/notes` is the list page | Consistent with `/posts`; natural entry point |
| Per page | 10 notes | Covers ~1-3 months; balanced reading rhythm |
| Cover images | Show when available (top of card) | Visual richness without breaking rhythm for image-less notes |

## Data Fields Per Note Card

- `title` — note title
- `nid` — numeric ID, shown as `#nid`, used in URL
- `created` — date, displayed as large day number + weekday in left column; month as group header
- `mood` — mood indicator (emoji + text)
- `weather` — weather indicator (emoji + text)
- `topic` — series/topic tag (pill badge), if present
- `bookmark` — bookmark indicator, if flagged
- `images[0]` — cover image at card top, if available
- `text` — first ~120 chars as excerpt (2-line clamp)

## Layout Structure

```
┌─────────────────────────────────────────┐
│  [Page Title Area - optional]           │
├─────────────────────────────────────────┤
│  2026 年 3 月                           │
│  ─────────────────────────              │
│                                         │
│  14   ┌──────────────────────────┐      │
│  周六  │ [cover image if present] │      │
│       │ 春日散步随想        #142  │      │
│       │ ☀️ 晴 · 😊 开心 · [日常] 🔖│      │
│       │ 今天出门散步，樱花开了…  │      │
│       └──────────────────────────┘      │
│                                         │
│  12   ┌──────────────────────────┐      │
│  周四  │ 深夜的代码与咖啡    #141 │      │
│       │ 🌙 夜 · 🤔 沉思 · [编程]  │      │
│       │ 重构了一整晚，终于把…    │      │
│       └──────────────────────────┘      │
│                                         │
│  2026 年 2 月                           │
│  ─────────────────────────              │
│  ...                                    │
│                                         │
├─────────────────────────────────────────┤
│  ← 更近的日记    第 1 页   更早的日记 → │
└─────────────────────────────────────────┘
```

## Routing Changes

- **Before**: `/notes` → redirect to `/notes/{latestNid}`
- **After**: `/notes` → notes list page (page 1)
- Pagination via query param: `/notes?page=2`
- `/notes/[id]` remains unchanged

## API

Use existing `apiClient.note.getList(page, size)` which returns `PaginateResult<NoteModel>`. This is the same endpoint used by the admin dashboard's note list.

## Component Structure

```
apps/web/src/app/[locale]/notes/
├── page.tsx              # Server component: fetch paginated notes, render list
└── (note-detail)/
    └── [id]/
        └── page.tsx      # Existing note detail (unchanged)

apps/web/src/components/modules/note/
├── NoteTimeline.tsx      # Existing (sidebar timeline, unchanged)
├── NoteListTimeline.tsx  # NEW: full-page timeline list
├── NoteListCard.tsx      # NEW: individual note card in list
└── NoteListPagination.tsx # NEW: prev/next pagination
```

## Styling

- Note cards use Paper-like styling (white bg, rounded corners, shadow) consistent with existing `Paper` component
- Left date column: large day number (font-weight 700), small weekday text below
- Month group headers: serif font, muted color, bottom border separator
- Cover images: full-width at card top, max-height ~140px, object-fit cover
- Topic tags: pill badge with accent color background
- Pagination buttons: rounded pill style, muted border
- Mobile: date column shrinks, card fills remaining width
- Dark mode: card bg follows existing Paper dark mode tokens

## Edge Cases

- Notes with no mood/weather: meta line shows only available fields
- Notes with no topic: no tag pill
- Notes with no images: card starts with title directly
- First page: "更近的日记" button disabled
- Last page: "更早的日记" button disabled
- Empty state: "暂无日记" message
