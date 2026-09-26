# Category & Tag Detail Page Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `TimelineSpineLayout` on `/categories/[slug]` and `/posts/tag/[name]` with an editorial layout that has its own asymmetric structure (rich category, lite tag), per-page accent gradient, year-grouped rows with stagger entrance, and small backend enrichment in mx-core to provide the data needed.

**Architecture:** Two-repo change — mx-core enriches `findCategoryPost` / `findArticleWithTag` and adds `getCategoryTagsSum`; the api-client package types follow; Yohaku rewrites two pages and introduces a new `components/modules/category/*` module plus a shared `BackToTop` extracted from `/timeline`. No DB schema migration. Spec unit tests are out of scope per the spec; verification leans on type-check, lint, the existing i18n usage test, mx-core's existing test suite, and a fixed manual smoke matrix.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS v4 (CSS-first), `next-intl`, Jotai, TanStack Query (server-component fetcher path), `@mx-space/api-client`, mx-core (NestJS + Mongoose + Typegoose).

**Source spec:** `docs/superpowers/specs/2026-04-30-category-tag-detail-design.md`

---

## File Structure

### mx-core (`/Users/innei/git/innei-repo/mx-core`)

| Path | Action | Purpose |
| --- | --- | --- |
| `apps/core/src/modules/category/category.service.ts` | Modify | Expand `findCategoryPost` select; rewrite `findArticleWithTag` mapping; add `getCategoryTagsSum` |
| `apps/core/src/modules/category/category.controller.ts` | Modify | `getCategoryById` attaches `tagsSum` to response |
| `packages/api-client/models/category.ts` | Modify | Extend `CategoryWithChildrenModel` `Pick<>`; add `tagsSum` field; add tag-detail response type |
| `packages/api-client/controllers/category.ts` | Modify | Update `getTagByName` return type; (no logic change) |
| `packages/api-client/__tests__/controllers/category.test.ts` | Modify | Update mock fixtures so they include the new fields |

### Yohaku/apps/web (`/Users/innei/git/innei-repo/Yohaku`)

| Path | Action | Purpose |
| --- | --- | --- |
| `apps/web/package.json` | Modify | Bump `@mx-space/api-client` version |
| `apps/web/src/components/ui/back-to-top/BackToTop.tsx` | Create | Shared component extracted from `/timeline` |
| `apps/web/src/app/[locale]/timeline/page.tsx` | Modify | Replace inline `TimelineFooterBackToTop` with new shared `BackToTop` |
| `apps/web/src/components/modules/category/HeroFrame.tsx` | Create | Private shared header skeleton |
| `apps/web/src/components/modules/category/CategoryHero.tsx` | Create | Category-specific hero |
| `apps/web/src/components/modules/category/TagHero.tsx` | Create | Tag-specific hero |
| `apps/web/src/components/modules/category/PinnedFeatureBlock.tsx` | Create | PINNED featured render |
| `apps/web/src/components/modules/category/YearAnchor.tsx` | Create | Year marker block |
| `apps/web/src/components/modules/category/CategoryRow.tsx` | Create | Single list row |
| `apps/web/src/components/modules/category/CategoryRowList.tsx` | Create | Year-grouped row list with stagger |
| `apps/web/src/components/modules/category/SubTagChips.tsx` | Create | Bottom chips on category page |
| `apps/web/src/components/modules/category/CategoryCrossChips.tsx` | Create | Bottom chips on tag page |
| `apps/web/src/components/modules/category/EmptyCategoryState.tsx` | Create | Empty state for 0-children category |
| `apps/web/src/app/[locale]/categories/[slug]/page.tsx` | Rewrite | Full rewrite using new components |
| `apps/web/src/app/[locale]/categories/[slug]/layout.tsx` | Modify | Update metadata title |
| `apps/web/src/app/[locale]/categories/[slug]/api.tsx` | (no change) | Already calls `getCategoryByIdOrSlug` — types upgrade automatically |
| `apps/web/src/app/[locale]/posts/tag/[name]/page.tsx` | Rewrite | Full rewrite using new components |
| `apps/web/src/app/[locale]/posts/tag/[name]/layout.tsx` | Create | New layout file with `generateMetadata` and container |
| `apps/web/src/messages/en/post.json` | Modify | Drop 4 keys, add 9; `category_empty` text update |
| `apps/web/src/messages/zh/post.json` | Modify | Same |
| `apps/web/src/messages/zh-TW/post.json` | Modify | Same |
| `apps/web/src/messages/ja/post.json` | Modify | Same |
| `apps/web/src/messages/ko/post.json` | Modify | Same |
| `apps/web/src/messages/en/common.json` | Modify | Add `entries_count` |
| `apps/web/src/messages/zh/common.json` | Modify | Same |
| `apps/web/src/messages/zh-TW/common.json` | Modify | Same |
| `apps/web/src/messages/ja/common.json` | Modify | Same |
| `apps/web/src/messages/ko/common.json` | Modify | Same |
| `apps/web/src/messages/message-usage.test.ts` | Modify | Update `dynamicKeyAllowlist.post` |

---

## A note on TDD scope

The spec explicitly excludes new component-level unit tests for the frontend. Verification at the React layer therefore relies on:
- `pnpm --filter @yohaku/web type-check` after each component
- `pnpm --filter @yohaku/web lint`
- `pnpm --filter @yohaku/web test` (runs the existing `message-usage.test.ts`)
- A scripted manual smoke matrix at the end (Task 17)

For mx-core, the category module currently has **no spec tests** in `apps/core/test/src/modules/`. We do not introduce new ones — we update the api-client mock fixtures (which act as the contract test) and rely on `pnpm test` not regressing.

---

# Phase A — mx-core enrichment

> Repo: `/Users/innei/git/innei-repo/mx-core`. All Phase A tasks happen there.

## Task 1: Enrich `findCategoryPost` and `findArticleWithTag` in mx-core service

**Files:**
- Modify: `apps/core/src/modules/category/category.service.ts:94-128`

- [ ] **Step 1: Replace `findArticleWithTag` and `findCategoryPost` with the enriched versions**

In `apps/core/src/modules/category/category.service.ts`, replace the existing `findArticleWithTag` (lines ~94-118) with:

```ts
async findArticleWithTag(
  tag: string,
  condition: QueryFilter<DocumentType<PostModel>> = {},
): Promise<null | any[]> {
  const posts = await this.postService.model
    .find(
      {
        tags: tag,
        ...condition,
      },
      undefined,
      { lean: true },
    )
    .populate('category')
  if (posts.length === 0) {
    throw new CannotFindException()
  }
  return posts.map(
    ({
      _id,
      title,
      slug,
      category,
      created,
      modified,
      summary,
      tags,
      pin,
      count,
    }) => ({
      _id,
      title,
      slug,
      category: omit(category, ['count', '__v', 'created', 'modified']),
      created,
      modified,
      summary,
      tags,
      pin,
      count: count ? { read: count.read, like: count.like } : undefined,
    }),
  )
}
```

And replace `findCategoryPost` (lines ~120-128) with:

```ts
async findCategoryPost(categoryId: string, condition: any = {}) {
  return await this.postService.model
    .find({
      categoryId,
      ...condition,
    })
    .select(
      'title slug created modified summary tags pin count categoryId images',
    )
    .sort({ pin: -1, created: -1 })
    .lean()
}
```

The order change (`{ pin: -1, created: -1 }` instead of `{ created: -1 }`) ensures the pinned post (if any) is at index 0 of `children`, which the frontend will rely on. Adding `.lean()` is not strictly required since callers use `.lean: true` elsewhere, but it keeps the returned shape POJO-flat.

- [ ] **Step 2: Run TypeScript check on mx-core**

Run: `pnpm -C /Users/innei/git/innei-repo/mx-core --filter @mx-space/core typecheck` (if such a script exists) — otherwise `pnpm -C /Users/innei/git/innei-repo/mx-core build` to confirm the file compiles.

If neither script is available, run: `pnpm -C /Users/innei/git/innei-repo/mx-core/apps/core tsc --noEmit`

Expected: clean compile.

- [ ] **Step 3: Do not commit yet — Task 2 + Task 3 belong to the same logical commit**

---

## Task 2: Add `getCategoryTagsSum` to mx-core service & wire it in controller

**Files:**
- Modify: `apps/core/src/modules/category/category.service.ts` (add new method near line ~92)
- Modify: `apps/core/src/modules/category/category.controller.ts:111-136`

- [ ] **Step 1: Add the new aggregation method to `category.service.ts`**

Place this right after `getPostTagsSum` (around line 92), still inside the `CategoryService` class:

```ts
async getCategoryTagsSum(categoryId: string) {
  const data = await this.postService.model.aggregate([
    {
      $match: {
        categoryId: new (this.postService.model.base.Types.ObjectId)(
          categoryId,
        ),
      },
    },
    { $project: { tags: 1 } },
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    { $project: { _id: 0, name: '$_id', count: 1 } },
    { $sort: { count: -1, name: 1 } },
  ])
  return data as Array<{ name: string; count: number }>
}
```

If the `Types.ObjectId` access through `this.postService.model.base` is awkward in this codebase, the equivalent import pattern is:

```ts
import { Types } from 'mongoose'
// ...
{ $match: { categoryId: new Types.ObjectId(categoryId) } },
```

Use whichever pattern matches existing `category.service.ts` imports. The current imports already include `mongoose` types but not `Types` directly — adding `Types` to the import is the cleanest path. So the actual edit at the top of the file is:

```ts
import type { DocumentType, ReturnModelType } from '@typegoose/typegoose'
import { omit } from 'es-toolkit/compat'
import type { QueryFilter } from 'mongoose'
import { Types } from 'mongoose'  // <— add this line
```

And inside the method body, use `new Types.ObjectId(categoryId)`.

- [ ] **Step 2: Update `category.controller.ts → getCategoryById` to attach `tagsSum`**

In `apps/core/src/modules/category/category.controller.ts`, the `getCategoryById` method ends with:

```ts
return { data: { ...res, children } }
```

Replace that final `return` block (lines ~133-135) with:

```ts
const tagsSum = await this.categoryService.getCategoryTagsSum(
  res._id.toHexString(),
)

return { data: { ...res, children, tagsSum } }
```

The change should land between the existing translation logic (`if (lang && children.length) { ... }`) and the `return`.

- [ ] **Step 3: Verify mx-core still compiles**

Run: `pnpm -C /Users/innei/git/innei-repo/mx-core/apps/core tsc --noEmit`

Expected: clean compile.

---

## Task 3: Update api-client types and tests

**Files:**
- Modify: `packages/api-client/models/category.ts:15-17` and add new type
- Modify: `packages/api-client/controllers/category.ts:101-117`
- Modify: `packages/api-client/__tests__/controllers/category.test.ts` (update fixtures around lines 28-117)

- [ ] **Step 1: Extend the category models**

Replace the contents of `packages/api-client/models/category.ts` with:

```ts
import type { BaseModel } from './base'
import type { PostModel } from './post'

export enum CategoryType {
  Category,
  Tag,
}

export interface CategoryModel extends BaseModel {
  type: CategoryType
  count: number
  slug: string
  name: string
}

export type CategoryChildPost = Pick<
  PostModel,
  | 'id'
  | 'title'
  | 'slug'
  | 'modified'
  | 'created'
  | 'summary'
  | 'tags'
  | 'pin'
  | 'count'
  | 'images'
>

export type CategoryWithChildrenModel = CategoryModel & {
  children: CategoryChildPost[]
  /** Aggregated tag-name → post-count for posts under this category. */
  tagsSum?: Array<{ name: string; count: number }>
}

export type CategoryEntries = {
  entries: Record<string, CategoryWithChildrenModel>
}

export interface TagModel {
  count: number
  name: string
}

export type TagDetailPost = Pick<
  PostModel,
  | 'id'
  | 'title'
  | 'slug'
  | 'category'
  | 'created'
  | 'modified'
  | 'summary'
  | 'tags'
  | 'pin'
  | 'count'
>
```

- [ ] **Step 2: Update `getTagByName` to use the new `TagDetailPost` type**

In `packages/api-client/controllers/category.ts`, change the imports and the `getTagByName` body:

Imports near line 12:

```ts
import type {
  CategoryEntries,
  CategoryModel,
  CategoryWithChildrenModel,
  TagDetailPost,
  TagModel,
} from '../models/category'
```

Remove the `import type { PostModel } from '../models/post'` line if `PostModel` is no longer referenced after this edit.

Method body (lines ~106-117):

```ts
async getTagByName(name: string) {
  const res = await this.proxy(name).get<{
    tag: string
    data: TagDetailPost[]
  }>({
    params: {
      tag: 1,
    },
  })

  return res
}
```

- [ ] **Step 3: Update the api-client test fixtures**

In `packages/api-client/__tests__/controllers/category.test.ts`, update the two `GET /categories/:id` fixtures (lines ~30 and ~62) to include the new fields. For each `children` array entry add `summary`, `tags`, `pin`, `count`, `modified`, `images`. For the response object also add `tagsSum`. Example for the slug fixture:

```ts
const mocked = mockResponse('/categories/programming', {
  data: {
    id: '5eb2c62a613a5ab0642f1f7a',
    type: 0,
    count: 2,
    name: '编程',
    slug: 'programming',
    created: '2020-05-06T14:14:02.339Z',
    children: [
      {
        id: '611748895c2f6f4d3ba0d9b3',
        title: 'pageproxy，为 spa 提供初始数据注入',
        slug: 'pageproxy-spa-inject',
        created: '2021-08-14T04:37:29.880Z',
        modified: '2021-08-14T04:37:29.880Z',
        summary: 'A short summary',
        tags: ['spa', 'inject'],
        pin: null,
        count: { read: 100, like: 5 },
        images: [],
      },
      {
        id: '60cffff50ec52e0349cbb29f',
        title: '曲折的 Vue 3 重构后台之路',
        slug: 'mx-space-vue-3',
        created: '2021-06-21T02:56:53.126Z',
        modified: '2021-06-21T02:56:53.126Z',
        summary: 'Refactor journey',
        tags: ['vue3'],
        pin: 'pin-id',
        count: { read: 200, like: 12 },
        images: [],
      },
    ],
    tagsSum: [
      { name: 'spa', count: 1 },
      { name: 'inject', count: 1 },
      { name: 'vue3', count: 1 },
    ],
  },
})
```

Apply the same shape to the by-id fixture (line ~62) verbatim.

For the `/categories/:tagName` fixture (around line 95), update each post entry to include `modified`, `summary`, `tags`, `pin`, `count`. Example:

```ts
const mocked = mockResponse('/categories/react?tag=1', {
  tag: 'react',
  data: [
    {
      id: '607bfcedc98328a0d941a409',
      title: '虚拟列表与 Scroll Restoration',
      slug: 'visualize-list-scroll-restoration',
      category: {
        id: '5eb2c62a613a5ab0642f1f7a',
        type: 0,
        name: '编程',
        slug: 'programming',
      },
      created: '2021-04-18T09:33:33.271Z',
      modified: '2021-04-18T09:33:33.271Z',
      summary: 'A summary',
      tags: ['react', 'scroll'],
      pin: null,
      count: { read: 80, like: 3 },
    },
  ],
})
```

The existing assertions (`expect(data).toEqual(mocked.data)` etc.) will continue to pass because they compare deeply against `mocked` — which now has the new fields too.

- [ ] **Step 4: Run api-client tests**

Run: `pnpm -C /Users/innei/git/innei-repo/mx-core/packages/api-client test`

Expected: all tests pass with the updated fixtures.

- [ ] **Step 5: Build api-client**

Run: `pnpm -C /Users/innei/git/innei-repo/mx-core/packages/api-client build`

Expected: clean build.

---

## Task 4: Run mx-core full test + lint, then commit

**Files:** none (verification + commit step)

- [ ] **Step 1: Lint mx-core**

Run: `pnpm -C /Users/innei/git/innei-repo/mx-core lint`

Expected: clean.

- [ ] **Step 2: Run mx-core tests**

Run: `pnpm -C /Users/innei/git/innei-repo/mx-core test`

Expected: all suites pass. The category module has no spec test, so the only sensitive surface is post / category controller tests (if any) and the api-client controller tests (already covered by Task 3).

- [ ] **Step 3: Commit mx-core changes**

```bash
cd /Users/innei/git/innei-repo/mx-core
git add apps/core/src/modules/category/category.service.ts \
        apps/core/src/modules/category/category.controller.ts \
        packages/api-client/models/category.ts \
        packages/api-client/controllers/category.ts \
        packages/api-client/__tests__/controllers/category.test.ts
git commit -m "$(cat <<'EOF'
feat(category): enrich detail responses with summary/tags/pin/count and tagsSum

Expand findCategoryPost select fields and sort by pin first; rewrite
findArticleWithTag mapping to surface the same enriched fields. Add a new
getCategoryTagsSum aggregation and attach the result to GET /categories/:slug.
api-client types follow with a new CategoryChildPost / TagDetailPost shape and
an optional tagsSum field on CategoryWithChildrenModel; fixtures updated.

Backs design: docs/superpowers/specs/2026-04-30-category-tag-detail-design.md
EOF
)"
```

- [ ] **Step 4: Publish api-client via the `release-api-client` skill**

Invoke the skill `release-api-client` (project skill at `.claude/skills/release-api-client.md`) to handle the full publish flow — pre-flight, `bump <type>`, `npm publish`, push, post-check.

Bump type for this release: **`minor`** — we add a new method (`getCategoryTagsSum`) AND extend exported types. (See the skill's "Picking the bump type" table.)

If 2FA prompts during publish, the skill will surface the `EOTP` failure; ask the user for the 6-digit OTP and the skill's recovery path will retry with `--otp=`.

When the skill reports back, capture the new version number — it goes into Task 5.

---

# Phase B — Yohaku preparation

> Repo: `/Users/innei/git/innei-repo/Yohaku`. All Phase B onwards tasks happen there.

## Task 5: Bump api-client dependency in Yohaku

**Files:**
- Modify: `apps/web/package.json` (api-client version)

- [ ] **Step 1: Update the version pin**

In `apps/web/package.json`, find the `@mx-space/api-client` line and bump to the version reported by the `release-api-client` skill in Task 4 step 4. Example (use the actual version):

```json
"@mx-space/api-client": "^3.7.0",
```

- [ ] **Step 2: Install**

Run: `pnpm -C /Users/innei/git/innei-repo/Yohaku install`

Expected: lockfile updates, `node_modules/@mx-space/api-client` now contains the new types.

- [ ] **Step 3: Verify the new types are available**

Run: `pnpm -C /Users/innei/git/innei-repo/Yohaku --filter @yohaku/web type-check`

Expected: still clean (no consumer is using the new fields yet, but the increased Pick<> shouldn't break anything).

- [ ] **Step 4: Commit**

```bash
cd /Users/innei/git/innei-repo/Yohaku
git add apps/web/package.json pnpm-lock.yaml
git commit -m "chore(deps): bump @mx-space/api-client for category enrichment"
```

---

## Task 6: Extract `BackToTop` shared component, replace `/timeline` inline use

**Files:**
- Create: `apps/web/src/components/ui/back-to-top/BackToTop.tsx`
- Modify: `apps/web/src/app/[locale]/timeline/page.tsx:50-64,328`

- [ ] **Step 1: Create the shared component**

Write the file `apps/web/src/components/ui/back-to-top/BackToTop.tsx`:

```tsx
'use client'

import { useTranslations } from 'next-intl'

import { MotionButtonBase } from '~/components/ui/button'
import { springScrollToTop } from '~/lib/scroller'

export const BackToTop = () => {
  const t = useTranslations('common')

  return (
    <div className="mt-10 flex justify-center border-t border-black/[0.06] pt-6 dark:border-white/[0.06]">
      <MotionButtonBase
        className="inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-neutral-10/55 transition-colors duration-200 hover:bg-black/[0.02] hover:text-neutral-10/85 dark:hover:bg-white/4"
        onClick={springScrollToTop}
      >
        <i className="i-mingcute-arrow-up-circle-line text-base opacity-70" />
        <span>{t('back_to_top')}</span>
      </MotionButtonBase>
    </div>
  )
}
```

- [ ] **Step 2: Replace inline `TimelineFooterBackToTop` in `/timeline`**

In `apps/web/src/app/[locale]/timeline/page.tsx`:

1. Add import at the top with the other component imports:
   ```ts
   import { BackToTop } from '~/components/ui/back-to-top/BackToTop'
   ```
2. Delete the local `TimelineFooterBackToTop` definition (lines ~50-64).
3. Replace the JSX usage (currently `<TimelineFooterBackToTop />` at line ~328) with `<BackToTop />`.

- [ ] **Step 3: Type-check + lint**

Run: `pnpm -C /Users/innei/git/innei-repo/Yohaku --filter @yohaku/web type-check && pnpm -C /Users/innei/git/innei-repo/Yohaku --filter @yohaku/web lint`

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/ui/back-to-top/BackToTop.tsx \
        apps/web/src/app/[locale]/timeline/page.tsx
git commit -m "refactor(back-to-top): extract shared BackToTop, reuse in /timeline"
```

---

# Phase C — New components

## Task 7: Create `HeroFrame` (private hero skeleton)

**Files:**
- Create: `apps/web/src/components/modules/category/HeroFrame.tsx`

- [ ] **Step 1: Write the file**

```tsx
import type { ReactNode } from 'react'

interface HeroFrameProps {
  /** Tiny uppercase label above the number. */
  label: string
  /** Big extralight number — the count. */
  count: number
  /** Subtitle text rendered next to the number. */
  subtitle: string
  /** Title rendered as h1. */
  title: ReactNode
}

export const HeroFrame = ({
  label,
  count,
  subtitle,
  title,
}: HeroFrameProps) => (
  <header className="text-neutral-10">
    <div className="mb-4 text-[10px] tracking-[4px] uppercase text-neutral-10/55">
      {label}
    </div>
    <div className="mb-2 flex items-baseline gap-3">
      <span className="text-[2.5rem] sm:text-[3.5rem] font-extralight tracking-tight leading-none text-neutral-10/85 tabular-nums">
        {count}
      </span>
      <span className="text-sm text-neutral-10/55">{subtitle}</span>
    </div>
    <h1 className="text-3xl font-medium leading-tight text-neutral-10">
      {title}
    </h1>
    <div className="mt-6 mb-7 h-px w-8 bg-accent/70" />
  </header>
)
```

- [ ] **Step 2: Type-check**

Run: `pnpm -C /Users/innei/git/innei-repo/Yohaku --filter @yohaku/web type-check`

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/modules/category/HeroFrame.tsx
git commit -m "feat(category): add HeroFrame editorial header skeleton"
```

---

## Task 8: Create `CategoryHero`

**Files:**
- Create: `apps/web/src/components/modules/category/CategoryHero.tsx`

- [ ] **Step 1: Write the file**

```tsx
import { useTranslations } from 'next-intl'

import { HeroFrame } from './HeroFrame'

interface CategoryHeroProps {
  /** Total post count under this category. */
  count: number
  /** Category display name. */
  name: string
  /** Earliest post year — used to render "since YYYY" subtitle when applicable. */
  earliestYear?: number
}

export const CategoryHero = ({
  count,
  name,
  earliestYear,
}: CategoryHeroProps) => {
  const t = useTranslations('post')
  const currentYear = new Date().getFullYear()
  const showYear =
    typeof earliestYear === 'number' &&
    earliestYear < currentYear &&
    count > 1

  const subtitle = showYear
    ? t('category_subtitle_with_year', { count, year: earliestYear })
    : t('category_subtitle_count_only', { count })

  return (
    <HeroFrame
      label={t('category_label')}
      count={count}
      subtitle={subtitle}
      title={name}
    />
  )
}
```

- [ ] **Step 2: Type-check + commit**

```bash
pnpm -C /Users/innei/git/innei-repo/Yohaku --filter @yohaku/web type-check
git add apps/web/src/components/modules/category/CategoryHero.tsx
git commit -m "feat(category): add CategoryHero with editorial subtitle composition"
```

---

## Task 9: Create `TagHero`

**Files:**
- Create: `apps/web/src/components/modules/category/TagHero.tsx`

- [ ] **Step 1: Write the file**

```tsx
import { useTranslations } from 'next-intl'

import { HeroFrame } from './HeroFrame'

interface TagHeroProps {
  /** Number of posts associated with this tag. */
  count: number
  /** Tag name (no leading #). */
  name: string
  /** Number of distinct categories these posts span. */
  crossCategoryCount: number
}

export const TagHero = ({ count, name, crossCategoryCount }: TagHeroProps) => {
  const t = useTranslations('post')

  const subtitle =
    crossCategoryCount >= 2
      ? t('tag_subtitle_with_cross', { count, crossCategoryCount })
      : t('tag_subtitle_count_only', { count })

  return (
    <HeroFrame
      label={t('tag_label')}
      count={count}
      subtitle={subtitle}
      title={
        <span className="inline-flex items-baseline gap-1">
          <span className="font-extralight text-accent">#</span>
          <span>{name}</span>
        </span>
      }
    />
  )
}
```

- [ ] **Step 2: Type-check + commit**

```bash
pnpm -C /Users/innei/git/innei-repo/Yohaku --filter @yohaku/web type-check
git add apps/web/src/components/modules/category/TagHero.tsx
git commit -m "feat(category): add TagHero with cross-category subtitle"
```

---

## Task 10: Create `PinnedFeatureBlock`

**Files:**
- Create: `apps/web/src/components/modules/category/PinnedFeatureBlock.tsx`

- [ ] **Step 1: Write the file**

```tsx
import { useTranslations } from 'next-intl'

import { Link } from '~/i18n/navigation'
import { routeBuilder, Routes } from '~/lib/route-builder'

interface PinnedFeatureBlockProps {
  post: {
    id: string
    title: string
    slug: string
    summary?: string | null
    created: string
    count?: { read: number; like: number }
  }
  categorySlug: string
}

export const PinnedFeatureBlock = ({
  post,
  categorySlug,
}: PinnedFeatureBlockProps) => {
  const t = useTranslations('post')
  const tCommon = useTranslations('common')
  const href = routeBuilder(Routes.Post, {
    category: categorySlug,
    slug: post.slug,
  })

  const dateFmt = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(post.created))

  return (
    <section className="mb-6 border-b border-neutral-10/[0.06] pb-6">
      <div className="mb-1.5 text-[9px] tracking-[2px] uppercase text-accent">
        {t('category_pinned_label')}
      </div>
      <Link
        href={href}
        className="group block"
        prefetch={false}
      >
        <h2 className="text-[19px] font-normal leading-snug text-neutral-10 transition-colors duration-200 group-hover:text-accent">
          {post.title}
        </h2>
        {post.summary ? (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-neutral-10/55">
            {post.summary}
          </p>
        ) : null}
        <div className="mt-2 flex items-center gap-2 text-[10px] text-neutral-10/40">
          <span>{dateFmt}</span>
          {post.count?.read ? (
            <>
              <span>·</span>
              <span>
                {post.count.read.toLocaleString()}{' '}
                {tCommon('meta_reads', { count: '' }).trim()}
              </span>
            </>
          ) : null}
        </div>
      </Link>
    </section>
  )
}
```

- [ ] **Step 2: Type-check + commit**

`meta_reads` exists in all 5 `common.json` files (verified). Run:

```bash
pnpm -C /Users/innei/git/innei-repo/Yohaku --filter @yohaku/web type-check
git add apps/web/src/components/modules/category/PinnedFeatureBlock.tsx
git commit -m "feat(category): add PinnedFeatureBlock for editorial featured slot"
```

---

## Task 11: Create `YearAnchor`

**Files:**
- Create: `apps/web/src/components/modules/category/YearAnchor.tsx`

- [ ] **Step 1: Write the file**

```tsx
import { useTranslations } from 'next-intl'

interface YearAnchorProps {
  year: number
  count: number
}

export const YearAnchor = ({ year, count }: YearAnchorProps) => {
  const t = useTranslations('common')

  return (
    <li className="flex items-baseline gap-2.5 pt-5 pb-2 first:pt-1 list-none">
      <span className="text-3xl font-extralight tracking-tight leading-none text-neutral-10/30 tabular-nums">
        {year}
      </span>
      <span className="text-[10px] tracking-wider text-neutral-10/35">
        {t('entries_count', { count })}
      </span>
    </li>
  )
}
```

- [ ] **Step 2: Type-check + commit**

```bash
pnpm -C /Users/innei/git/innei-repo/Yohaku --filter @yohaku/web type-check
git add apps/web/src/components/modules/category/YearAnchor.tsx
git commit -m "feat(category): add YearAnchor block"
```

---

## Task 12: Create `CategoryRow`

**Files:**
- Create: `apps/web/src/components/modules/category/CategoryRow.tsx`

- [ ] **Step 1: Write the file**

```tsx
import { Link } from '~/i18n/navigation'
import { routeBuilder, Routes } from '~/lib/route-builder'

export type CategoryRowMode =
  | { kind: 'category'; tags?: string[] }
  | {
      kind: 'tag'
      category: { name: string; slug: string }
    }

interface CategoryRowProps {
  /** Post identity. */
  post: {
    id: string
    title: string
    slug: string
    created: string
  }
  /** Path context — required to build the post URL. For the category page, this is the category slug. For the tag page, the row carries its own category. */
  categorySlug: string
  /** Whether to show year in the date label. The list owner decides this based on whether grouping is active. */
  showYear: boolean
  /** What the meta line surfaces beside the date — tags (category page) or source category (tag page). */
  mode: CategoryRowMode
}

const MAX_TAGS = 2

export const CategoryRow = ({
  post,
  categorySlug,
  showYear,
  mode,
}: CategoryRowProps) => {
  const href = routeBuilder(Routes.Post, {
    category: categorySlug,
    slug: post.slug,
  })

  const date = new Date(post.created)
  const dateLabel = new Intl.DateTimeFormat(undefined, {
    year: showYear ? 'numeric' : undefined,
    month: 'short',
    day: 'numeric',
  }).format(date)

  return (
    <li className="list-none">
      <Link
        href={href}
        prefetch={false}
        className="group grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3 border-b border-neutral-10/[0.05] py-3.5 transition-colors duration-200 hover:bg-accent/[0.03] dark:hover:bg-accent/[0.04]"
      >
        <span className="min-w-0 truncate text-sm font-normal text-neutral-10/85 transition-colors duration-200 group-hover:text-neutral-10">
          {post.title}
        </span>
        <span className="shrink-0 text-[10px] tabular-nums text-neutral-10/40 whitespace-nowrap">
          <span>{dateLabel}</span>
          {mode.kind === 'category' && mode.tags && mode.tags.length > 0 ? (
            <>
              <span className="mx-1.5">·</span>
              <span>
                {mode.tags.slice(0, MAX_TAGS).map((tag, idx) => (
                  <span key={tag}>
                    <span className="text-accent">#{tag}</span>
                    {idx < Math.min(mode.tags!.length, MAX_TAGS) - 1
                      ? ', '
                      : null}
                  </span>
                ))}
                {mode.tags.length > MAX_TAGS ? (
                  <span> +{mode.tags.length - MAX_TAGS}</span>
                ) : null}
              </span>
            </>
          ) : null}
          {mode.kind === 'tag' ? (
            <>
              <span className="mx-1.5">·</span>
              <span className="text-accent">{mode.category.name}</span>
            </>
          ) : null}
        </span>
      </Link>
    </li>
  )
}
```

- [ ] **Step 2: Type-check + commit**

```bash
pnpm -C /Users/innei/git/innei-repo/Yohaku --filter @yohaku/web type-check
git add apps/web/src/components/modules/category/CategoryRow.tsx
git commit -m "feat(category): add CategoryRow with mode-driven meta rendering"
```

---

## Task 13: Create `CategoryRowList` (year grouping + stagger)

**Files:**
- Create: `apps/web/src/components/modules/category/CategoryRowList.tsx`

- [ ] **Step 1: Write the file**

```tsx
'use client'

import { useEffect, useMemo, useRef } from 'react'

import type { CategoryRowMode } from './CategoryRow'
import { CategoryRow } from './CategoryRow'
import { YearAnchor } from './YearAnchor'

export interface CategoryRowItem {
  id: string
  title: string
  slug: string
  created: string
  tags?: string[]
  category?: { name: string; slug: string }
}

interface CategoryRowListProps {
  items: CategoryRowItem[]
  /**
   * When true, group items by year and render `YearAnchor`s.
   * Caller decides — typically when there are >= 2 distinct years.
   */
  groupByYear: boolean
  /** Show source category in each row (tag page). Otherwise show post tags (category page). */
  showCategorySource: boolean
  /** Used to build /posts/<categorySlug>/<postSlug>. Required when showCategorySource is false (category page). When showCategorySource is true, each item carries its own category. */
  categorySlug?: string
}

const STAGGER_CAP = 20
const STAGGER_STEP_MS = 50

export const CategoryRowList = ({
  items,
  groupByYear,
  showCategorySource,
  categorySlug,
}: CategoryRowListProps) => {
  const ulRef = useRef<HTMLUListElement>(null)

  const grouped = useMemo(() => {
    if (!groupByYear) return null
    const map = new Map<number, CategoryRowItem[]>()
    for (const item of items) {
      const year = new Date(item.created).getFullYear()
      const bucket = map.get(year)
      if (bucket) bucket.push(item)
      else map.set(year, [item])
    }
    return [...map.entries()].sort(([a], [b]) => b - a)
  }, [items, groupByYear])

  useEffect(() => {
    const root = ulRef.current
    if (!root) return
    const lis = root.querySelectorAll<HTMLLIElement>(':scope > li')
    lis.forEach((li, idx) => {
      const capped = Math.min(idx, STAGGER_CAP)
      li.style.setProperty('--li-index', String(capped))
    })
  }, [items, groupByYear])

  const buildMode = (item: CategoryRowItem): CategoryRowMode =>
    showCategorySource
      ? {
          kind: 'tag',
          category: item.category ?? { name: '', slug: '' },
        }
      : { kind: 'category', tags: item.tags }

  const resolveCategorySlug = (item: CategoryRowItem) =>
    showCategorySource ? item.category?.slug ?? '' : categorySlug ?? ''

  const showYearOnRow = !groupByYear

  return (
    <ul
      ref={ulRef}
      className="yohaku-category-list min-w-0"
    >
      {groupByYear && grouped
        ? grouped.flatMap(([year, yearItems]) => [
            <YearAnchor
              key={`year-${year}`}
              year={year}
              count={yearItems.length}
            />,
            ...yearItems.map((item) => (
              <CategoryRow
                key={item.id}
                post={item}
                categorySlug={resolveCategorySlug(item)}
                showYear={showYearOnRow}
                mode={buildMode(item)}
              />
            )),
          ])
        : items.map((item) => (
            <CategoryRow
              key={item.id}
              post={item}
              categorySlug={resolveCategorySlug(item)}
              showYear={showYearOnRow}
              mode={buildMode(item)}
            />
          ))}
    </ul>
  )
}
```

- [ ] **Step 2: Add stagger CSS rule to `apps/web/src/styles/layer.css`**

The keyframe `timeline-fade-up` already exists (verify via `grep timeline-fade-up apps/web/src/styles/layer.css`). Add a new selector that applies it to category list children, near the existing `.yohaku-timeline` block:

```css
.yohaku-category-list > li {
  animation: timeline-fade-up 0.4s ease-out both;
  animation-delay: calc(var(--li-index, 0) * 50ms);
}
```

Place this after the closing `}` of `.yohaku-timeline` (so it lives in the same `@layer components` scope). Verify by checking the surrounding context — `layer.css` uses `@layer components { ... }`.

- [ ] **Step 3: Type-check + commit**

```bash
pnpm -C /Users/innei/git/innei-repo/Yohaku/apps/web tsc --noEmit
git add apps/web/src/components/modules/category/CategoryRowList.tsx \
        apps/web/src/styles/layer.css
git commit -m "feat(category): add CategoryRowList with year grouping and stagger"
```

---

## Task 14: Create `SubTagChips` and `CategoryCrossChips`

**Files:**
- Create: `apps/web/src/components/modules/category/SubTagChips.tsx`
- Create: `apps/web/src/components/modules/category/CategoryCrossChips.tsx`

- [ ] **Step 1: Write `SubTagChips.tsx`**

```tsx
import { useTranslations } from 'next-intl'

import { Link } from '~/i18n/navigation'
import { routeBuilder, Routes } from '~/lib/route-builder'

interface SubTagChipsProps {
  tags: Array<{ name: string; count: number }>
}

export const SubTagChips = ({ tags }: SubTagChipsProps) => {
  const t = useTranslations('post')
  if (!tags.length) return null

  return (
    <section className="mt-7 border-t border-neutral-10/[0.06] pt-4">
      <div className="mb-2.5 text-[9px] tracking-[3px] uppercase text-neutral-10/55">
        {t('category_sub_tags_label')}
      </div>
      <ul className="flex flex-wrap gap-1.5 list-none p-0">
        {tags.map((tag) => (
          <li key={tag.name}>
            <Link
              href={routeBuilder(Routes.Tag, { name: tag.name })}
              className="inline-flex items-baseline rounded-full bg-neutral-2 px-2.5 py-0.5 text-[10px] text-neutral-10/65 transition-colors duration-150 hover:bg-accent/[0.08] hover:text-accent"
            >
              <span>#{tag.name}</span>
              <span className="ml-1 text-neutral-10/40">{tag.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
```

- [ ] **Step 2: Write `CategoryCrossChips.tsx`**

```tsx
import { useTranslations } from 'next-intl'

import { Link } from '~/i18n/navigation'
import { routeBuilder, Routes } from '~/lib/route-builder'

interface CategoryCrossChipsProps {
  counts: Array<{ slug: string; name: string; count: number }>
}

export const CategoryCrossChips = ({ counts }: CategoryCrossChipsProps) => {
  const t = useTranslations('post')
  if (counts.length < 2) return null

  return (
    <section className="mt-7 border-t border-neutral-10/[0.06] pt-4">
      <div className="mb-2.5 text-[9px] tracking-[3px] uppercase text-neutral-10/55">
        {t('tag_cross_categories_label')}
      </div>
      <ul className="flex flex-wrap gap-1.5 list-none p-0">
        {counts.map((c) => (
          <li key={c.slug}>
            <Link
              href={routeBuilder(Routes.Category, { slug: c.slug })}
              className="inline-flex items-baseline rounded-full bg-neutral-2 px-2.5 py-0.5 text-[10px] text-neutral-10/65 transition-colors duration-150 hover:bg-accent/[0.08] hover:text-accent"
            >
              <span>{c.name}</span>
              <span className="ml-1 text-neutral-10/40">{c.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
```

- [ ] **Step 3: Type-check + commit**

```bash
pnpm -C /Users/innei/git/innei-repo/Yohaku/apps/web tsc --noEmit
git add apps/web/src/components/modules/category/SubTagChips.tsx \
        apps/web/src/components/modules/category/CategoryCrossChips.tsx
git commit -m "feat(category): add SubTagChips and CategoryCrossChips"
```

---

## Task 15: Create `EmptyCategoryState`

**Files:**
- Create: `apps/web/src/components/modules/category/EmptyCategoryState.tsx`

- [ ] **Step 1: Write the file**

```tsx
import { useTranslations } from 'next-intl'

import { EmptyIcon } from '~/components/icons/empty'

export const EmptyCategoryState = () => {
  const t = useTranslations('post')

  return (
    <div className="center flex flex-col items-center gap-4 py-16 text-center">
      <div className="text-neutral-10/30">
        <EmptyIcon />
      </div>
      <div className="h-px w-8 bg-accent/40" />
      <p className="text-sm text-neutral-10/55">{t('category_empty')}</p>
    </div>
  )
}
```

- [ ] **Step 2: Type-check + commit**

```bash
pnpm -C /Users/innei/git/innei-repo/Yohaku/apps/web tsc --noEmit
git add apps/web/src/components/modules/category/EmptyCategoryState.tsx
git commit -m "feat(category): add EmptyCategoryState"
```

---

# Phase D — i18n

## Task 16: Update i18n keys across 5 locales (post.json + common.json + test allowlist)

**Files:**
- Modify (all): `apps/web/src/messages/{en,zh,zh-TW,ja,ko}/post.json`
- Modify (all): `apps/web/src/messages/{en,zh,zh-TW,ja,ko}/common.json`
- Modify: `apps/web/src/messages/message-usage.test.ts:122-134`

- [ ] **Step 1: Update `messages/en/post.json`**

Replace the file contents (preserving all unrelated existing keys) with the version below. The diff is: drop `category_prefix`, `category_count_prefix`, `category_count_suffix`, `tag_title`; rewrite `category_empty`; add 9 new keys.

```json
{
  "outdated_prefix": "This article was last modified on ",
  "outdated_suffix": ". Some content may be outdated. Feel free to ask the author if you have questions.",
  "related_before": "Before reading this article, you may want to read the following articles first to better understand the context.",
  "related_after": "Related reading",
  "recent_posts": "Recently updated posts",
  "recent_notes": "Recently updated notes",
  "more": "More",
  "view_article": "Read article",
  "details": "Details",
  "copyright_title": "Article Title:",
  "copyright_author": "Author:",
  "copyright_link": "Article Link:",
  "copyright_copy": "[Copy]",
  "copyright_modified": "Last Modified:",
  "copyright_license_text": "For commercial reuse, please contact the site owner for authorization. For non-commercial reuse, please credit this article and include its link. You may copy, distribute, adapt, and build upon this work in any medium or format, but derivative works must be shared under the same license.",
  "copyright_license_prefix": "This article is licensed under",
  "copyright_license_suffix": ".",
  "copyright_license_tooltip": "Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License",
  "category_label": "Category",
  "tag_label": "Tag",
  "category_subtitle_count_only": "{count, plural, one {1 article} other {# articles}}",
  "category_subtitle_with_year": "{count, plural, one {1 article} other {# articles}} · from {year}",
  "tag_subtitle_count_only": "{count, plural, one {1 article} other {# articles}}",
  "tag_subtitle_with_cross": "{count, plural, one {1 article} other {# articles}} · across {crossCategoryCount, plural, one {1 category} other {# categories}}",
  "category_pinned_label": "Pinned",
  "category_sub_tags_label": "Tags in this category",
  "tag_cross_categories_label": "Appears in",
  "category_empty": "Nothing here yet."
}
```

- [ ] **Step 2: Update `messages/zh/post.json`**

```json
{
  "outdated_prefix": "这篇文章上次修改于",
  "outdated_suffix": "，可能部分内容已经不适用，如有疑问可询问作者。",
  "related_before": "阅读此文章之前，你可能需要首先阅读以下的文章才能更好的理解上下文。",
  "related_after": "关联阅读",
  "recent_posts": "最近更新的文稿",
  "recent_notes": "最近更新的手记",
  "more": "还有更多",
  "view_article": "查看文章",
  "details": "详情",
  "copyright_title": "文章标题：",
  "copyright_author": "文章作者：",
  "copyright_link": "文章链接：",
  "copyright_copy": "[复制]",
  "copyright_modified": "最后修改时间：",
  "copyright_license_text": "商业转载请联系站长获得授权，非商业转载请注明本文出处及文章链接，您可以自由地在任何媒体以任何形式复制和分发作品，也可以修改和创作，但是分发衍生作品时必须采用相同的许可协议。",
  "copyright_license_prefix": "本文采用",
  "copyright_license_suffix": "进行许可。",
  "copyright_license_tooltip": "知识共享署名-非商业性使用-相同方式共享 4.0 国际许可协议",
  "category_label": "分类",
  "tag_label": "标签",
  "category_subtitle_count_only": "{count} 篇",
  "category_subtitle_with_year": "{count} 篇 · 始于 {year} 年",
  "tag_subtitle_count_only": "{count} 篇",
  "tag_subtitle_with_cross": "{count} 篇 · 散落在 {crossCategoryCount} 个分类",
  "category_pinned_label": "置顶",
  "category_sub_tags_label": "此分类下的标签",
  "tag_cross_categories_label": "散见于",
  "category_empty": "尚无篇章。"
}
```

- [ ] **Step 3: Update `messages/zh-TW/post.json`**

Identical to `zh` but with traditional characters; replace the eight new/changed keys (everything else copies from current zh-TW file):

- `"category_label": "分類"`
- `"tag_label": "標籤"`
- `"category_subtitle_count_only": "{count} 篇"`
- `"category_subtitle_with_year": "{count} 篇 · 始於 {year} 年"`
- `"tag_subtitle_count_only": "{count} 篇"`
- `"tag_subtitle_with_cross": "{count} 篇 · 散落在 {crossCategoryCount} 個分類"`
- `"category_pinned_label": "置頂"`
- `"category_sub_tags_label": "此分類下的標籤"`
- `"tag_cross_categories_label": "散見於"`
- `"category_empty": "尚無篇章。"`

Drop: `category_prefix`, `category_count_prefix`, `category_count_suffix`, `tag_title`.

- [ ] **Step 4: Update `messages/ja/post.json`**

- `"category_label": "カテゴリー"`
- `"tag_label": "タグ"`
- `"category_subtitle_count_only": "{count} 件"`
- `"category_subtitle_with_year": "{count} 件 · {year} 年から"`
- `"tag_subtitle_count_only": "{count} 件"`
- `"tag_subtitle_with_cross": "{count} 件 · {crossCategoryCount} つのカテゴリーから"`
- `"category_pinned_label": "ピン留め"`
- `"category_sub_tags_label": "このカテゴリーのタグ"`
- `"tag_cross_categories_label": "登場するカテゴリー"`
- `"category_empty": "まだ記事はありません。"`

Drop the same four keys.

- [ ] **Step 5: Update `messages/ko/post.json`**

- `"category_label": "분류"`
- `"tag_label": "태그"`
- `"category_subtitle_count_only": "{count}편"`
- `"category_subtitle_with_year": "{count}편 · {year}년부터"`
- `"tag_subtitle_count_only": "{count}편"`
- `"tag_subtitle_with_cross": "{count}편 · {crossCategoryCount}개 분류에 걸쳐"`
- `"category_pinned_label": "고정"`
- `"category_sub_tags_label": "이 분류의 태그"`
- `"tag_cross_categories_label": "등장하는 분류"`
- `"category_empty": "아직 글이 없어요."`

Drop the same four keys.

- [ ] **Step 6: Add `entries_count` to all 5 `common.json` files**

Append (or insert near other count-style keys) `entries_count` to each `apps/web/src/messages/<locale>/common.json`:

| Locale | Value |
| --- | --- |
| en | `"entries_count": "{count, plural, one {1 entry} other {# entries}}"` |
| zh | `"entries_count": "{count} 篇"` |
| zh-TW | `"entries_count": "{count} 篇"` |
| ja | `"entries_count": "{count} 件"` |
| ko | `"entries_count": "{count}편"` |

- [ ] **Step 7: Update `message-usage.test.ts` allowlist**

In `apps/web/src/messages/message-usage.test.ts:122-134`, replace the `post: [...]` block:

```ts
post: [
  'category_empty',
  'copyright_author',
  'copyright_license_text',
  'copyright_link',
  'copyright_modified',
  'copyright_title',
  'related_after',
],
```

(Removed: `category_prefix`, `category_count_prefix`, `category_count_suffix`, `tag_title`. Kept `category_empty` because the new `EmptyCategoryState` references it via `t('category_empty')`.)

- [ ] **Step 8: Run the i18n usage test**

Run: `pnpm -C /Users/innei/git/innei-repo/Yohaku/apps/web test`

Expected: pass. **Note:** the test will fail at this point because the new keys (`category_label`, etc.) exist in JSON but no source file references them yet — that gets fixed by Tasks 17-18 wiring up the components in pages. If the test fails here, do NOT debug yet — proceed to the next tasks; we'll re-run the i18n test in Task 19.

If you want a clean intermediate commit, you can postpone running the test. Otherwise commit and move on.

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/messages/
git commit -m "i18n(category): rewrite category & tag detail page strings across 5 locales"
```

---

# Phase E — Page rewrites

## Task 17: Rewrite `/categories/[slug]/page.tsx` and update its layout

**Files:**
- Modify (rewrite): `apps/web/src/app/[locale]/categories/[slug]/page.tsx`
- Modify: `apps/web/src/app/[locale]/categories/[slug]/layout.tsx`

- [ ] **Step 1: Replace `page.tsx` with the editorial layout**

```tsx
import { PageColorGradient } from '~/components/common/PageColorGradient'
import { CategoryHero } from '~/components/modules/category/CategoryHero'
import { CategoryRowList } from '~/components/modules/category/CategoryRowList'
import { EmptyCategoryState } from '~/components/modules/category/EmptyCategoryState'
import { PinnedFeatureBlock } from '~/components/modules/category/PinnedFeatureBlock'
import { SubTagChips } from '~/components/modules/category/SubTagChips'
import { BackToTop } from '~/components/ui/back-to-top/BackToTop'
import { BottomToUpSoftSpringTransitionView } from '~/components/ui/transition'
import { definePrerenderPage } from '~/lib/request.server'

import { getData } from './api'

export default definePrerenderPage<{ slug: string; locale: string }>()({
  fetcher(params) {
    return getData({ slug: params.slug })
  },

  Component: async ({ data, params: { slug } }) => {
    const { name, count, children, tagsSum } = data

    const pinnedPost = children[0]?.pin ? children[0] : null
    const rest = pinnedPost ? children.slice(1) : children

    const years = children
      .map((c) => new Date(c.created).getFullYear())
      .filter((y) => Number.isFinite(y))
    const earliestYear = years.length > 0 ? Math.min(...years) : undefined
    const multiYear = new Set(years).size >= 2

    const hasContent = pinnedPost !== null || rest.length > 0

    return (
      <>
        <PageColorGradient seed={`category|${slug}`} />
        <BottomToUpSoftSpringTransitionView>
          <CategoryHero
            count={count}
            name={name}
            earliestYear={earliestYear}
          />
        </BottomToUpSoftSpringTransitionView>

        {pinnedPost ? (
          <PinnedFeatureBlock post={pinnedPost} categorySlug={slug} />
        ) : null}

        {rest.length > 0 ? (
          <CategoryRowList
            items={rest}
            groupByYear={multiYear}
            showCategorySource={false}
            categorySlug={slug}
          />
        ) : !pinnedPost ? (
          <EmptyCategoryState />
        ) : null}

        {tagsSum && tagsSum.length > 0 ? (
          <SubTagChips tags={tagsSum} />
        ) : null}

        {hasContent ? <BackToTop /> : null}
      </>
    )
  },
})
```

- [ ] **Step 2: Update `layout.tsx` metadata title**

In `apps/web/src/app/[locale]/categories/[slug]/layout.tsx`, replace the `generateMetadata` body:

```tsx
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { NormalContainer } from '~/components/layout/container/Normal'

import { getData } from './api'

export const generateMetadata = async (
  props: NextPageParams<{
    locale: string
    slug: string
  }>,
) => {
  const params = await props.params
  const data = await getData(params).catch(() => null)

  if (!data) {
    return {}
  }
  const t = await getTranslations({
    locale: params.locale,
    namespace: 'post',
  })

  return {
    title: `${data.name} · ${t('category_label')}`,
  } satisfies Metadata
}

export default async function Layout(
  props: NextPageParams<{
    slug: string
  }>,
) {
  return <NormalContainer>{props.children}</NormalContainer>
}
```

- [ ] **Step 3: Type-check + lint**

Run: `pnpm -C /Users/innei/git/innei-repo/Yohaku --filter @yohaku/web type-check && pnpm -C /Users/innei/git/innei-repo/Yohaku --filter @yohaku/web lint`

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/[locale]/categories/
git commit -m "feat(category): rewrite /categories/[slug] with editorial layout"
```

---

## Task 18: Rewrite `/posts/tag/[name]/page.tsx` and add a layout

**Files:**
- Modify (rewrite): `apps/web/src/app/[locale]/posts/tag/[name]/page.tsx`
- Create: `apps/web/src/app/[locale]/posts/tag/[name]/layout.tsx`

- [ ] **Step 1: Replace `page.tsx`**

```tsx
import { PageColorGradient } from '~/components/common/PageColorGradient'
import { CategoryCrossChips } from '~/components/modules/category/CategoryCrossChips'
import { CategoryRowList } from '~/components/modules/category/CategoryRowList'
import { TagHero } from '~/components/modules/category/TagHero'
import { BackToTop } from '~/components/ui/back-to-top/BackToTop'
import { BottomToUpSoftSpringTransitionView } from '~/components/ui/transition'
import { apiClient } from '~/lib/request'
import { definePrerenderPage } from '~/lib/request.server'

export default definePrerenderPage<{
  name: string
  locale: string
}>()({
  async fetcher({ name }) {
    const res = await apiClient.category.getTagByName(name)
    return res.data
  },
  async Component({ data, params: { name } }) {
    const sorted = [...data].sort(
      (a, b) => +new Date(b.created) - +new Date(a.created),
    )

    const categoryMap = new Map<
      string,
      { slug: string; name: string; count: number }
    >()
    for (const post of sorted) {
      const slug = post.category.slug
      const existing = categoryMap.get(slug)
      if (existing) existing.count += 1
      else
        categoryMap.set(slug, {
          slug,
          name: post.category.name,
          count: 1,
        })
    }
    const counts = [...categoryMap.values()].sort(
      (a, b) => b.count - a.count,
    )
    const M = counts.length

    const years = sorted
      .map((p) => new Date(p.created).getFullYear())
      .filter((y) => Number.isFinite(y))
    const multiYear = new Set(years).size >= 2

    return (
      <>
        <PageColorGradient seed={`tag|${name}`} />
        <BottomToUpSoftSpringTransitionView>
          <TagHero
            count={data.length}
            name={name}
            crossCategoryCount={M}
          />
        </BottomToUpSoftSpringTransitionView>

        <CategoryRowList
          items={sorted.map((p) => ({
            id: p.id,
            title: p.title,
            slug: p.slug,
            created: p.created,
            tags: p.tags,
            category: { name: p.category.name, slug: p.category.slug },
          }))}
          groupByYear={multiYear}
          showCategorySource
        />

        <CategoryCrossChips counts={counts} />

        <BackToTop />
      </>
    )
  },
})
```

- [ ] **Step 2: Create `layout.tsx`**

Create `apps/web/src/app/[locale]/posts/tag/[name]/layout.tsx`:

```tsx
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { NormalContainer } from '~/components/layout/container/Normal'

export const generateMetadata = async (
  props: NextPageParams<{
    locale: string
    name: string
  }>,
): Promise<Metadata> => {
  const { locale, name } = await props.params
  const t = await getTranslations({ locale, namespace: 'post' })
  return {
    title: `#${name} · ${t('tag_label')}`,
  }
}

export default async function Layout(
  props: NextPageParams<{
    name: string
  }>,
) {
  return <NormalContainer>{props.children}</NormalContainer>
}
```

(The previous version of `page.tsx` wrapped in `<NormalContainer>` directly; the new design moves that into the layout so the content can fill the container without an extra wrapper element.)

- [ ] **Step 3: Type-check + lint**

Run: `pnpm -C /Users/innei/git/innei-repo/Yohaku --filter @yohaku/web type-check && pnpm -C /Users/innei/git/innei-repo/Yohaku --filter @yohaku/web lint`

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/[locale]/posts/tag/
git commit -m "feat(category): rewrite /posts/tag/[name] with lite editorial layout"
```

---

# Phase F — Verification

## Task 19: Run full type-check, lint, and i18n test

**Files:** none

- [ ] **Step 1: Type-check**

Run: `pnpm -C /Users/innei/git/innei-repo/Yohaku --filter @yohaku/web type-check`

Expected: clean.

- [ ] **Step 2: Lint**

Run: `pnpm -C /Users/innei/git/innei-repo/Yohaku --filter @yohaku/web lint`

Expected: clean.

- [ ] **Step 3: i18n usage test**

Run: `pnpm -C /Users/innei/git/innei-repo/Yohaku/apps/web test -- --run`

Expected: `next-intl message usage › keeps only referenced keys in locale files` passes.

If it fails:
- The fix is usually that a new key is in `post.json` but no source file references it (the dynamic allowlist test would catch unused keys, not missing ones — so this would fail with "unused" entries in `unusedByNamespace`). If a key like `tag_subtitle_with_cross` is reported unused, verify that the `TagHero` component has been wired into `posts/tag/[name]/page.tsx` (Task 18). If the page.tsx wasn't yet replaced, that's the cause.
- For any other failure mode, read the test output carefully — the assertion prints the unused-by-namespace tuple.

- [ ] **Step 4: Design system check**

Run: `pnpm -C /Users/innei/git/innei-repo/Yohaku --filter @yohaku/design-system check`

Expected: no drift (we haven't touched the design system package, but this validates token usage in any new CSS additions).

- [ ] **Step 5: No commit**

Verification only — nothing to commit.

---

## Task 20: Manual smoke test (5 cases)

**Files:** none — this is a manual verification step.

- [ ] **Step 1: Start dev server**

Run: `pnpm -C /Users/innei/git/innei-repo/Yohaku --filter @yohaku/web dev`

Wait for "Ready" on `http://localhost:2323`. Open a browser to that URL.

- [ ] **Step 2: Walk the 5 smoke cases**

For each, verify the bullet points beneath:

**Case 1 — Rich category** (≥10 posts, multi-year, contains a pinned post, multiple tags). Pick any from the running site that fits — use the dashboard or `/categories` listing entries. Open `/categories/<slug>`.

  - Top accent gradient is visible (different slug → different hue)
  - Hero shows `CATEGORY` cap, big extralight count, title, accent-rule
  - Subtitle reads "X articles · from YYYY" / "X 篇 · 始于 YYYY 年"
  - PinnedFeatureBlock renders with PINNED label, summary, meta
  - YearAnchor blocks separate years; each shows "N entries"
  - Rows show title + month/day + #tags
  - Hover row → soft accent bg
  - Hover chip → fills accent
  - Stagger entrance visible (rows fade in progressively, capped after ~20)
  - Toggle dark mode — gradient + accent rotate appropriately
  - Resize to 375px width — number scales down, layout intact

**Case 2 — Thin category** (1-2 posts, single year, no pinned). Pick a low-volume category.

  - Hero shows "1 article" or "2 篇" (no `from year` suffix)
  - No PinnedFeatureBlock
  - No YearAnchor
  - Rows render with full date including year (`MMM D, YYYY`)
  - SubTagChips renders only if there are tags on the post(s)

**Case 3 — Empty category** (0 children). If no real empty category exists, you can temporarily create one via the dashboard (or use the API mock for visual verification).

  - EmptyCategoryState centered with EmptyIcon, accent-rule, single-line copy
  - No BackToTop

**Case 4 — Rich tag** (≥3 posts spanning ≥2 categories, multi-year). Open `/posts/tag/<name>`.

  - Top accent gradient — distinct from any category gradient
  - Hero shows `TAG` cap, count, `#name` with extralight `#`
  - Subtitle reads "X articles · across N categories" / "X 篇 · 散落在 N 个分类"
  - Year anchors render
  - Each row shows month/day · category-name (in accent)
  - CategoryCrossChips rendered with `Appears in` / `散见于` label
  - BackToTop visible

**Case 5 — Single-category tag** (e.g., a tag used only within one category).

  - Hero subtitle reads count-only ("X articles")
  - No CategoryCrossChips at the bottom
  - Year anchors render only if multi-year

- [ ] **Step 3: Note any issues**

If any visual or behavioral issue is found, capture it as a follow-up task in the user's preferred tracker (or surface to the user immediately if blocking). Common lurking issues at this stage:

- Hot reload occasionally leaves stale dynamic styles — hard refresh to confirm
- `Intl.DateTimeFormat(undefined, ...)` picks browser default; verify it matches the page's `useLocale()` (if it doesn't, swap to `Intl.DateTimeFormat(useLocale(), ...)` — but this requires moving the date format into a client component or computing it server-side with `getLocale()`)

- [ ] **Step 4: No commit**

Smoke test only. If issues found, fix in a follow-up task.

---

# Self-Review Checklist (run AFTER all tasks complete)

This is a final audit by the implementer.

- [ ] Run `git log --oneline | head -20` and confirm:
  - mx-core has 1 feat commit
  - Yohaku has at least 11 commits (chore-bump, refactor-backtop, 9 component feats, 1 i18n, 2 page rewrites)
- [ ] Run `git diff main -- apps/web/src/components/modules/category/` and confirm 11 files (10 `.tsx` + the layer.css edit, which is in styles/)
- [ ] Confirm `TimelineSpineLayout` is still imported by `apps/web/src/app/[locale]/(note-topic)/notes/series/page.tsx` (search `grep TimelineSpineLayout apps/web/src` — it should still show the `/notes/series` reference, just not the two pages we rewrote)
- [ ] Open the running site in dark mode and one mobile viewport (DevTools 375×812). Re-walk Cases 1 and 4.

---

# Open Risks

- **api-client publish 2FA.** The `release-api-client` skill handles the publish flow end-to-end, but if Innei's npm account has 2FA enforced, the publish step will fail with `EOTP` and the agent must ask the user for a 6-digit OTP to retry. The skill documents this recovery path.
- **`Intl.DateTimeFormat` locale.** Tasks 10 and 12 use `undefined` (browser default) for date formatting. This may produce "Apr 30" in en-US even when the site is set to Japanese. The fix is to thread the locale through — easy to do later if it bothers you, not blocking for this PR.
- **Stagger animation on 50+ row category.** The cap is 20. Beyond 20 rows, all later rows share `--li-index = 20`, which means they all start animating at the same delay. Acceptable per the spec ("avoid末尾入场拖太久") but worth eyeballing in Case 1.
