# Posts Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `/posts` page with featured card header, compact-only list, pure pagination, and inline sort controls.

**Architecture:** Server Component page fetches paginated posts, extracts featured post (pinned or first), renders featured card + sort bar + list items + pagination. All new components are client components except the page itself. Removes loose mode, infinite scroll, and settings FAB.

**Tech Stack:** Next.js 16 App Router, Tailwind CSS v4, next-intl, @mx-space/api-client, RemoveMarkdown

**Spec:** `docs/superpowers/specs/2026-03-17-posts-page-redesign-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `components/modules/post/PostFeaturedCard.tsx` | Featured/pinned post card with cover image, hover lift |
| Create | `components/modules/post/PostListItem.tsx` | Single list item: title+badge → summary → meta row |
| Create | `components/modules/post/PostSortBar.tsx` | Post count + sort text links (client component) |
| Rewrite | `components/modules/post/PostPagination.tsx` | Minimal pagination: ← 第 X 页，共 Y 页 → |
| Rewrite | `app/[locale]/posts/page.tsx` | Server component: fetch, extract featured, render all |
| Update | `components/modules/post/index.ts` | Remove deleted exports, add new ones |
| Update | `messages/zh/common.json` | Add `pinned_label`, `posts_heading`, `posts_total_count`, `sort_latest`, `sort_oldest`, `sort_recently_updated`, `pagination_page_info` |
| Update | `messages/en/common.json` | Same i18n keys in English |
| Delete | `app/[locale]/posts/loader.tsx` | Infinite scroll logic |
| Delete | `components/modules/post/PostItem.tsx` | Old dual-mode items |
| Delete | `components/modules/post/PostItemComposer.tsx` | View mode switching |
| Delete | `components/modules/post/PostItemHoverOverlay.tsx` | Old hover overlay |
| Delete | `components/modules/post/fab/PostsSettingsFab.tsx` | Settings FAB |
| Delete | `components/modules/post/atom.ts` | viewMode atom |

All paths relative to `apps/web/src/`.

---

### Task 1: Add i18n Keys

**Files:**
- Modify: `apps/web/src/messages/zh/common.json`
- Modify: `apps/web/src/messages/en/common.json`

- [ ] **Step 1: Add Chinese i18n keys**

Add these keys to `zh/common.json` (in the appropriate location near existing post-related keys):

```json
"pinned_label": "置顶",
"posts_heading": "文章",
"posts_total_count": "共 {count} 篇",
"sort_latest": "最新",
"sort_oldest": "最早",
"sort_recently_updated": "最近更新",
"pagination_page_info": "第 {current} 页，共 {total} 页"
```

- [ ] **Step 2: Add English i18n keys**

Add these keys to `en/common.json`:

```json
"pinned_label": "Pinned",
"posts_heading": "Posts",
"posts_total_count": "{count} posts",
"sort_latest": "Latest",
"sort_oldest": "Oldest",
"sort_recently_updated": "Recently updated",
"pagination_page_info": "Page {current} of {total}"
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/messages/zh/common.json apps/web/src/messages/en/common.json
git commit -m "feat(i18n): add posts page redesign i18n keys"
```

---

### Task 2: Create PostFeaturedCard Component

**Files:**
- Create: `apps/web/src/components/modules/post/PostFeaturedCard.tsx`

**References:**
- `TranslatedBadge` at `components/modules/translation/TranslatedBadge.tsx` — reuse for translation badge
- `RelativeTime` at `components/ui/relative-time` — reuse for time display
- `NumberSmoothTransition` at `components/ui/number-transition/NumberSmoothTransition` — reuse for counts
- `Link` from `~/i18n/navigation` — i18n-aware link
- `PostListItem` type from `@mx-space/api-client`

- [ ] **Step 1: Create PostFeaturedCard**

```tsx
'use client'

import type { PostListItem } from '@mx-space/api-client'
import clsx from 'clsx'
import { useTranslations } from 'next-intl'
import type { FC } from 'react'
import RemoveMarkdown from 'remove-markdown'

import { TranslatedBadge } from '~/components/modules/translation/TranslatedBadge'
import { NumberSmoothTransition } from '~/components/ui/number-transition/NumberSmoothTransition'
import { RelativeTime } from '~/components/ui/relative-time'
import { Link } from '~/i18n/navigation'

export const PostFeaturedCard: FC<{ data: PostListItem }> = ({ data }) => {
  const t = useTranslations('common')
  const categorySlug = data.category?.slug
  const postLink = `/posts/${categorySlug}/${data.slug}`
  const hasImage = data.images?.length > 0 && data.images[0].src
  const summary =
    data.summary ||
    (data.text
      ? RemoveMarkdown(data.text).slice(0, 150)
      : '')

  return (
    <Link
      href={postLink}
      prefetch={false}
      className={clsx(
        'mt-5 block rounded-md p-5',
        'bg-white/50 border border-black/5',
        'dark:bg-white/5 dark:border-white/5',
        'transition-all duration-250',
        'hover:shadow-[0_2px_16px_rgba(0,0,0,0.05)] hover:-translate-y-px',
      )}
    >
      <div className={clsx('flex gap-4', hasImage && 'lg:flex-row')}>
        <div className="min-w-0 flex-1">
          {!!data.pin && (
            <div className="mb-2 text-[10px] tracking-[1px] text-accent">
              {t('pinned_label')}
            </div>
          )}
          <h2 className="flex items-baseline gap-2 text-[17px] font-medium text-neutral-9">
            <span>{data.title}</span>
            {data.isTranslated && data.translationMeta && (
              <TranslatedBadge translationMeta={data.translationMeta} />
            )}
          </h2>
          {summary && (
            <p className="mt-2 line-clamp-2 text-xs leading-[1.7] text-neutral-5">
              {summary}
            </p>
          )}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-neutral-4">
                <RelativeTime date={data.created} />
              </span>
              {data.category && (
                <>
                  <span className="text-neutral-3">·</span>
                  <span className="text-accent">
                    {data.category.name}
                    {data.tags?.length ? ` / ${data.tags.join(', ')}` : ''}
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2.5 text-[10px] text-neutral-3">
              {!!data.count?.read && (
                <span className="flex items-center gap-1">
                  <i className="i-mingcute-eye-2-line" />
                  <NumberSmoothTransition>
                    {data.count.read}
                  </NumberSmoothTransition>
                </span>
              )}
              {!!data.count?.like && (
                <span className="flex items-center gap-1">
                  <i className="i-mingcute-heart-line" />
                  <NumberSmoothTransition>
                    {data.count.like}
                  </NumberSmoothTransition>
                </span>
              )}
            </div>
          </div>
        </div>
        {hasImage && (
          <div
            className="hidden size-[100px] shrink-0 rounded bg-cover bg-center bg-no-repeat lg:block"
            style={{ backgroundImage: `url(${data.images[0].src})` }}
          />
        )}
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Verify no type errors**

Run: `pnpm --filter @shiro/web exec tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/modules/post/PostFeaturedCard.tsx
git commit -m "feat(posts): create PostFeaturedCard component"
```

---

### Task 3: Create PostListItem Component

**Files:**
- Create: `apps/web/src/components/modules/post/PostListItem.tsx`

**References:**
- Same imports as Task 2
- Layout: title+badge → summary → bottom row (left: time·category, right: reads·likes)
- Hover: card lift (translateY(-1px) + shadow + white bg)

- [ ] **Step 1: Create PostListItem**

```tsx
'use client'

import type { PostListItem as PostListItemType } from '@mx-space/api-client'
import clsx from 'clsx'
import type { FC } from 'react'
import RemoveMarkdown from 'remove-markdown'

import { TranslatedBadge } from '~/components/modules/translation/TranslatedBadge'
import { NumberSmoothTransition } from '~/components/ui/number-transition/NumberSmoothTransition'
import { RelativeTime } from '~/components/ui/relative-time'
import { Link } from '~/i18n/navigation'

export const PostListItem: FC<{ data: PostListItemType }> = ({ data }) => {
  const categorySlug = data.category?.slug
  const postLink = `/posts/${categorySlug}/${data.slug}`
  const summary =
    data.summary ||
    (data.text ? RemoveMarkdown(data.text).slice(0, 80) : '')

  return (
    <Link
      href={postLink}
      prefetch={false}
      className={clsx(
        'block rounded-lg px-4 py-3.5 -mx-4 my-1',
        'transition-all duration-250',
        'hover:bg-white/70 hover:shadow-[0_2px_12px_rgba(0,0,0,0.04),0_0_0_1px_rgba(0,0,0,0.03)] hover:-translate-y-px',
        'dark:hover:bg-white/5',
      )}
    >
      {/* Title + translation badge */}
      <div className="flex items-baseline gap-2">
        <h3 className="text-sm font-medium text-neutral-9">{data.title}</h3>
        {data.isTranslated && data.translationMeta && (
          <TranslatedBadge translationMeta={data.translationMeta} />
        )}
      </div>

      {/* Summary */}
      {summary && (
        <p className="mt-1 line-clamp-1 text-xs leading-normal text-neutral-5">
          {summary}
        </p>
      )}

      {/* Bottom meta row */}
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-neutral-4">
            <RelativeTime date={data.created} />
          </span>
          {data.category && (
            <>
              <span className="text-neutral-3">·</span>
              <span className="text-accent">{data.category.name}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2.5 text-[10px] text-neutral-3">
          {!!data.count?.read && (
            <span className="flex items-center gap-1">
              <i className="i-mingcute-eye-2-line" />
              <NumberSmoothTransition>
                {data.count.read}
              </NumberSmoothTransition>
            </span>
          )}
          {!!data.count?.like && (
            <span className="flex items-center gap-1">
              <i className="i-mingcute-heart-line" />
              <NumberSmoothTransition>
                {data.count.like}
              </NumberSmoothTransition>
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Verify no type errors**

Run: `pnpm --filter @shiro/web exec tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/modules/post/PostListItem.tsx
git commit -m "feat(posts): create PostListItem component"
```

---

### Task 4: Create PostSortBar Component

**Files:**
- Create: `apps/web/src/components/modules/post/PostSortBar.tsx`

**References:**
- `useRouter` from `~/i18n/navigation` — for pushing sort params
- `useSearchParams` from `next/navigation` — read current sort
- `routeBuilder, Routes` from `~/lib/route-builder` — build URL with params

- [ ] **Step 1: Create PostSortBar**

```tsx
'use client'

import clsx from 'clsx'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import type { FC } from 'react'

import { useRouter } from '~/i18n/navigation'

type SortOption = {
  label: string
  sortBy?: string
  orderBy?: string
}

export const PostSortBar: FC<{ totalCount: number }> = ({ totalCount }) => {
  const t = useTranslations('common')
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentSortBy = searchParams.get('sortBy') || ''
  const currentOrderBy = searchParams.get('orderBy') || ''

  const sortOptions: SortOption[] = [
    { label: t('sort_latest') },
    { label: t('sort_oldest'), sortBy: 'created', orderBy: 'asc' },
    { label: t('sort_recently_updated'), sortBy: 'modified', orderBy: 'desc' },
  ]

  const isActive = (option: SortOption) => {
    if (!option.sortBy) return !currentSortBy
    return currentSortBy === option.sortBy && currentOrderBy === option.orderBy
  }

  const handleSort = (option: SortOption) => {
    if (isActive(option)) return
    const params = new URLSearchParams(searchParams.toString())
    params.delete('page') // Reset to page 1 on sort change
    if (option.sortBy) {
      params.set('sortBy', option.sortBy)
      params.set('orderBy', option.orderBy!)
    } else {
      params.delete('sortBy')
      params.delete('orderBy')
    }
    router.push(`/posts${params.toString() ? `?${params.toString()}` : ''}`)
  }

  return (
    <div className="mt-5 flex items-center justify-between border-b border-black/[0.06] pb-3 dark:border-white/[0.06]">
      <span className="text-[11px] text-neutral-4">
        {t('posts_total_count', { count: totalCount })}
      </span>
      <div className="flex gap-4">
        {sortOptions.map((option) => (
          <button
            key={option.label}
            aria-current={isActive(option) ? 'page' : undefined}
            className={clsx(
              'text-[11px] transition-colors',
              isActive(option)
                ? 'font-medium text-accent underline underline-offset-[3px]'
                : 'text-neutral-4 hover:text-accent',
            )}
            onClick={() => handleSort(option)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify no type errors**

Run: `pnpm --filter @shiro/web exec tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/modules/post/PostSortBar.tsx
git commit -m "feat(posts): create PostSortBar component"
```

---

### Task 5: Rewrite PostPagination Component

**Files:**
- Modify: `apps/web/src/components/modules/post/PostPagination.tsx`

- [ ] **Step 1: Rewrite PostPagination**

Replace the entire file content with:

```tsx
'use client'

import type { Pager } from '@mx-space/api-client'
import clsx from 'clsx'
import { useTranslations } from 'next-intl'
import type { FC } from 'react'

import { Link } from '~/i18n/navigation'

export const PostPagination: FC<{
  pagination: Pager
  sortParams?: string
}> = ({ pagination, sortParams }) => {
  const t = useTranslations('common')
  const href = (page: number) => {
    const params = new URLSearchParams(sortParams || '')
    if (page > 1) params.set('page', String(page))
    const qs = params.toString()
    return `/posts${qs ? `?${qs}` : ''}`
  }

  return (
    <nav
      aria-label="Pagination"
      className="mt-7 flex items-center justify-center gap-6"
    >
      {pagination.hasPrevPage ? (
        <Link
          aria-label={t('pagination_prev')}
          className="text-xs text-accent transition-colors hover:text-accent/80"
          href={href(pagination.currentPage - 1)}
        >
          ← {t('pagination_prev')}
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className="text-xs text-neutral-3"
        >
          ← {t('pagination_prev')}
        </span>
      )}

      <span className="text-[11px] text-neutral-4">
        {t('pagination_page_info', {
          current: pagination.currentPage,
          total: pagination.totalPage,
        })}
      </span>

      {pagination.hasNextPage ? (
        <Link
          aria-label={t('pagination_next')}
          className="text-xs text-accent transition-colors hover:text-accent/80"
          href={href(pagination.currentPage + 1)}
        >
          {t('pagination_next')} →
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className="text-xs text-neutral-3"
        >
          {t('pagination_next')} →
        </span>
      )}
    </nav>
  )
}
```

- [ ] **Step 2: Verify no type errors**

Run: `pnpm --filter @shiro/web exec tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/modules/post/PostPagination.tsx
git commit -m "feat(posts): rewrite PostPagination with minimal page info style"
```

---

### Task 6: Rewrite Posts Page

**Files:**
- Modify: `apps/web/src/app/[locale]/posts/page.tsx`

**Logic:**
1. Fetch paginated posts via `definePrerenderPage` (same pattern as current)
2. Extract featured post: find pinned, or take first item; remove from list
3. Only show featured card on page 1
4. Render: page header → featured card → sort bar → list items → pagination
5. Keep `PostTagsFAB`, `SearchFAB`, `BackToTopFAB`
6. Remove `PostsSettingFab`, `PostItemComposer`, `PostLoadMore` imports

- [ ] **Step 1: Rewrite page.tsx**

Replace the entire file content with:

```tsx
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { NormalContainer } from '~/components/layout/container/Normal'
import { PostFeaturedCard } from '~/components/modules/post/PostFeaturedCard'
import { PostListItem } from '~/components/modules/post/PostListItem'
import { PostPagination } from '~/components/modules/post/PostPagination'
import { PostSortBar } from '~/components/modules/post/PostSortBar'
import { PostTagsFAB } from '~/components/modules/post/fab/PostTagsFAB'
import { NothingFound } from '~/components/modules/shared/NothingFound'
import { SearchFAB } from '~/components/modules/shared/SearchFAB'
import { BackToTopFAB } from '~/components/ui/fab'
import { OnlyDesktop } from '~/components/ui/viewport'
import { apiClient } from '~/lib/request'
import { definePrerenderPage } from '~/lib/request.server'

import { PostListDataRevaildate } from './data-revalidate'

interface Props extends LocaleParams {
  lang?: string
  orderBy?: string
  page?: string
  size?: string
  sortBy?: string
}

export const generateMetadata = async (
  props: NextPageParams<{ locale: string }>,
): Promise<Metadata> => {
  const { locale } = await props.params
  const t = await getTranslations({
    namespace: 'common',
    locale,
  })

  return {
    title: t('page_title_posts'),
  }
}

export default definePrerenderPage<Props>()({
  fetcher: async (params) => {
    const { page, size, orderBy, sortBy, lang, locale } = params || {}
    const currentPage = page ? Number.parseInt(page) : 1
    const currentSize = size ? Number.parseInt(size) : 10

    const preferredLang = lang === 'original' ? undefined : lang || locale

    return await apiClient.post.getList(currentPage, currentSize, {
      sortBy: sortBy as any,
      sortOrder: orderBy === 'desc' ? -1 : 1,
      truncate: 150,
      lang: preferredLang,
    })
  },
  Component: async (props) => {
    const { params, fetchedAt } = props
    const { data, pagination } = props.data
    const { page, sortBy, orderBy, locale } = params

    const t = await getTranslations({ namespace: 'common', locale })
    const currentPage = page ? Number.parseInt(page) : 1

    if (!data?.length) {
      return <NothingFound />
    }

    // Extract featured post: pinned first, otherwise first item
    const isFirstPage = currentPage === 1
    let featuredPost = null
    let listItems = data

    if (isFirstPage) {
      const pinnedIndex = data.findIndex((item) => item.pin)
      if (pinnedIndex !== -1) {
        featuredPost = data[pinnedIndex]
        listItems = data.filter((_, i) => i !== pinnedIndex)
      } else {
        featuredPost = data[0]
        listItems = data.slice(1)
      }
    }

    // Build sort params string for pagination links
    const sortParams = new URLSearchParams()
    if (sortBy) sortParams.set('sortBy', sortBy)
    if (orderBy) sortParams.set('orderBy', orderBy)

    return (
      <NormalContainer>
        <PostListDataRevaildate fetchedAt={fetchedAt} />

        {/* Page header */}
        <div className="pt-12 lg:pt-20">
          <div className="text-[10px] uppercase tracking-[4px] text-neutral-4">
            Blog
          </div>
          <h1 className="mt-2.5 text-2xl font-normal text-neutral-9">
            {t('posts_heading')}
          </h1>
        </div>

        {/* Featured card (page 1 only) */}
        {featuredPost && <PostFeaturedCard data={featuredPost} />}

        {/* Sort bar */}
        <PostSortBar totalCount={pagination.total} />

        {/* Post list */}
        <div data-fetch-at={fetchedAt}>
          {listItems.map((item) => (
            <PostListItem data={item} key={item.id} />
          ))}
        </div>

        {/* Pagination */}
        <PostPagination
          pagination={pagination}
          sortParams={sortParams.toString()}
        />

        {/* FABs */}
        <PostTagsFAB />
        <SearchFAB />
        <OnlyDesktop>
          <BackToTopFAB />
        </OnlyDesktop>
      </NormalContainer>
    )
  },
})
```

- [ ] **Step 2: Verify no type errors**

Run: `pnpm --filter @shiro/web exec tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/[locale]/posts/page.tsx
git commit -m "feat(posts): rewrite posts page with featured card and compact list"
```

---

### Task 7: Delete Old Files and Update Exports

**Files:**
- Delete: `apps/web/src/app/[locale]/posts/loader.tsx`
- Delete: `apps/web/src/components/modules/post/PostItem.tsx`
- Delete: `apps/web/src/components/modules/post/PostItemComposer.tsx`
- Delete: `apps/web/src/components/modules/post/PostItemHoverOverlay.tsx`
- Delete: `apps/web/src/components/modules/post/fab/PostsSettingsFab.tsx`
- Delete: `apps/web/src/components/modules/post/atom.ts`
- Modify: `apps/web/src/components/modules/post/index.ts`

- [ ] **Step 1: Delete old files**

```bash
rm apps/web/src/app/\[locale\]/posts/loader.tsx
rm apps/web/src/components/modules/post/PostItem.tsx
rm apps/web/src/components/modules/post/PostItemComposer.tsx
rm apps/web/src/components/modules/post/PostItemHoverOverlay.tsx
rm apps/web/src/components/modules/post/fab/PostsSettingsFab.tsx
rm apps/web/src/components/modules/post/atom.ts
```

- [ ] **Step 2: Update index.ts exports**

Replace `apps/web/src/components/modules/post/index.ts` with:

```ts
export * from './PostActionAside'
export * from './PostCopyright'
export * from './PostFeaturedCard'
export * from './PostListItem'
export * from './PostMetaBar'
export * from './PostOutdate'
export * from './PostPagination'
export * from './PostPinIcon'
export * from './PostRelated'
export * from './PostSortBar'
```

- [ ] **Step 3: Verify no type errors or broken imports**

Run: `pnpm --filter @shiro/web exec tsc --noEmit --pretty 2>&1 | head -40`

Fix any remaining import errors (e.g., if `PostMetaBar` imports from deleted `atom.ts` or `PostTagsFAB` imports from deleted files).

Check `PostMetaBar.tsx` line 20 — it imports `TagDetailModal` from `./fab/PostTagsFAB`. This file still exists (only `PostsSettingsFab.tsx` is deleted). Verify `PostTagsFAB.tsx` does NOT import from `atom.ts` or deleted files.

- [ ] **Step 4: Commit**

```bash
git add -A apps/web/src/app/[locale]/posts/loader.tsx apps/web/src/components/modules/post/PostItem.tsx apps/web/src/components/modules/post/PostItemComposer.tsx apps/web/src/components/modules/post/PostItemHoverOverlay.tsx apps/web/src/components/modules/post/fab/PostsSettingsFab.tsx apps/web/src/components/modules/post/atom.ts apps/web/src/components/modules/post/index.ts
git commit -m "refactor(posts): remove old dual-mode components, settings FAB, and infinite scroll"
```

---

### Task 8: Lint and Verify

**Files:** All modified files

- [ ] **Step 1: Run lint on changed files**

```bash
pnpm --filter @shiro/web lint
```

Fix any lint errors.

- [ ] **Step 2: Verify dev server starts**

```bash
pnpm --filter @shiro/web dev
```

Navigate to `/posts` and verify:
- Page header ("Blog" + "文章") renders
- Featured card shows pinned or first post
- Sort bar shows count and 3 sort links
- List items render with title, summary, meta
- Pagination renders with ← 第 1 页，共 N 页 →
- Hover effect works (card lift)
- FABs present (tags, search, back-to-top)

- [ ] **Step 3: Commit any lint fixes**

```bash
git add -A
git commit -m "fix(posts): lint fixes for posts page redesign"
```
