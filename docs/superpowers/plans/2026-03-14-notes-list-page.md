# Notes List Page Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `/notes` redirect with a timeline-style list page showing notes grouped by month with prev/next pagination.

**Architecture:** Server-rendered page using `definePrerenderPage` pattern. Notes fetched via `apiClient.note.getList()`, grouped by month client-side in a server component. Three new presentational components: timeline list, card, and pagination. Existing layout (3-column grid) is reused as-is — sidebars gracefully return null when no current note is set.

**Tech Stack:** Next.js App Router, Tailwind CSS, `@mx-space/api-client`, `definePrerenderPage`

**Spec:** `docs/superpowers/specs/2026-03-14-notes-list-page-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `apps/web/src/components/modules/note/NoteListTimeline.tsx` | Groups notes by month, renders date + card pairs |
| Create | `apps/web/src/components/modules/note/NoteListCard.tsx` | Single note card (cover, title, meta, excerpt) |
| Create | `apps/web/src/components/modules/note/NoteListPagination.tsx` | Prev/next pagination with diary-style labels |
| Modify | `apps/web/src/app/[locale]/notes/page.tsx` | Replace redirect with list page |

No query definition changes needed — use `apiClient.note.getList()` directly in the fetcher (same pattern as posts page).

---

## Chunk 1: Components + Page

### Task 1: Create NoteListCard

**Files:**
- Create: `apps/web/src/components/modules/note/NoteListCard.tsx`

- [ ] **Step 1: Create the NoteListCard component**

This is a server component (no `'use client'`). It renders a single note as a Paper-like card with optional cover image, title, meta info, and text excerpt.

```tsx
// apps/web/src/components/modules/note/NoteListCard.tsx
import type { NoteModel } from '@mx-space/api-client'
import type { FC } from 'react'

import { Link } from '~/i18n/navigation'
import { buildNotePath } from '~/lib/note-route'

export const NoteListCard: FC<{ note: NoteModel }> = ({ note }) => {
  const coverImage = note.images?.[0]
  const excerpt = note.text?.slice(0, 120)
  const href = buildNotePath(note)

  return (
    <Link href={href} className="block">
      <article className="overflow-hidden rounded-md bg-neutral-1 shadow-perfect perfect-sm border border-neutral-200/70 dark:border-neutral-800 dark:bg-neutral-2 transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-lg">
        {coverImage && (
          <img
            src={coverImage.src}
            alt={note.title}
            className="h-[140px] w-full object-cover"
          />
        )}
        <div className="p-4 lg:px-5">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-base font-semibold text-neutral-9 truncate">
              {note.title}
            </h3>
            <span className="text-xs text-neutral-5 shrink-0 ml-2">
              #{note.nid}
            </span>
          </div>

          <NoteListCardMeta note={note} />

          {excerpt && (
            <p className="text-sm text-neutral-7 leading-relaxed line-clamp-2 mt-2">
              {excerpt}
            </p>
          )}
        </div>
      </article>
    </Link>
  )
}

const NoteListCardMeta: FC<{ note: NoteModel }> = ({ note }) => {
  const parts: string[] = []
  if (note.weather) parts.push(note.weather)
  if (note.mood) parts.push(note.mood)

  if (!parts.length && !note.topic && !note.bookmark) return null

  return (
    <div className="flex items-center gap-1.5 text-xs text-neutral-5 flex-wrap">
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && <span className="mx-0.5">·</span>}
        </span>
      ))}
      {note.topic && (
        <span className="rounded-full bg-accent/10 px-2 py-px text-accent text-[11px]">
          {note.topic.name}
        </span>
      )}
      {note.bookmark && (
        <span className="text-amber-500">🔖</span>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `pnpm --filter @shiro/web exec tsc --noEmit --pretty 2>&1 | grep NoteListCard` or just check the single file with the editor's diagnostics.

---

### Task 2: Create NoteListTimeline

**Files:**
- Create: `apps/web/src/components/modules/note/NoteListTimeline.tsx`

- [ ] **Step 1: Create the NoteListTimeline component**

Groups notes by year-month and renders each group with a month header + date/card pairs.

```tsx
// apps/web/src/components/modules/note/NoteListTimeline.tsx
import type { NoteModel } from '@mx-space/api-client'
import type { FC } from 'react'

import { NoteListCard } from './NoteListCard'

interface MonthGroup {
  label: string
  notes: NoteModel[]
}

function groupNotesByMonth(notes: NoteModel[]): MonthGroup[] {
  const groups: Map<string, NoteModel[]> = new Map()

  for (const note of notes) {
    const date = new Date(note.created)
    const key = `${date.getFullYear()}-${date.getMonth()}`
    const label = `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`

    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(note)
  }

  return Array.from(groups.entries()).map(([key, notes]) => ({
    label: notes.length > 0
      ? `${new Date(notes[0].created).getFullYear()} 年 ${new Date(notes[0].created).getMonth() + 1} 月`
      : key,
    notes,
  }))
}

const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export const NoteListTimeline: FC<{ notes: NoteModel[] }> = ({ notes }) => {
  const groups = groupNotesByMonth(notes)

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.label}>
          <h2 className="mb-4 pb-2 border-b border-neutral-200 dark:border-neutral-800 text-sm text-neutral-5 tracking-wider font-serif">
            {group.label}
          </h2>

          <div className="space-y-4">
            {group.notes.map((note) => {
              const date = new Date(note.created)
              return (
                <div key={note.id} className="flex gap-4 lg:gap-5 items-start">
                  <div className="shrink-0 w-12 pt-3 text-center">
                    <div className="text-3xl font-bold text-neutral-9 leading-none">
                      {date.getDate()}
                    </div>
                    <div className="text-xs text-neutral-5 mt-0.5">
                      {weekdays[date.getDay()]}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <NoteListCard note={note} />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
```

---

### Task 3: Create NoteListPagination

**Files:**
- Create: `apps/web/src/components/modules/note/NoteListPagination.tsx`

- [ ] **Step 1: Create the NoteListPagination component**

Diary-style prev/next buttons. Follows PostPagination pattern but with different labels and styling.

```tsx
// apps/web/src/components/modules/note/NoteListPagination.tsx
import type { Pager } from '@mx-space/api-client'
import type { FC } from 'react'

import { MotionButtonBase } from '~/components/ui/button'
import { Link } from '~/i18n/navigation'

const btnClass =
  'rounded-full border border-neutral-300 dark:border-neutral-700 px-5 py-2 text-sm text-neutral-7 dark:text-neutral-4 hover:border-accent hover:text-accent transition-colors'

const disabledClass =
  'rounded-full border border-neutral-200 dark:border-neutral-800 px-5 py-2 text-sm text-neutral-4 dark:text-neutral-6 cursor-not-allowed opacity-50'

export const NoteListPagination: FC<{ pagination: Pager }> = ({
  pagination,
}) => (
  <section className="mt-10 flex items-center justify-between border-t border-neutral-200 dark:border-neutral-800 pt-6">
    {pagination.hasPrevPage ? (
      <Link href={`/notes?page=${pagination.currentPage - 1}`}>
        <MotionButtonBase className={btnClass} tabIndex={-1}>
          ← 更近的日记
        </MotionButtonBase>
      </Link>
    ) : (
      <span className={disabledClass}>← 更近的日记</span>
    )}

    <span className="text-sm text-neutral-5">
      第 {pagination.currentPage} 页
    </span>

    {pagination.hasNextPage ? (
      <Link href={`/notes?page=${pagination.currentPage + 1}`}>
        <MotionButtonBase className={btnClass} tabIndex={-1}>
          更早的日记 →
        </MotionButtonBase>
      </Link>
    ) : (
      <span className={disabledClass}>更早的日记 →</span>
    )}
  </section>
)
```

---

### Task 4: Rewrite notes/page.tsx

**Files:**
- Modify: `apps/web/src/app/[locale]/notes/page.tsx` (full rewrite)

- [ ] **Step 1: Replace redirect page with list page**

Follow the posts page pattern: `definePrerenderPage` with fetcher calling `apiClient.note.getList()`.

```tsx
// apps/web/src/app/[locale]/notes/page.tsx
import type { Locale } from '~/i18n/config'
import { NoteListPagination } from '~/components/modules/note/NoteListPagination'
import { NoteListTimeline } from '~/components/modules/note/NoteListTimeline'
import { NothingFound } from '~/components/modules/shared/NothingFound'
import { apiClient } from '~/lib/request'
import { definePrerenderPage } from '~/lib/request.server'

interface Props extends LocaleParams {
  page?: string
  lang?: string
}

export default definePrerenderPage<Props>()({
  fetcher: async (params) => {
    const { page, lang, locale } = params || {}
    const currentPage = page ? Number.parseInt(page) : 1
    const preferredLang = lang === 'original' ? undefined : lang || locale

    return await apiClient.note.getList(currentPage, 10, {
      lang: preferredLang,
    })
  },
  Component: async ({ data: { data, pagination } }) => {
    if (!data?.length) {
      return <NothingFound />
    }

    return (
      <div className="min-w-0">
        <NoteListTimeline notes={data} />
        <NoteListPagination pagination={pagination} />
      </div>
    )
  },
})
```

**Note:** The `apiClient.note.getList()` signature may only accept `(page, size)` without options. If so, drop the third argument and omit the `lang` parameter. Check at runtime.

- [ ] **Step 2: Lint changed files**

Run: `pnpm --filter @shiro/web lint` scoped to the 4 files touched.

- [ ] **Step 3: Test locally**

1. `pnpm dev` and visit `http://localhost:2323/notes`
2. Verify timeline renders with month groups and date columns
3. Verify note cards show title, meta, excerpt, and cover images (when present)
4. Verify pagination buttons navigate between pages
5. Verify clicking a card navigates to note detail page
6. Check mobile layout (responsive)
7. Check dark mode

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/modules/note/NoteListCard.tsx \
       apps/web/src/components/modules/note/NoteListTimeline.tsx \
       apps/web/src/components/modules/note/NoteListPagination.tsx \
       apps/web/src/app/\[locale\]/notes/page.tsx
git commit -m "feat(notes): add timeline list page at /notes with month grouping and pagination"
```
