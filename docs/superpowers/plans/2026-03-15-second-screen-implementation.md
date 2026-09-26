# Second Screen Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the homepage ActivityScreen with a "折页信纸" (folded letter) layout featuring recent writing, now status, recent comments, and musings sections with an unfold animation.

**Architecture:** Backend expands the `findTop` select projection to include `summary`/`mood`/`weather`. Frontend creates `SecondScreen.tsx` (orchestrator + animation), `RecentWriting.tsx` (upper half), and `BottomSection.tsx` (lower half with NowStatus/RecentLetters/Musings), separated by a fold crease with perspective rotateX unfold animation.

**Tech Stack:** NestJS (mx-core backend), Next.js 16 + React 19, Tailwind CSS v4, Motion (motion/react), TanStack Query, next-intl, react-intersection-observer

**Spec:** `docs/superpowers/specs/2026-03-15-second-screen-redesign-design.md`

**Note on `@mx-space/api-client`:** Shiroi consumes this package from npm. After modifying types in mx-core (Tasks 1-2), you must publish a new version of `@mx-space/api-client` and bump the dependency in Shiroi's `package.json`. Alternatively, use `pnpm link` for local development.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `mx-core/.../aggregate.service.ts` | Expand `findTop` select to include `summary`, `mood`, `weather` |
| `mx-core/.../api-client/models/aggregate.ts` | Add `summary` to `AggregateTopPost`, `mood`/`weather` to `AggregateTopNote` |
| `Shiroi/.../messages/{en,zh,ja}/home.json` | i18n keys for second screen |
| `Shiroi/.../(home)/components/SecondScreen.tsx` | Orchestrator: animation, fold crease, layout composition (~120 lines) |
| `Shiroi/.../(home)/components/RecentWriting.tsx` | Upper half: FeaturedPost + PostRow list (~130 lines) |
| `Shiroi/.../(home)/components/BottomSection.tsx` | Lower half: NowStatus + RecentLetters + Musings (~180 lines) |
| `Shiroi/.../(home)/layout.tsx` | Replace `<ActivityScreen />` with `<SecondScreen />` |

---

## Chunk 1: Backend + i18n

### Task 1: Expand `findTop` select projection in mx-core

**Files:**
- Modify: `/Users/innei/git/innei-repo/mx-core/apps/core/src/modules/aggregate/aggregate.service.ts:101-102`

- [ ] **Step 1: Add `summary`, `mood`, `weather` to select string**

At line 101-102, change the select string from:

```typescript
.select(
  '_id title name slug avatar nid created meta images tags modified contentFormat',
)
```

to:

```typescript
.select(
  '_id title name slug avatar nid created meta images tags modified contentFormat summary mood weather',
)
```

Mongoose ignores fields that don't exist on the model, so adding `summary` (Post-only) and `mood`/`weather` (Note-only) to the same select string is safe.

- [ ] **Step 2: Commit**

```bash
cd /Users/innei/git/innei-repo/mx-core
git add apps/core/src/modules/aggregate/aggregate.service.ts
git commit -m "feat(aggregate): add summary/mood/weather to findTop select"
```

### Task 2: Update API client types

**Files:**
- Modify: `/Users/innei/git/innei-repo/mx-core/packages/api-client/models/aggregate.ts:43-51`

- [ ] **Step 1: Add `summary` to `AggregateTopPost`, `mood`/`weather` to `AggregateTopNote`**

Change lines 43-51 from:

```typescript
export interface AggregateTopNote extends Pick<
  NoteModel,
  'id' | 'title' | 'created' | 'nid' | 'images'
> {}

export interface AggregateTopPost extends Pick<
  PostModel,
  'id' | 'slug' | 'created' | 'title' | 'category' | 'images'
> {}
```

to:

```typescript
export interface AggregateTopNote extends Pick<
  NoteModel,
  'id' | 'title' | 'created' | 'nid' | 'images' | 'mood' | 'weather'
> {}

export interface AggregateTopPost extends Pick<
  PostModel,
  'id' | 'slug' | 'created' | 'title' | 'category' | 'images' | 'summary'
> {}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/innei/git/innei-repo/mx-core
git add packages/api-client/models/aggregate.ts
git commit -m "feat(api-client): add summary/mood/weather to AggregateTop types"
```

### Task 3: Add i18n strings for second screen

**Files:**
- Modify: `/Users/innei/git/innei-repo/Shiroi/apps/web/src/messages/en/home.json`
- Modify: `/Users/innei/git/innei-repo/Shiroi/apps/web/src/messages/zh/home.json`
- Modify: `/Users/innei/git/innei-repo/Shiroi/apps/web/src/messages/ja/home.json`

- [ ] **Step 1: Add English keys**

Add before the closing `}` of `en/home.json`:

```json
"second_recent_writing": "Recent Writing",
"second_now": "Now",
"second_letters": "Letters",
"second_musings": "Musings",
"second_post": "Post",
"second_note": "Note",
"second_reading": "Reading",
"second_listening": "Listening",
"second_watching": "Watching"
```

- [ ] **Step 2: Add Chinese keys**

Add before the closing `}` of `zh/home.json`:

```json
"second_recent_writing": "近期笔墨",
"second_now": "此刻",
"second_letters": "来信",
"second_musings": "碎念",
"second_post": "文章",
"second_note": "笔记",
"second_reading": "在读",
"second_listening": "在听",
"second_watching": "在看"
```

- [ ] **Step 3: Add Japanese keys**

Add before the closing `}` of `ja/home.json`:

```json
"second_recent_writing": "最近の執筆",
"second_now": "今",
"second_letters": "便り",
"second_musings": "つぶやき",
"second_post": "記事",
"second_note": "手記",
"second_reading": "読書中",
"second_listening": "視聴中",
"second_watching": "鑑賞中"
```

- [ ] **Step 4: Commit**

```bash
cd /Users/innei/git/innei-repo/Shiroi
git add apps/web/src/messages/en/home.json apps/web/src/messages/zh/home.json apps/web/src/messages/ja/home.json
git commit -m "feat(i18n): add second screen translation keys"
```

---

## Chunk 2: Frontend — SecondScreen Components

### Task 4: Create RecentWriting.tsx (upper half)

**Files:**
- Create: `/Users/innei/git/innei-repo/Shiroi/apps/web/src/app/[locale]/(home)/components/RecentWriting.tsx`

- [ ] **Step 1: Create RecentWriting.tsx**

```typescript
'use client'

import type { AggregateTopNote, AggregateTopPost } from '@mx-space/api-client'
import { useTranslations } from 'next-intl'
import { useMemo } from 'react'

import { RelativeTime } from '~/components/ui/relative-time'
import { Link } from '~/i18n/navigation'

import { useHomeQueryData } from '../query'
```

**Sub-components (all inline in this file):**

**`SectionHeading`** — shared label used across all sections:
```typescript
const SectionHeading = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-4 text-[9px] uppercase tracking-[4px] text-neutral-400 dark:text-neutral-500 lg:mb-5">
    {children}
  </div>
)
```

**`FeaturedPost`** — first item, card with summary:
- Container: `bg-white/40 dark:bg-white/5 rounded border border-[rgba(200,180,160,0.1)] dark:border-neutral-800 p-5 mb-5 cursor-pointer transition-shadow hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)]`
- Meta line (top): type label (`t('second_post')` or `t('second_note')`) + " · " + `<RelativeTime date={item.created} />` + optional mood/weather for notes (e.g., ` · ☁️ {weather}`)
  - Style: `text-[9px] text-neutral-400 dark:text-neutral-500 mb-1.5`
- Title: `text-base font-serif tracking-[0.5px] text-neutral-700 dark:text-neutral-200 mb-2 leading-[1.4]`
- Summary (conditional, only if `'summary' in item && item.summary`): `text-xs text-neutral-500 dark:text-neutral-400 leading-[1.8]`
- Link: `<Link href={itemUrl}>` wrapping the card. URL logic:
  - Post: `/posts/${item.category?.slug}/${item.slug}`
  - Note: `/notes/${item.nid}`

**`PostRow`** — remaining items as title/date rows:
- Outer: `pb-3 mb-3 border-b border-[rgba(200,180,160,0.1)] dark:border-neutral-800 last:border-0 last:mb-0 last:pb-0`
- Row: `flex justify-between items-baseline`
  - Title: `text-sm text-neutral-700 dark:text-neutral-200 hover:text-accent transition-colors duration-300`
  - Date: `text-[9px] italic text-neutral-400 dark:text-neutral-500 whitespace-nowrap ml-5`
- Below title: `text-[9px] text-neutral-400 dark:text-neutral-500 mt-0.5` — type label. For notes, no category. For posts, show `{t('second_post')} · {category.name}` if category exists, else just `{t('second_post')}`

**`RecentWriting`** main component:
```typescript
export const RecentWriting = () => {
  const t = useTranslations('home')
  const { notes, posts } = useHomeQueryData()

  const items = useMemo(() => {
    type MergedItem =
      | (AggregateTopPost & { type: 'post' })
      | (AggregateTopNote & { type: 'note' })
    const merged: MergedItem[] = [
      ...posts.map((p) => ({ ...p, type: 'post' as const })),
      ...notes.map((n) => ({ ...n, type: 'note' as const })),
    ].sort(
      (a, b) =>
        new Date(b.created).getTime() - new Date(a.created).getTime(),
    )
    return merged.slice(0, 5)
  }, [notes, posts])

  if (!items.length) return null

  const [featured, ...rest] = items

  return (
    <div>
      <SectionHeading>{t('second_recent_writing')}</SectionHeading>
      <FeaturedPost item={featured} />
      {rest.map((item) => (
        <PostRow key={item.id} item={item} />
      ))}
    </div>
  )
}
```

**Skeleton (when data not yet loaded):**
The home data is server-side hydrated via `useHomeQueryData()` (enabled: false, prefetched in layout.tsx), so it will always be available synchronously. No skeleton needed for RecentWriting.

- [ ] **Step 2: Commit**

```bash
cd /Users/innei/git/innei-repo/Shiroi
git add apps/web/src/app/[locale]/'(home)'/components/RecentWriting.tsx
git commit -m "feat(home): add RecentWriting component for upper half"
```

### Task 5: Create BottomSection.tsx (lower half)

**Files:**
- Create: `/Users/innei/git/innei-repo/Shiroi/apps/web/src/app/[locale]/(home)/components/BottomSection.tsx`

- [ ] **Step 1: Create BottomSection.tsx with data hooks and all three sub-components**

```typescript
'use client'

import type { BookMetadata, MediaMetadata, MusicMetadata } from '@mx-space/api-client'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useMemo } from 'react'

import { RelativeTime } from '~/components/ui/relative-time'
import { apiClient } from '~/lib/request'
```

**Data hooks (top of file):**

```typescript
const useRecentlyData = () =>
  useQuery({
    queryKey: ['recently', 'home'],
    queryFn: async () =>
      (await apiClient.recently.getList({ size: 20 })).$serialized,
    staleTime: 5 * 60 * 1000,
  })

const useRecentComments = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['home-activity-recent'],
    queryFn: async () =>
      (await apiClient.activity.getRecentActivities()).$serialized,
    refetchOnMount: true,
    meta: { persist: true },
  })
  return { comments: data?.comment?.slice(0, 3) ?? [], isLoading }
}
```

**`NowStatus`** sub-component:

Props: `{ data, isLoading }` from `useRecentlyData()`

```typescript
const nowItems = useMemo(() => {
  if (!data?.data) return null
  const book = data.data.find((i) => i.type === 'book')
  const music = data.data.find((i) => i.type === 'music')
  const media = data.data.find((i) => i.type === 'media')
  if (!book && !music && !media) return null
  return { book, music, media }
}, [data])
```

- If `isLoading`: show skeleton — 3 lines of `h-4 w-[60-80%] rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse mb-3`
- If `!nowItems && !isLoading`: return `null` (column hidden)
- Book item: `📖` emoji (14px) + title (`text-xs text-neutral-700 dark:text-neutral-200`) + author (`text-[9px] text-neutral-400`). Cast metadata: `(book.metadata as BookMetadata)`
- Music item: `♪` prefix + title + artist from `(music.metadata as MusicMetadata)`
- Media item: title + star rating string from `(media.metadata as MediaMetadata)?.rating` — render as `★` repeated

**`RecentLetters`** sub-component:

Props: `{ comments, isLoading }` from `useRecentComments()`

- If `isLoading`: show skeleton — 2 blocks of `h-16 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse mb-2.5`
- If `!comments.length && !isLoading`: return `null`
- Each comment card:
  - Container: `bg-[rgba(200,180,160,0.05)] dark:bg-neutral-800/30 rounded-[3px] p-3.5 mb-2.5 last:mb-0`
  - Text: `text-xs italic text-neutral-500 dark:text-neutral-400 leading-[1.7] line-clamp-2` — render `comment.text`
  - Attribution: `text-[8px] text-neutral-400 text-right mt-1.5` — `"— {comment.author} · "` + `<RelativeTime date={comment.created} />`

**`Musings`** sub-component:

Props: `{ data, isLoading }` from `useRecentlyData()` (shared)

```typescript
const musings = useMemo(() => {
  if (!data?.data) return []
  return data.data.filter((i) => i.type === 'text').slice(0, 2)
}, [data])
```

- If `isLoading`: show skeleton — 2 lines of `h-12 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse mb-3`
- If `!musings.length && !isLoading`: return `null`
- Each musing:
  - Text: `text-xs italic text-neutral-500/80 dark:text-neutral-400 leading-[1.8] pl-3 border-l-2 border-[rgba(200,180,160,0.15)] dark:border-neutral-700 mb-3.5 last:mb-0`
  - Render `musing.content` wrapped in quotes
- Time label at bottom: `text-[8px] text-neutral-400 mt-2` — `<RelativeTime date={musings[0]?.created} />`

**`BottomSection`** main component:

```typescript
export const BottomSection = () => {
  const t = useTranslations('home')
  const recentlyQuery = useRecentlyData()
  const commentsQuery = useRecentComments()

  // Determine visible columns
  const nowItems = useMemo(() => {
    if (!recentlyQuery.data?.data) return null
    const book = recentlyQuery.data.data.find((i) => i.type === 'book')
    const music = recentlyQuery.data.data.find((i) => i.type === 'music')
    const media = recentlyQuery.data.data.find((i) => i.type === 'media')
    if (!book && !music && !media) return null
    return { book, music, media }
  }, [recentlyQuery.data])

  const musings = useMemo(() => {
    if (!recentlyQuery.data?.data) return []
    return recentlyQuery.data.data.filter((i) => i.type === 'text').slice(0, 2)
  }, [recentlyQuery.data])

  const isLoading = recentlyQuery.isLoading || commentsQuery.isLoading
  const hasNow = !!nowItems
  const hasLetters = commentsQuery.comments.length > 0
  const hasMusings = musings.length > 0
  const hasAny = hasNow || hasLetters || hasMusings

  if (!hasAny && !isLoading) return null

  // Collect visible columns to render dividers correctly
  const columns: React.ReactNode[] = []

  if (hasNow || recentlyQuery.isLoading) {
    columns.push(
      <div key="now" className="flex-1 min-w-0">
        <SectionHeading>{t('second_now')}</SectionHeading>
        <NowStatus data={recentlyQuery.data} isLoading={recentlyQuery.isLoading} />
      </div>
    )
  }

  if (hasLetters || commentsQuery.isLoading) {
    columns.push(
      <div key="letters" className="flex-1 min-w-0">
        <SectionHeading>{t('second_letters')}</SectionHeading>
        <RecentLetters comments={commentsQuery.comments} isLoading={commentsQuery.isLoading} />
      </div>
    )
  }

  if (hasMusings || recentlyQuery.isLoading) {
    columns.push(
      <div key="musings" className="flex-1 min-w-0">
        <SectionHeading>{t('second_musings')}</SectionHeading>
        <Musings data={recentlyQuery.data} isLoading={recentlyQuery.isLoading} />
      </div>
    )
  }

  // Interleave dividers between columns (desktop only)
  const withDividers: React.ReactNode[] = []
  columns.forEach((col, i) => {
    if (i > 0) {
      withDividers.push(
        <div
          key={`divider-${i}`}
          className="hidden lg:block w-px bg-[rgba(200,180,160,0.12)] dark:bg-neutral-800 shrink-0"
        />
      )
    }
    withDividers.push(col)
  })

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
      {withDividers}
    </div>
  )
}
```

Note: `SectionHeading` is imported from `RecentWriting.tsx` (export it from there) or duplicated inline (it's 4 lines, duplication is acceptable).

- [ ] **Step 2: Commit**

```bash
cd /Users/innei/git/innei-repo/Shiroi
git add apps/web/src/app/[locale]/'(home)'/components/BottomSection.tsx
git commit -m "feat(home): add BottomSection with NowStatus, RecentLetters, Musings"
```

### Task 6: Create SecondScreen.tsx (orchestrator + animation)

**Files:**
- Create: `/Users/innei/git/innei-repo/Shiroi/apps/web/src/app/[locale]/(home)/components/SecondScreen.tsx`

- [ ] **Step 1: Create SecondScreen.tsx**

```typescript
'use client'

import { m, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { useInView } from 'react-intersection-observer'

import { ErrorBoundary } from '~/components/common/ErrorBoundary'

import { BottomSection } from './BottomSection'
import { RecentWriting } from './RecentWriting'
```

**`useIsDesktop` hook** (inline):
```typescript
const useIsDesktop = () => {
  const [isDesktop, setIsDesktop] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)')
    setIsDesktop(mql.matches)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])
  return isDesktop
}
```

**`FoldCrease` component** (inline):
```typescript
const FoldCrease = () => (
  <div className="relative mx-[3%] my-7 hidden h-2 lg:block">
    <div className="absolute inset-x-0 top-0.5 h-px bg-gradient-to-r from-transparent via-black/[0.06] to-transparent dark:via-white/[0.06]" />
    <div className="absolute inset-x-0 top-1 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent dark:via-white/[0.03]" />
  </div>
)
```

**`SecondScreen` main component:**

```typescript
export const SecondScreen = () => {
  const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: true })
  const prefersReducedMotion = useReducedMotion()
  const isDesktop = useIsDesktop()

  const isReturning =
    typeof window !== 'undefined' &&
    sessionStorage.getItem('hero-entered') === '1'

  // Skip all animation if reduced motion or returning visit
  const skipAnimation = prefersReducedMotion || isReturning
  const shouldAnimate = inView && !skipAnimation

  // Bottom section: rotateX on desktop, translateY on mobile
  const bottomInitial = skipAnimation
    ? false
    : isDesktop
      ? { opacity: 0, rotateX: -90 }
      : { opacity: 0, y: 12 }
  const bottomAnimate =
    shouldAnimate || isReturning
      ? isDesktop
        ? { opacity: 1, rotateX: 0 }
        : { opacity: 1, y: 0 }
      : undefined

  return (
    <section
      ref={ref}
      className="mx-auto mt-24 max-w-[1800px] px-4 lg:px-12"
      style={{
        background:
          'linear-gradient(180deg, transparent 0%, rgba(243,239,232,0.5) 10%, rgba(241,237,230,0.5) 50%, rgba(243,239,232,0.5) 90%, transparent 100%)',
      }}
    >
      {/* Upper half */}
      <m.div
        initial={skipAnimation ? false : { opacity: 0, y: 16 }}
        animate={
          shouldAnimate || isReturning ? { opacity: 1, y: 0 } : undefined
        }
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <RecentWriting />
      </m.div>

      <FoldCrease />

      {/* Lower half — perspective wrapper for desktop rotateX */}
      <div style={isDesktop ? { perspective: '800px' } : undefined}>
        <m.div
          className="origin-top"
          initial={bottomInitial}
          animate={bottomAnimate}
          transition={{
            duration: 0.9,
            ease: [0.22, 1, 0.36, 1],
            delay: isDesktop ? 0.5 : 0.15,
          }}
        >
          {/* Unfold shadow — desktop only, fades in then out */}
          {isDesktop && (
            <m.div
              className="mx-[8%] h-4"
              style={{
                background:
                  'linear-gradient(180deg, rgba(0,0,0,0.05), transparent)',
              }}
              initial={{ opacity: 0 }}
              animate={
                shouldAnimate ? { opacity: [0, 1, 0] } : { opacity: 0 }
              }
              transition={{ duration: 1.2, delay: 0.6, times: [0, 0.3, 1] }}
            />
          )}

          <ErrorBoundary variant="inline">
            <BottomSection />
          </ErrorBoundary>
        </m.div>
      </div>
    </section>
  )
}
```

**Dark mode background:** The light gradient above uses transparent edges so it blends with the page background. For dark mode, use a CSS class approach:

Add to the `<section>` className: a custom class or inline style that switches in dark mode. Since the spec uses `theme(colors.neutral.900/950)`, use Tailwind's dark variant on a wrapper div or inline the dark gradient:

```typescript
// Alternative: use className instead of style for background
className="... bg-gradient-to-b from-transparent via-[rgba(243,239,232,0.5)] to-transparent dark:via-neutral-900/50"
```

Choose the approach that works best with the existing Tailwind setup.

- [ ] **Step 2: Commit**

```bash
cd /Users/innei/git/innei-repo/Shiroi
git add apps/web/src/app/[locale]/'(home)'/components/SecondScreen.tsx
git commit -m "feat(home): add SecondScreen orchestrator with unfold animation"
```

---

## Chunk 3: Integration + Verification

### Task 7: Wire up SecondScreen in layout

**Files:**
- Modify: `/Users/innei/git/innei-repo/Shiroi/apps/web/src/app/[locale]/(home)/layout.tsx`

- [ ] **Step 1: Replace ActivityScreen import with SecondScreen**

In layout.tsx, change:

```typescript
import { ActivityScreen } from './components/ActivityScreen'
```

to:

```typescript
import { SecondScreen } from './components/SecondScreen'
```

And in the JSX, replace:

```typescript
<ActivityScreen />
```

with:

```typescript
<SecondScreen />
```

- [ ] **Step 2: Commit**

```bash
cd /Users/innei/git/innei-repo/Shiroi
git add apps/web/src/app/[locale]/'(home)'/layout.tsx
git commit -m "feat(home): replace ActivityScreen with SecondScreen in layout"
```

### Task 8: Lint & visual verification

**Files:**
- Check: All new/modified files in `apps/web/src/app/[locale]/(home)/components/`
- Check: `apps/web/src/app/[locale]/(home)/layout.tsx`

- [ ] **Step 1: Run lint on modified files**

```bash
cd /Users/innei/git/innei-repo/Shiroi
pnpm --filter @shiro/web lint
```

Fix any lint errors found.

- [ ] **Step 2: Visual verification**

Start dev server:

```bash
pnpm --filter @shiro/web dev
```

Check at http://localhost:2323:

1. **Upper half:** featured post card renders with title, summary (if available), metadata (type, date, mood/weather for notes)
2. **Post rows:** remaining posts show as title/date rows with dividers, hover changes title to accent color
3. **Fold crease:** visible on desktop as subtle double-line, hidden on mobile
4. **Bottom section:** columns render based on available data; missing data columns are hidden; remaining columns fill space
5. **Skeleton states:** NowStatus/RecentLetters/Musings show pulse skeletons while loading
6. **Unfold animation (desktop):** scroll into view → upper half fades in, then lower half rotates from fold crease with temporary shadow
7. **Mobile:** linear vertical flow, no crease, all sections fade-in with stagger
8. **Dark mode:** background gradient, card backgrounds, text colors, fold crease all switch correctly
9. **Return visit:** refresh page → animations skip, content shows immediately
10. **Reduced motion:** with `prefers-reduced-motion: reduce` → no animations, all content visible immediately

- [ ] **Step 3: Fix any issues and commit**

```bash
git add -u
git commit -m "fix(home): lint fixes and visual polish for SecondScreen"
```
