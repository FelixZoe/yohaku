# Timeline & List Pages Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the old dot-and-line timeline with a modern thin-line + hover-accent design across all list pages.

**Architecture:** Replace `.shiro-timeline` CSS, create two new components (`TimelineListItem`, `TimelineYearGroup`), update 5 page files to use them. Two home page files (`ActivityPostList`, `ActivityRecent`) also use the `.shiro-timeline` class and will inherit the new CSS automatically.

**Tech Stack:** Next.js App Router, Tailwind CSS v4, Motion (Framer Motion), TanStack Query

**Spec:** `docs/superpowers/specs/2026-03-14-timeline-list-redesign.md`

---

## Task 1: Replace `.shiro-timeline` CSS

**Files:**
- Modify: `apps/web/src/styles/layer.css:60-114`

- [ ] **Step 1: Replace the `.shiro-timeline` block**

Replace lines 60-114 (the old dot-and-line styles) with the new thin-line styles. Keep lines 18-58 (link underline animation) untouched.

Old code (lines 60-114):
```css
  .shiro-timeline {
    position: relative;
    /* ... all content through the closing brace at line 114 */
  }
```

New code:
```css
  .shiro-timeline {
    position: relative;
    border-left: 1px solid var(--color-border);
    margin-left: 4px;
    list-style: none;

    @apply min-w-0 flex-1;

    & > li {
      position: relative;
      padding: 9px 0 9px 24px;
      margin-left: -1px;
      border-left: 2px solid transparent;
      transition: border-color 0.2s, background 0.2s;
    }

    & > li:hover {
      border-left-color: var(--color-accent);
      background: linear-gradient(
        90deg,
        color-mix(in oklch, var(--color-accent) 4%, transparent),
        transparent 70%
      );
    }

    & a {
      line-height: 1.6;
    }
  }
```

- [ ] **Step 2: Verify lint passes**

Run: `pnpm --filter @shiro/web lint`

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/styles/layer.css
git commit -m "refactor(styles): replace shiro-timeline dot-line with thin-line + hover accent"
```

---

## Task 2: Create `TimelineListItem` component

**Files:**
- Create: `apps/web/src/components/ui/list/TimelineListItem.tsx`

- [ ] **Step 1: Create the component**

```tsx
import clsx from 'clsx'

import { SolidBookmark } from '~/components/icons/bookmark'
import { PeekLink } from '~/components/modules/peek/PeekLink'
import { Link } from '~/i18n/navigation'

interface TimelineListItemProps {
  date: Date
  label: string
  href: string
  meta?: string[]
  dateFormat?: 'MM-DD' | 'YYYY-MM-DD'
  important?: boolean
  id?: string
  peek?: boolean
  onBookmarkClick?: () => void
  className?: string
}

export const TimelineListItem = ({
  date,
  label,
  href,
  meta,
  dateFormat = 'YYYY-MM-DD',
  important,
  id,
  peek,
  onBookmarkClick,
  className,
}: TimelineListItemProps) => {
  const LinkComponent = peek ? PeekLink : Link

  const formattedDate =
    dateFormat === 'MM-DD'
      ? Intl.DateTimeFormat('en-us', {
          month: '2-digit',
          day: '2-digit',
        }).format(date)
      : Intl.DateTimeFormat('en-ca', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(date)

  return (
    <li
      className={clsx('flex items-center justify-between', className)}
      data-id={id}
    >
      <span className="flex min-w-0 shrink items-center gap-3.5">
        <span
          className={clsx(
            'shrink-0 text-xs tabular-nums text-neutral-10/40',
            'group-hover/timeline-item:text-accent',
          )}
          style={{ width: dateFormat === 'MM-DD' ? '3rem' : '4.5rem' }}
        >
          {formattedDate}
        </span>
        <LinkComponent className="min-w-0 truncate text-sm text-neutral-10/70" href={href}>
          <span className="min-w-0 truncate">{label}</span>
        </LinkComponent>
        {important && (
          <SolidBookmark
            className="ml-0.5 shrink-0 cursor-pointer text-red-500"
            onClick={onBookmarkClick}
          />
        )}
      </span>
      {meta && meta.length > 0 && (
        <span className="hidden shrink-0 text-[11px] text-neutral-10/30 lg:inline">
          {meta.join(' / ')}
        </span>
      )}
    </li>
  )
}
```

Note: The `group-hover/timeline-item:text-accent` class won't work with pure CSS hover on the `<li>` from the `.shiro-timeline` styles. Instead, add hover color change to the CSS. Update the date span to just use a static class, and handle hover via CSS:

Actually, the hover accent on date requires CSS since the hover is on the `<li>`. Add to the `.shiro-timeline` CSS in layer.css:

```css
& > li:hover .timeline-date {
  color: var(--color-accent);
}

& > li:hover .timeline-title {
  font-weight: 500;
  color: var(--color-neutral-10);
}
```

So the component uses `.timeline-date` and `.timeline-title` classes instead of Tailwind group-hover.

**Revised component:**

```tsx
import clsx from 'clsx'

import { SolidBookmark } from '~/components/icons/bookmark'
import { PeekLink } from '~/components/modules/peek/PeekLink'
import { Link } from '~/i18n/navigation'

interface TimelineListItemProps {
  date: Date
  label: string
  href: string
  meta?: string[]
  dateFormat?: 'MM-DD' | 'YYYY-MM-DD'
  important?: boolean
  id?: string
  peek?: boolean
  onBookmarkClick?: () => void
  className?: string
}

export const TimelineListItem = ({
  date,
  label,
  href,
  meta,
  dateFormat = 'YYYY-MM-DD',
  important,
  id,
  peek,
  onBookmarkClick,
  className,
}: TimelineListItemProps) => {
  const LinkComponent = peek ? PeekLink : Link

  const formattedDate =
    dateFormat === 'MM-DD'
      ? Intl.DateTimeFormat('en-us', {
          month: '2-digit',
          day: '2-digit',
        }).format(date)
      : Intl.DateTimeFormat('en-ca', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(date)

  return (
    <li
      className={clsx('flex items-center justify-between', className)}
      data-id={id}
    >
      <span className="flex min-w-0 shrink items-center gap-3.5">
        <span
          className="timeline-date shrink-0 text-xs tabular-nums text-neutral-10/40 transition-colors duration-200"
          style={{ width: dateFormat === 'MM-DD' ? '3rem' : '4.5rem' }}
        >
          {formattedDate}
        </span>
        <LinkComponent
          className="timeline-title min-w-0 truncate text-sm text-neutral-10/70 transition-[font-weight,color] duration-200"
          href={href}
        >
          <span className="min-w-0 truncate">{label}</span>
        </LinkComponent>
        {important && (
          <SolidBookmark
            className="ml-0.5 shrink-0 cursor-pointer text-red-500"
            onClick={onBookmarkClick}
          />
        )}
      </span>
      {meta && meta.length > 0 && (
        <span className="hidden shrink-0 text-[11px] text-neutral-10/30 lg:inline">
          {meta.join(' / ')}
        </span>
      )}
    </li>
  )
}
```

- [ ] **Step 2: Add hover child styles to `.shiro-timeline` CSS**

Append these rules inside the `.shiro-timeline` block in `layer.css`:

```css
    & > li:hover .timeline-date {
      color: var(--color-accent);
    }

    & > li:hover .timeline-title {
      font-weight: 500;
      color: var(--color-neutral-10);
    }
```

- [ ] **Step 3: Verify lint passes**

Run: `pnpm --filter @shiro/web lint`

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/ui/list/TimelineListItem.tsx apps/web/src/styles/layer.css
git commit -m "feat(ui): add TimelineListItem component with hover accent styles"
```

---

## Task 3: Create `TimelineYearGroup` component

**Files:**
- Create: `apps/web/src/components/ui/list/TimelineYearGroup.tsx`

- [ ] **Step 1: Create the component**

```tsx
import type { PropsWithChildren } from 'react'

interface TimelineYearGroupProps {
  year: number
  count: number
}

export const TimelineYearGroup = ({
  year,
  count,
  children,
}: PropsWithChildren<TimelineYearGroupProps>) => (
  <div className="mb-10">
    <div className="mb-5 flex items-baseline gap-3">
      <span className="text-[2.625rem] leading-none font-extralight tracking-tighter text-neutral-10/20">
        {year}
      </span>
      <span className="text-xs text-neutral-10/30">{count} entries</span>
    </div>
    {children}
  </div>
)
```

- [ ] **Step 2: Verify lint passes**

Run: `pnpm --filter @shiro/web lint`

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ui/list/TimelineYearGroup.tsx
git commit -m "feat(ui): add TimelineYearGroup component with large light-weight year header"
```

---

## Task 4: Update timeline page

**Files:**
- Modify: `apps/web/src/app/[locale]/timeline/page.tsx`

- [ ] **Step 1: Refactor the timeline page**

Replace the inline `Item` component and year header markup. Import and use `TimelineListItem` and `TimelineYearGroup`.

Key changes:
1. Remove inline `<m.h4>` year header → use `<TimelineYearGroup>`
2. Remove memo `Item` component → use `<TimelineListItem>` with `dateFormat="MM-DD"`, `peek={true}`
3. Remove `BottomToUpSoftScaleTransitionView` wrapping each year group (the year group component handles spacing)
4. Keep `useJumpTo`, `TimelineProgress`, bookmark/memory logic unchanged

The page should import:
```tsx
import { TimelineListItem } from '~/components/ui/list/TimelineListItem'
import { TimelineYearGroup } from '~/components/ui/list/TimelineYearGroup'
```

In the render, replace the `sortedArr.reverse().map(...)` block:
```tsx
{sortedArr.reverse().map(([year, value]) => (
  <TimelineYearGroup count={value.length} key={year} year={year}>
    <TimelineList>
      {value.map((item) => (
        <TimelineListItem
          key={item.id}
          date={item.date}
          dateFormat="MM-DD"
          href={item.href}
          id={item.id}
          important={item.important}
          label={item.title}
          meta={item.meta}
          peek
          onBookmarkClick={() => {
            const url = new URL(window.location.href)
            url.searchParams.set('memory', 'true')
            router.push(url.href)
          }}
        />
      ))}
    </TimelineList>
  </TimelineYearGroup>
))}
```

Note: `router` needs to be available in the parent scope. Currently `router` is inside the `Item` memo component. Move `const router = useRouter()` to the `TimelinePage` component body.

Also remove unused imports: `m` from motion/react (if no longer used), `memo`, `PeekLink`, `SolidBookmark`.

- [ ] **Step 2: Verify lint passes**

Run: `pnpm --filter @shiro/web lint`

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/[locale]/timeline/page.tsx
git commit -m "refactor(timeline): use TimelineListItem and TimelineYearGroup components"
```

---

## Task 5: Update category page

**Files:**
- Modify: `apps/web/src/app/[locale]/categories/[slug]/page.tsx`

- [ ] **Step 1: Refactor category page**

Replace the inline `<li>` rendering with `TimelineListItem`.

Import:
```tsx
import { TimelineListItem } from '~/components/ui/list/TimelineListItem'
```

Replace the `children.map(...)` block inside `<TimelineList>`:
```tsx
{children.map((child, i) => (
  <BottomToUpTransitionView
    key={child.id}
    delay={700 + 50 * i}
  >
    <TimelineListItem
      date={new Date(child.created)}
      href={routeBuilder(Routes.Post, {
        slug: child.slug,
        category: slug as string,
      })}
      label={child.title}
    />
  </BottomToUpTransitionView>
))}
```

Wait — `BottomToUpTransitionView` with `as="li"` would conflict since `TimelineListItem` renders a `<li>`. Remove the `as="li"` prop. But then the `<BottomToUpTransitionView>` renders a `<div>` inside `<ul>`, which is invalid HTML.

Two options:
- a) Remove `BottomToUpTransitionView` per-item animation
- b) Let `TimelineListItem` not render `<li>` and be wrapped

Better approach: Remove per-item animation wrapper. The `BottomToUpSoftScaleTransitionView` already wraps the entire section. Per-item staggered animation is an enhancement we can drop for cleaner code.

So the final rendering becomes:
```tsx
<TimelineList>
  {children.map((child) => (
    <TimelineListItem
      key={child.id}
      date={new Date(child.created)}
      href={routeBuilder(Routes.Post, {
        slug: child.slug,
        category: slug as string,
      })}
      label={child.title}
    />
  ))}
</TimelineList>
```

Remove unused imports: `BottomToUpTransitionView`, `Link` (if no longer used directly).

- [ ] **Step 2: Verify lint passes**

Run: `pnpm --filter @shiro/web lint`

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/[locale]/categories/[slug]/page.tsx
git commit -m "refactor(categories): use TimelineListItem component"
```

---

## Task 6: Update tag page

**Files:**
- Modify: `apps/web/src/app/[locale]/posts/tag/[name]/page.tsx`

- [ ] **Step 1: Refactor tag page**

Import:
```tsx
import { TimelineListItem } from '~/components/ui/list/TimelineListItem'
```

Replace the `data.sort(...).map(...)` block inside `<TimelineList>`:
```tsx
{data
  .sort(
    (a, b) =>
      new Date(b.created).getTime() - new Date(a.created).getTime(),
  )
  .map((item) => (
    <TimelineListItem
      key={item.id}
      date={new Date(item.created)}
      href={routeBuilder(Routes.Post, {
        category: item.category.slug,
        slug: item.slug,
      })}
      id={item.id}
      label={item.title}
    />
  ))}
```

Remove unused `Link` import if no longer needed.

- [ ] **Step 2: Verify lint passes**

Run: `pnpm --filter @shiro/web lint`

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/[locale]/posts/tag/[name]/page.tsx
git commit -m "refactor(tags): use TimelineListItem component"
```

---

## Task 7: Update topic list page

**Files:**
- Modify: `apps/web/src/app/[locale]/(note-topic)/notes/series/page.tsx`

- [ ] **Step 1: Refactor topic list page**

Import:
```tsx
import { TimelineListItem } from '~/components/ui/list/TimelineListItem'
```

Replace the `data.map(...)` block inside `<TimelineList>`. Note: topics use `item.name` not `item.title`, and `item.slug` for the route:
```tsx
{data.map((item) => (
  <TimelineListItem
    key={item.id}
    date={new Date(item.created)}
    href={routeBuilder(Routes.NoteTopic, {
      slug: item.slug,
    })}
    label={item.name}
  />
))}
```

Remove unused imports: `BottomToUpTransitionView`, `Link`.

- [ ] **Step 2: Verify lint passes**

Run: `pnpm --filter @shiro/web lint`

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/[locale]/(note-topic)/notes/series/page.tsx
git commit -m "refactor(topics): use TimelineListItem component"
```

---

## Task 8: Update topic detail page

**Files:**
- Modify: `apps/web/src/app/[locale]/(note-topic)/notes/(topic-detail)/series/[slug]/page.tsx`

- [ ] **Step 1: Refactor topic detail page**

Import:
```tsx
import { TimelineListItem } from '~/components/ui/list/TimelineListItem'
```

Replace the `notes?.pages.map(...)` block inside `<TimelineList>`:
```tsx
{notes?.pages.map((page) =>
  page.data.map((child) => (
    <TimelineListItem
      key={child.id}
      date={new Date(child.created)}
      href={routeBuilder(Routes.Note, {
        ...getNoteRouteParams(child),
      })}
      label={child.title}
    />
  )),
)}

{hasNextPage && <LoadMoreIndicator onLoading={fetchNextPage} />}
```

Remove unused imports: `BottomToUpTransitionView`, `Link`.

- [ ] **Step 2: Verify lint passes**

Run: `pnpm --filter @shiro/web lint`

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/[locale]/(note-topic)/notes/(topic-detail)/series/[slug]/page.tsx
git commit -m "refactor(topic-detail): use TimelineListItem component"
```

---

## Task 9: Final verification

- [ ] **Step 1: Run full lint**

Run: `pnpm --filter @shiro/web lint`

- [ ] **Step 2: Run build**

Run: `pnpm --filter @shiro/web build`

Verify no type errors or build failures.

- [ ] **Step 3: Visual check**

Start dev server (`pnpm --filter @shiro/web dev`) and verify:
- `/timeline` — large year headers, thin line, hover accent bar
- `/categories/[any-slug]` — thin line list, YYYY-MM-DD dates on left
- `/posts/tag/[any-tag]` — same style
- `/notes/series` — same style
- Home page recent posts/notes sections — thin line style (inherited from CSS change)
