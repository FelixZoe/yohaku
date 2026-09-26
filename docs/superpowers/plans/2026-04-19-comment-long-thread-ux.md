# Comment Long-Thread UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the auto-loading infinite scroll on the post/note comment list with manual paging + sort selector + jump-to-end + anchor-based deep-linking, so very long threads stay navigable.

**Architecture:**
- **Backend (mx-core core)** — extend `GET /comments/ref/:id` with two new query params: `sort` (`newest` | `oldest` | `pinned`, default `pinned` to preserve current behavior) and `around` (a comment id; the server computes the page that contains that comment under the active sort and returns it instead of the requested `page`).
- **API client (mx-core packages/api-client)** — bump `CommentController.getByRefId` to forward the two new optional params and republish.
- **Frontend (Yohaku web)** — bump the `@mx-space/api-client` dependency, replace the `LoadMoreIndicator` IntersectionObserver with a manual "Load more" button, add a `CommentToolbar` that surfaces total count + sort selector + jump-to-first / jump-to-last buttons, and use `around` to hydrate the right page when the URL hash points at a specific comment.

**Tech Stack:** NestJS + zod + mongoose (mx-core), tsdown-built TS package (api-client), Next.js App Router + TanStack Query + Jotai (Yohaku), vitest on the backend (no frontend tests per the user's instruction for this plan).

**Repo layout (cross-repo task):**
- mx-core checkout: `/Users/innei/git/innei-repo/mx-core`
- Yohaku checkout: `/Users/innei/git/innei-repo/Yohaku`

The two changes can ship roughly in order: backend → api-client → publish → Yohaku bump. Until the backend is deployed and api-client is published, the frontend cannot pass the new params; until the api-client lands the new types, the Yohaku hook will not type-check the new options. Plan the merges accordingly.

---

## File Structure

### mx-core core (backend)
- Modify `apps/core/src/modules/comment/comment.controller.ts`
  — `getCommentsByRefId` accepts two new `@Query` params and forwards them.
- Modify `apps/core/src/modules/comment/comment.schema.ts`
  — add a `CommentListQuerySchema` zod DTO so `sort` is validated as an enum and `around` is validated as an ObjectId-shaped string.
- Modify `apps/core/src/modules/comment/comment.service.ts`
  — `getCommentsByRefId` honors the sort enum, and a new private helper `findPageContainingComment` resolves `around` → `page`.
- Modify `apps/core/test/src/modules/comment/comment-thread.spec.ts`
  — add unit specs for sort + around behavior on `CommentService`.

### mx-core api-client
- Modify `packages/api-client/controllers/comment.ts`
  — `getByRefId` accepts an extra `{ sort?, around? }` and forwards them to `params`.
- Modify `packages/api-client/__tests__/controllers/comment.test.ts`
  — assert the new params are forwarded.
- Modify `packages/api-client/package.json`
  — bump `version` (3.1.0 → 3.2.0).

### Yohaku (frontend, no tests)
- Modify `apps/web/package.json`
  — bump `@mx-space/api-client` to the new version after publish.
- Modify `apps/web/src/queries/keys/comment.ts`
  — query key includes `sort` and `around` so cache buckets do not collide.
- Modify `apps/web/src/components/modules/comment/hooks.tsx`
  — `useCommentsQuery(refId, options)` accepts `{ sort, around }` and calls `apiClient.comment.getByRefId(refId, { page, sort, around })`.
- Create `apps/web/src/components/modules/comment/atoms.ts`
  — `commentSortAtomFamily` + `commentAroundAtomFamily` (Jotai `atomFamily`). Sibling file (not in `CommentProvider.tsx`) keeps the provider focused.
- Create `apps/web/src/components/modules/comment/CommentToolbar.tsx`
  — total count, sort selector, "跳至最早 / 跳至最新" buttons.
- Modify `apps/web/src/components/modules/comment/CommentProvider.tsx`
  — accept `sort` + `around` props, replace `<LoadMoreIndicator>` with a manual button, compute `remainingCount`.
- Modify `apps/web/src/components/modules/comment/Comments.tsx`
  — read sort atom, hydrate `around` from `#comment-<id>` URL hash, render the toolbar, scroll to anchor after load.
- Add i18n keys to `apps/web/messages/zh-CN/comment.json` and `apps/web/messages/en/comment.json` (and any other locales already present).

---

## Tasks

The order is: backend (Tasks 1–3) → api-client (Task 4) → frontend wiring (Tasks 5–9) → manual verification (Task 10). Each task ends with a commit.

---

### Task 1: Backend — add `CommentListQuerySchema` DTO

**Files:**
- Modify: `apps/core/src/modules/comment/comment.schema.ts`

- [ ] **Step 1: Append the zod schema + DTO**

Just before the `// Type exports` block:

```typescript
/**
 * Query schema for `GET /comments/ref/:id` list endpoint.
 *
 * - `sort`:
 *   - `pinned` (default, legacy behavior): `pin` desc, then `created` desc.
 *   - `newest`: `created` desc, no pin priority.
 *   - `oldest`: `created` asc, no pin priority.
 * - `around`: comment id; when set, the server computes the page that
 *   contains that comment under the active sort and returns it; the
 *   requested `page` is ignored.
 */
export const CommentListQuerySchema = z.object({
  sort: z.enum(['pinned', 'newest', 'oldest']).default('pinned'),
  around: z
    .string()
    .trim()
    .regex(/^[0-9a-fA-F]{24}$/, { message: 'around must be a valid id' })
    .optional(),
})

export class CommentListQueryDto extends createZodDto(CommentListQuerySchema) {}
```

- [ ] **Step 2: Add the inferred type to the `// Type exports` block**

```typescript
export type CommentListQueryInput = z.infer<typeof CommentListQuerySchema>
```

- [ ] **Step 3: Typecheck**

Run: `cd /Users/innei/git/innei-repo/mx-core && pnpm --filter @mx-space/core exec tsc --noEmit -p apps/core/tsconfig.json`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
cd /Users/innei/git/innei-repo/mx-core
git add apps/core/src/modules/comment/comment.schema.ts
git commit -m "feat(comment): add CommentListQuery DTO with sort and around params"
```

---

### Task 2: Backend — service supports `sort`

**Files:**
- Modify: `apps/core/src/modules/comment/comment.service.ts:876-918` (`getCommentsByRefId`)
- Test: `apps/core/test/src/modules/comment/comment-thread.spec.ts`

- [ ] **Step 1: Write the failing test**

Append a new `describe` block to `comment-thread.spec.ts`:

```typescript
describe('CommentService.getCommentsByRefId sort', () => {
  let service: CommentService
  let mockCommentModel: any

  beforeEach(async () => {
    mockCommentModel = {
      paginate: vi.fn().mockResolvedValue({
        docs: [],
        total: 0,
        limit: 10,
        page: 1,
        pages: 0,
        hasNextPage: false,
        hasPrevPage: false,
        currentPage: 1,
      }),
      find: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      }),
      countDocuments: vi.fn().mockResolvedValue(0),
    }

    const module = await Test.createTestingModule({
      providers: [
        CommentService,
        { provide: getModelToken('CommentModel'), useValue: mockCommentModel },
        { provide: getModelToken('AITranslationModel'), useValue: {} },
        { provide: DatabaseService, useValue: { getModelByRefType: vi.fn() } },
        { provide: OwnerService, useValue: {} },
        { provide: EventManagerService, useValue: { emit: vi.fn() } },
        { provide: ReaderService, useValue: { findReaderInIds: vi.fn() } },
        { provide: LexicalService, useValue: {} },
      ],
    }).compile()

    service = module.get(CommentService)
  })

  const baseOpts = {
    page: 1,
    size: 10,
    isAuthenticated: false,
    commentShouldAudit: false,
  }

  it('uses { pin: -1, created: -1 } when sort is pinned (default)', async () => {
    await service.getCommentsByRefId('ref1', { ...baseOpts, sort: 'pinned' })
    expect(mockCommentModel.paginate.mock.calls[0][1].sort).toEqual({
      pin: -1,
      created: -1,
    })
  })

  it('uses { created: -1 } when sort is newest', async () => {
    await service.getCommentsByRefId('ref1', { ...baseOpts, sort: 'newest' })
    expect(mockCommentModel.paginate.mock.calls[0][1].sort).toEqual({
      created: -1,
    })
  })

  it('uses { created: 1 } when sort is oldest', async () => {
    await service.getCommentsByRefId('ref1', { ...baseOpts, sort: 'oldest' })
    expect(mockCommentModel.paginate.mock.calls[0][1].sort).toEqual({
      created: 1,
    })
  })
})
```

- [ ] **Step 2: Run and confirm failure**

Run: `cd /Users/innei/git/innei-repo/mx-core && pnpm --filter @mx-space/core test --run comment-thread`
Expected: FAIL — sort arg stays as `{ pin: -1, created: -1 }` for all cases (or TS error on `sort` prop).

- [ ] **Step 3: Update the service signature + sort selection**

Edit `apps/core/src/modules/comment/comment.service.ts` `getCommentsByRefId` (lines 876–918):

```typescript
async getCommentsByRefId(
  refId: string,
  {
    page,
    size,
    isAuthenticated,
    commentShouldAudit,
    hasAnchor = false,
    sort = 'pinned',
  }: {
    page: number
    size: number
    isAuthenticated: boolean
    commentShouldAudit: boolean
    hasAnchor?: boolean
    sort?: 'pinned' | 'newest' | 'oldest'
  },
) {
  const filters = this.createPublicQueryFilters({
    isAuthenticated,
    commentShouldAudit,
    hasAnchor,
  })

  const sortMap = {
    pinned: { pin: -1, created: -1 },
    newest: { created: -1 },
    oldest: { created: 1 },
  } as const

  const comments = await this.commentModel.paginate(
    {
      $and: [
        { ref: refId },
        {
          $or: [
            { parentCommentId: null },
            { parentCommentId: { $exists: false } },
          ],
        },
        ...filters,
      ],
    },
    {
      limit: size,
      page,
      sort: sortMap[sort],
      lean: true,
      autopopulate: false,
    },
  )

  // ...rest of the method unchanged (rootIds, replies, docs.map block)
```

- [ ] **Step 4: Re-run the test**

Run: `cd /Users/innei/git/innei-repo/mx-core && pnpm --filter @mx-space/core test --run comment-thread`
Expected: PASS for the three new cases; existing cases still pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/innei/git/innei-repo/mx-core
git add apps/core/src/modules/comment/comment.service.ts apps/core/test/src/modules/comment/comment-thread.spec.ts
git commit -m "feat(comment): support sort enum in getCommentsByRefId"
```

---

### Task 3: Backend — service + controller support `around`

**Files:**
- Modify: `apps/core/src/modules/comment/comment.service.ts` (`getCommentsByRefId` + new private helper)
- Modify: `apps/core/src/modules/comment/comment.controller.ts:142-172`
- Test: `apps/core/test/src/modules/comment/comment-thread.spec.ts`

- [ ] **Step 1: Write the failing tests**

Append to the same `describe` block:

```typescript
describe('around resolver', () => {
  it('overrides page to the page that contains the around comment', async () => {
    // Pretend the around comment is the 13th in newest order ⇒ index 12 ⇒
    // with size=5 that is page 3 (1-indexed).
    mockCommentModel.findOne = vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: 'aroundId',
        ref: 'ref1',
        created: new Date('2026-04-01T00:00:00Z'),
        pin: false,
      }),
    })
    mockCommentModel.countDocuments = vi.fn().mockResolvedValue(12)

    await service.getCommentsByRefId('ref1', {
      ...baseOpts,
      page: 99, // requested page should be ignored
      size: 5,
      sort: 'newest',
      around: 'aroundId',
    })

    expect(mockCommentModel.paginate.mock.calls[0][1].page).toBe(3)
  })

  it('falls back to the requested page when around id is not found', async () => {
    mockCommentModel.findOne = vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    })

    await service.getCommentsByRefId('ref1', {
      ...baseOpts,
      page: 7,
      sort: 'newest',
      around: 'missingId',
    })

    expect(mockCommentModel.paginate.mock.calls[0][1].page).toBe(7)
  })
})
```

- [ ] **Step 2: Run and confirm failure**

Run: `cd /Users/innei/git/innei-repo/mx-core && pnpm --filter @mx-space/core test --run comment-thread`
Expected: FAIL — `around` not yet handled.

- [ ] **Step 3: Implement `findPageContainingComment` + wire it in**

In `comment.service.ts`, add a private helper just above `getCommentsByRefId`:

```typescript
private async findPageContainingComment({
  refId,
  commentId,
  size,
  sort,
  filters,
}: {
  refId: string
  commentId: string
  size: number
  sort: 'pinned' | 'newest' | 'oldest'
  filters: Record<string, any>[]
}): Promise<number | null> {
  const target = (await this.commentModel
    .findOne({
      _id: commentId,
      $and: [
        { ref: refId },
        {
          $or: [
            { parentCommentId: null },
            { parentCommentId: { $exists: false } },
          ],
        },
        ...filters,
      ],
    })
    .lean()) as { created: Date; pin?: boolean } | null

  if (!target) return null

  let beforeFilter: Record<string, any>
  if (sort === 'oldest') {
    beforeFilter = { created: { $lt: target.created } }
  } else if (sort === 'newest') {
    beforeFilter = { created: { $gt: target.created } }
  } else {
    // 'pinned': pin desc, then created desc
    if (target.pin) {
      beforeFilter = {
        $and: [{ pin: true }, { created: { $gt: target.created } }],
      }
    } else {
      beforeFilter = {
        $or: [{ pin: true }, { created: { $gt: target.created } }],
      }
    }
  }

  const before = await this.commentModel.countDocuments({
    $and: [
      { ref: refId },
      {
        $or: [
          { parentCommentId: null },
          { parentCommentId: { $exists: false } },
        ],
      },
      beforeFilter,
      ...filters,
    ],
  })

  return Math.floor(before / size) + 1
}
```

Then update `getCommentsByRefId` to accept and use `around`:

```typescript
async getCommentsByRefId(
  refId: string,
  {
    page,
    size,
    isAuthenticated,
    commentShouldAudit,
    hasAnchor = false,
    sort = 'pinned',
    around,
  }: {
    page: number
    size: number
    isAuthenticated: boolean
    commentShouldAudit: boolean
    hasAnchor?: boolean
    sort?: 'pinned' | 'newest' | 'oldest'
    around?: string
  },
) {
  const filters = this.createPublicQueryFilters({
    isAuthenticated,
    commentShouldAudit,
    hasAnchor,
  })

  let resolvedPage = page
  if (around) {
    const aroundPage = await this.findPageContainingComment({
      refId,
      commentId: around,
      size,
      sort,
      filters,
    })
    if (aroundPage !== null) {
      resolvedPage = aroundPage
    }
  }

  // ...sortMap as before, then:
  const comments = await this.commentModel.paginate(
    { /* same $and as before */ },
    {
      limit: size,
      page: resolvedPage,
      sort: sortMap[sort],
      lean: true,
      autopopulate: false,
    },
  )
  // ...rest unchanged
```

- [ ] **Step 4: Re-run the test**

Run: `cd /Users/innei/git/innei-repo/mx-core && pnpm --filter @mx-space/core test --run comment-thread`
Expected: PASS for both new cases.

- [ ] **Step 5: Update the controller to forward `sort` + `around`**

Edit `comment.controller.ts:142-172`:

```typescript
@Get('/ref/:id')
async getCommentsByRefId(
  @Param() params: MongoIdDto,
  @Query() query: PagerDto,
  @Query('hasAnchor') hasAnchor: string,
  @Query('sort') sort: 'pinned' | 'newest' | 'oldest' = 'pinned',
  @Query('around') around: string | undefined,
  @HasAdminAccess() hasAdminAccess: boolean,
) {
  const { id } = params
  const { page = 1, size = 10 } = query

  const configs = await this.configsService.get('commentOptions')
  const { commentShouldAudit } = configs

  const comments = await this.commentService.getCommentsByRefId(id, {
    page,
    size,
    isAuthenticated: hasAdminAccess,
    commentShouldAudit,
    hasAnchor: hasAnchor === 'true',
    sort: ['pinned', 'newest', 'oldest'].includes(sort) ? sort : 'pinned',
    around,
  })

  const result = transformDataToPaginate(comments)
  const readerIds = this.commentService.collectThreadReaderIds(comments.docs)
  const readers = await this.readerService.findReaderInIds(readerIds)

  Object.assign(result, {
    readers: keyBy(readers, 'id'),
  })

  return result
}
```

- [ ] **Step 6: Run the controller route spec**

Run: `cd /Users/innei/git/innei-repo/mx-core && pnpm --filter @mx-space/core test --run comment-route`
Expected: PASS (existing assertions untouched).

- [ ] **Step 7: Commit**

```bash
cd /Users/innei/git/innei-repo/mx-core
git add apps/core/src/modules/comment/comment.service.ts apps/core/src/modules/comment/comment.controller.ts apps/core/test/src/modules/comment/comment-thread.spec.ts
git commit -m "feat(comment): support around param in /comments/ref/:id"
```

---

### Task 4: api-client — extend `getByRefId` signature + bump version

**Files:**
- Modify: `packages/api-client/controllers/comment.ts`
- Modify: `packages/api-client/__tests__/controllers/comment.test.ts`
- Modify: `packages/api-client/package.json`

- [ ] **Step 1: Write the failing test**

Add a new `test` block to `__tests__/controllers/comment.test.ts`, immediately after the existing "get comment by ref id" test:

```typescript
test('forwards sort + around params on getByRefId', async () => {
  const captured: { url: string; params?: Record<string, unknown> } = {
    url: '',
  }

  // mockResponse only matches by URL, so re-issue and capture the request via
  // the existing mock helper. The existing harness records params on the
  // mocked instance — assert by reading the request adapter spy.
  mockResponse(
    '/comments/ref/ref1',
    {
      data: [],
      pagination: {
        total: 0,
        current_page: 2,
        total_page: 1,
        size: 10,
        has_next_page: false,
        has_prev_page: false,
      },
    },
    'get',
  )

  // Spy on the underlying default adapter call.
  const adapterSpy = vi.spyOn(client.proxy.comment as any, 'getByRefId')

  await client.comment.getByRefId('ref1', {
    page: 2,
    size: 10,
    sort: 'newest',
    around: 'cmt-7',
  })

  expect(adapterSpy).toHaveBeenCalledWith('ref1', {
    page: 2,
    size: 10,
    sort: 'newest',
    around: 'cmt-7',
  })
})
```

If the existing mock harness in `__tests__/helpers/instance.ts` already exposes a way to capture request `params`, use it instead — read the helper before writing the assertion:

```bash
cat /Users/innei/git/innei-repo/mx-core/packages/api-client/__tests__/helpers/instance.ts
```

If the helper exposes a `lastRequest` accessor, switch the assertion to:

```typescript
expect(lastRequest().params).toEqual({
  page: 2,
  size: 10,
  sort: 'newest',
  around: 'cmt-7',
})
```

(Adjust to whatever the helper actually exports. Do not invent a helper that does not exist.)

- [ ] **Step 2: Run and confirm failure**

Run: `cd /Users/innei/git/innei-repo/mx-core && pnpm --filter @mx-space/api-client test --run comment.test`
Expected: FAIL — current signature does not accept `sort` / `around`, or they are dropped before the request.

- [ ] **Step 3: Extend `getByRefId`**

Replace the `getByRefId` method in `packages/api-client/controllers/comment.ts`:

```typescript
/**
 * 获取文章的评论列表
 * @param refId 文章 Id
 */
getByRefId(
  refId: string,
  params: PaginationParams & {
    sort?: 'pinned' | 'newest' | 'oldest'
    around?: string
  } = {},
) {
  const { page, size, sort, around } = params
  return this.proxy.ref(refId).get<
    PaginateResult<CommentThreadItem & { ref: string }> & {
      readers: Record<string, ReaderModel>
    }
  >({
    params: {
      page: page || 1,
      size: size || 10,
      ...(sort ? { sort } : {}),
      ...(around ? { around } : {}),
    },
  })
}
```

(Keep `PaginationParams` untouched — the new fields are local to this method so we do not pollute every controller's pager type.)

- [ ] **Step 4: Re-run the test**

Run: `cd /Users/innei/git/innei-repo/mx-core && pnpm --filter @mx-space/api-client test --run comment.test`
Expected: PASS.

- [ ] **Step 5: Bump the package version**

Edit `packages/api-client/package.json`:

```diff
-  "version": "3.1.0",
+  "version": "3.2.0",
```

(Minor bump because the change is additive and backward-compatible.)

- [ ] **Step 6: Build to refresh `dist/` so downstreams can consume it**

Run: `cd /Users/innei/git/innei-repo/mx-core && pnpm --filter @mx-space/api-client build`
Expected: build succeeds; `dist/index.d.cts` now contains `sort?: 'pinned' | 'newest' | 'oldest'` on `getByRefId`.

- [ ] **Step 7: Commit**

```bash
cd /Users/innei/git/innei-repo/mx-core
git add packages/api-client/controllers/comment.ts packages/api-client/__tests__/controllers/comment.test.ts packages/api-client/package.json
git commit -m "feat(api-client): getByRefId accepts sort + around (v3.2.0)"
```

(Publish to npm — `pnpm publish` from `packages/api-client/` — is out of scope for this plan; coordinate with the maintainer's normal release flow.)

---

### Task 5: Frontend — bump api-client + update query key

**Files:**
- Modify: `apps/web/package.json`
- Modify: `apps/web/src/queries/keys/comment.ts`

- [ ] **Step 1: Bump the api-client version pin**

Edit `apps/web/package.json:42`:

```diff
-    "@mx-space/api-client": "3.1.0",
+    "@mx-space/api-client": "3.2.0",
```

- [ ] **Step 2: Install**

Run: `cd /Users/innei/git/innei-repo/Yohaku && pnpm install --filter @yohaku/web`
Expected: lockfile updates; `node_modules/@mx-space/api-client/dist/index.d.cts` now has `sort?: ...` on `getByRefId`.

(If 3.2.0 is not yet on the npm registry at install time, use `pnpm.overrides` in the workspace root `package.json` to point at the local build:

```json
"pnpm": {
  "overrides": {
    "@mx-space/api-client": "file:../mx-core/packages/api-client"
  }
}
```

Remove the override after the package is published.)

- [ ] **Step 3: Replace the query key builder**

Replace `apps/web/src/queries/keys/comment.ts`:

```typescript
export type CommentSort = 'pinned' | 'newest' | 'oldest'

export const buildCommentsQueryKey = (
  refId: string,
  options?: { sort?: CommentSort; around?: string },
) =>
  [
    'comments',
    refId,
    options?.sort ?? 'pinned',
    options?.around ?? null,
  ] as const
```

- [ ] **Step 4: Typecheck**

Run: `cd /Users/innei/git/innei-repo/Yohaku && pnpm --filter @yohaku/web exec tsc --noEmit -p apps/web/tsconfig.json`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/innei/git/innei-repo/Yohaku
git add apps/web/package.json pnpm-lock.yaml apps/web/src/queries/keys/comment.ts
git commit -m "chore(web): bump @mx-space/api-client to 3.2.0 + key sort/around"
```

---

### Task 6: Frontend — hook accepts `sort` + `around`

**Files:**
- Modify: `apps/web/src/components/modules/comment/hooks.tsx`

- [ ] **Step 1: Replace the hook**

Replace `apps/web/src/components/modules/comment/hooks.tsx` entirely:

```tsx
import { useInfiniteQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { apiClient } from '~/lib/request'
import {
  buildCommentsQueryKey,
  type CommentSort,
} from '~/queries/keys/comment'

export interface UseCommentsQueryOptions {
  sort?: CommentSort
  around?: string
}

export function useCommentsQuery(
  refId: string,
  options: UseCommentsQueryOptions = {},
) {
  const { sort = 'pinned', around } = options
  const key = useMemo(
    () => buildCommentsQueryKey(refId, { sort, around }),
    [refId, sort, around],
  )

  const { data, isLoading, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: key,
    queryFn: async ({ pageParam }) => {
      const data = await apiClient.comment.getByRefId(refId, {
        page: pageParam,
        sort,
        // Only send `around` for the very first page, otherwise paging
        // forward would keep snapping back to the anchor page.
        ...(pageParam === 1 && around ? { around } : {}),
      })

      return data.$serialized
    },
    meta: { persist: false },
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNextPage
        ? lastPage.pagination.currentPage + 1
        : undefined,
    getPreviousPageParam: (firstPage) =>
      firstPage.pagination.currentPage > 1
        ? firstPage.pagination.currentPage - 1
        : undefined,
    initialPageParam: 1 as number,
  })

  return { data, isLoading, fetchNextPage, hasNextPage }
}
```

- [ ] **Step 2: Lint + typecheck the file**

Run: `cd /Users/innei/git/innei-repo/Yohaku && pnpm --filter @yohaku/web lint -- apps/web/src/components/modules/comment/hooks.tsx`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
cd /Users/innei/git/innei-repo/Yohaku
git add apps/web/src/components/modules/comment/hooks.tsx
git commit -m "feat(comment): hook accepts sort + around"
```

---

### Task 7: Frontend — sort + around state atoms

**Files:**
- Create: `apps/web/src/components/modules/comment/atoms.ts`

- [ ] **Step 1: Create the atom file**

```typescript
import { atom } from 'jotai'
import { atomFamily } from 'jotai/utils'

import type { CommentSort } from '~/queries/keys/comment'

/**
 * Per-`refId` UI state atoms for the comment list. Kept in their own file so
 * the provider stays focused on data wiring.
 */
export const commentSortAtomFamily = atomFamily((_refId: string) =>
  atom<CommentSort>('pinned'),
)

export const commentAroundAtomFamily = atomFamily((_refId: string) =>
  atom<string | undefined>(undefined),
)
```

- [ ] **Step 2: Typecheck**

Run: `cd /Users/innei/git/innei-repo/Yohaku && pnpm --filter @yohaku/web exec tsc --noEmit -p apps/web/tsconfig.json`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
cd /Users/innei/git/innei-repo/Yohaku
git add apps/web/src/components/modules/comment/atoms.ts
git commit -m "feat(comment): introduce sort/around atom families"
```

---

### Task 8: Frontend — `CommentToolbar` + i18n keys

**Files:**
- Create: `apps/web/src/components/modules/comment/CommentToolbar.tsx`
- Modify: `apps/web/messages/zh-CN/comment.json` (and other locales already present)

- [ ] **Step 1: Implement the toolbar**

Create `apps/web/src/components/modules/comment/CommentToolbar.tsx`:

```tsx
'use client'

import { useTranslations } from 'next-intl'
import type { FC } from 'react'

import type { CommentSort } from '~/queries/keys/comment'

interface CommentToolbarProps {
  total: number
  sort: CommentSort
  onSortChange: (sort: CommentSort) => void
  onJumpOldest: () => void
  onJumpNewest: () => void
}

const SORTS: CommentSort[] = ['pinned', 'newest', 'oldest']

export const CommentToolbar: FC<CommentToolbarProps> = ({
  total,
  sort,
  onSortChange,
  onJumpOldest,
  onJumpNewest,
}) => {
  const t = useTranslations('comment')

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pb-4 text-sm text-n-7">
      <span>{t('total', { count: total })}</span>

      <div className="flex items-center gap-2">
        <select
          aria-label={t('sort_label')}
          className="rounded-md border border-n-5 bg-transparent px-2 py-1 text-n-9"
          value={sort}
          onChange={(event) => onSortChange(event.target.value as CommentSort)}
        >
          {SORTS.map((option) => (
            <option key={option} value={option}>
              {t(`sort_${option}` as const)}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="rounded-md border border-n-5 px-2 py-1 hover:text-n-9"
          onClick={onJumpOldest}
        >
          {t('jump_oldest')}
        </button>
        <button
          type="button"
          className="rounded-md border border-n-5 px-2 py-1 hover:text-n-9"
          onClick={onJumpNewest}
        >
          {t('jump_newest')}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add i18n keys**

First, list current locale files:

```bash
ls /Users/innei/git/innei-repo/Yohaku/apps/web/messages
```

For each locale (start with `zh-CN/comment.json` and `en/comment.json`), merge the new keys into the existing top-level `comment` namespace, matching the file's existing key style (flat or nested).

`zh-CN/comment.json`:

```json
"total": "共 {count} 条评论",
"sort_label": "排序方式",
"sort_pinned": "楼主置顶",
"sort_newest": "最新",
"sort_oldest": "最早",
"jump_oldest": "跳至最早",
"jump_newest": "跳至最新",
"show_more": "显示更多 ({remaining} 条)",
"show_more_unknown": "显示更多"
```

`en/comment.json`:

```json
"total": "{count} comments",
"sort_label": "Sort by",
"sort_pinned": "Pinned first",
"sort_newest": "Newest",
"sort_oldest": "Oldest",
"jump_oldest": "Jump to oldest",
"jump_newest": "Jump to newest",
"show_more": "Show more ({remaining} left)",
"show_more_unknown": "Show more"
```

Mirror to any other locales already present (Japanese, etc.) using sensible translations or copy the English value as a placeholder — but do NOT skip a locale, or `next-intl` will warn.

- [ ] **Step 3: Lint changed files**

Run: `cd /Users/innei/git/innei-repo/Yohaku && pnpm --filter @yohaku/web lint -- apps/web/src/components/modules/comment/CommentToolbar.tsx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
cd /Users/innei/git/innei-repo/Yohaku
git add apps/web/src/components/modules/comment/CommentToolbar.tsx apps/web/messages
git commit -m "feat(comment): add CommentToolbar + i18n keys"
```

---

### Task 9: Frontend — `CommentProvider` accepts sort/around + manual load button

**Files:**
- Modify: `apps/web/src/components/modules/comment/CommentProvider.tsx`

- [ ] **Step 1: Add sort + around to the provider props**

Edit the component's prop type:

```tsx
export const CommentProvider: FC<{
  refId: string
  sort?: CommentSort
  around?: string
  children: (
    data: InfiniteData<
      PaginateResult<CommentModel & { ref: string }> & {
        readers: Record<string, ReaderModel>
      }
    >,
    commentAtom: PrimitiveAtom<Record<string, CommentThreadViewItem>>,
  ) => ReactNode
}> = ({ children, refId, sort = 'pinned', around }) => {
```

Update the import block to add:

```tsx
import type { CommentSort } from '~/queries/keys/comment'
```

And change the data hook call:

```tsx
const { data, isLoading, fetchNextPage, hasNextPage } = useCommentsQuery(
  refId,
  { sort, around },
)
```

- [ ] **Step 2: Replace the load-more block**

Inside `CommentProvider`, just before the `if (isLoading)` early return, compute:

```tsx
const total = data?.pages[0]?.pagination.total ?? null
const loaded = data?.pages.reduce((sum, page) => sum + page.data.length, 0) ?? 0
const remainingCount = total !== null ? Math.max(0, total - loaded) : null
```

Then in the JSX, replace:

```tsx
{hasNextPage && (
  <LoadMoreIndicator onLoading={fetchNextPage}>
    <CommentSkeleton />
  </LoadMoreIndicator>
)}
```

with:

```tsx
{hasNextPage && (
  <CommentLoadMoreButton
    onClick={() => fetchNextPage()}
    remaining={remainingCount}
  />
)}
```

Add the helper component just below the existing local components (still inside `CommentProvider.tsx`):

```tsx
const CommentLoadMoreButton: FC<{
  onClick: () => void
  remaining: number | null
}> = ({ onClick, remaining }) => {
  const t = useTranslations('comment')
  return (
    <div className="center flex pt-6">
      <button
        type="button"
        onClick={onClick}
        className="rounded-full border border-n-5 bg-transparent px-4 py-2 text-sm text-n-9 hover:bg-accent/10"
      >
        {remaining !== null && remaining > 0
          ? t('show_more', { remaining })
          : t('show_more_unknown')}
      </button>
    </div>
  )
}
```

Delete the now-unused `LoadMoreIndicator` import.

- [ ] **Step 3: Verify `LoadMoreIndicator` is still used elsewhere before deleting anything**

Run: `Grep` for `LoadMoreIndicator` across `apps/web/src`. If other call sites still consume it, leave the source file (`apps/web/src/components/modules/shared/LoadMoreIndicator.tsx`) alone. Do NOT delete it as part of this plan — that is a separate refactor.

- [ ] **Step 4: Lint**

Run: `cd /Users/innei/git/innei-repo/Yohaku && pnpm --filter @yohaku/web lint -- apps/web/src/components/modules/comment/CommentProvider.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/innei/git/innei-repo/Yohaku
git add apps/web/src/components/modules/comment/CommentProvider.tsx
git commit -m "feat(comment): provider takes sort/around + manual load-more button"
```

---

### Task 10: Frontend — wire `Comments.tsx` (toolbar + atoms + anchor scroll)

**Files:**
- Modify: `apps/web/src/components/modules/comment/Comments.tsx`
- Modify: `apps/web/src/components/modules/comment/Comment.tsx` (add `data-comment-id` if missing)

- [ ] **Step 1: Verify `Comment.tsx` carries an anchor id**

Run: `Grep` for `data-comment-id` in `apps/web/src/components/modules/comment/Comment.tsx`. If absent, add `data-comment-id={commentId}` to the root JSX element of the comment row. Keep the change minimal.

- [ ] **Step 2: Replace `Comments.tsx`**

```tsx
'use client'

import { BusinessEvents } from '@mx-space/webhook'
import { useAtom } from 'jotai'
import type { FC } from 'react'
import { memo, useEffect } from 'react'

import { ErrorBoundary } from '~/components/common/ErrorBoundary'
import { BottomToUpSoftScaleTransitionView } from '~/components/ui/transition'
import { useTypeScriptHappyCallback } from '~/hooks/common/use-callback'
import { WsEvent } from '~/socket/util'

import {
  commentAroundAtomFamily,
  commentSortAtomFamily,
} from './atoms'
import { Comment } from './Comment'
import { CommentBoxProvider } from './CommentBox/providers'
import { CommentProvider, useUpdateComment } from './CommentProvider'
import { CommentToolbar } from './CommentToolbar'
import type { CommentBaseProps } from './types'

const ANCHOR_HASH_PREFIX = '#comment-'

export const Comments: FC<CommentBaseProps> = ({ refId }) => {
  const [sort, setSort] = useAtom(commentSortAtomFamily(refId))
  const [around, setAround] = useAtom(commentAroundAtomFamily(refId))

  // Hydrate `around` from the URL hash on first paint.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const hash = window.location.hash
    if (hash.startsWith(ANCHOR_HASH_PREFIX)) {
      setAround(hash.slice(ANCHOR_HASH_PREFIX.length))
    }
  }, [setAround])

  // "Jump to oldest" / "Jump to newest" reuse the sort axis: switching the
  // sort moves the requested edge onto page 1, which is the natural anchor
  // for both the user (top of list) and the query cache.
  const onJumpOldest = () => {
    setAround(undefined)
    setSort('oldest')
  }
  const onJumpNewest = () => {
    setAround(undefined)
    setSort('newest')
  }

  return (
    <ErrorBoundary>
      <CommentProvider refId={refId} sort={sort} around={around}>
        {useTypeScriptHappyCallback(
          (data) => {
            const comments = data?.pages.flatMap((page) => page.data) ?? []
            const total = data?.pages[0]?.pagination.total ?? comments.length

            return (
              <>
                <CommentToolbar
                  total={total}
                  sort={sort}
                  onSortChange={(next) => {
                    setAround(undefined)
                    setSort(next)
                  }}
                  onJumpOldest={onJumpOldest}
                  onJumpNewest={onJumpNewest}
                />

                <ul className="min-h-[400px] list-none space-y-6">
                  {comments.map((comment) => (
                    <BottomToUpSoftScaleTransitionView key={comment.id}>
                      <CommentListItem commentId={comment.id} refId={refId} />
                    </BottomToUpSoftScaleTransitionView>
                  ))}
                  <CommentEventHandler refId={refId} />
                  <CommentAnchorScroller around={around} loadedCount={comments.length} />
                </ul>
              </>
            )
          },
          [refId, sort, around, setSort, setAround],
        )}
      </CommentProvider>
    </ErrorBoundary>
  )
}

const CommentAnchorScroller: FC<{
  around?: string
  loadedCount: number
}> = ({ around, loadedCount }) => {
  useEffect(() => {
    if (!around) return
    const target = document.querySelector(`[data-comment-id="${around}"]`)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [around, loadedCount])
  return null
}

const CommentListItem: FC<{ commentId: string; refId: string }> = memo(
  function CommentListItem({ commentId, refId }) {
    return (
      <CommentBoxProvider refId={refId}>
        <Comment commentId={commentId} />
      </CommentBoxProvider>
    )
  },
)

// CommentEventHandler block (unchanged) — copy verbatim from the previous
// version of this file. This plan does not modify it.
```

(Re-paste the existing `CommentEventHandler` body verbatim from the pre-edit version.)

- [ ] **Step 3: Lint**

Run: `cd /Users/innei/git/innei-repo/Yohaku && pnpm --filter @yohaku/web lint -- apps/web/src/components/modules/comment/Comments.tsx apps/web/src/components/modules/comment/Comment.tsx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
cd /Users/innei/git/innei-repo/Yohaku
git add apps/web/src/components/modules/comment/Comments.tsx apps/web/src/components/modules/comment/Comment.tsx
git commit -m "feat(comment): wire sort/around state, toolbar, anchor scroll"
```

---

### Task 11: Manual verification

The unit tests cover backend wiring; per the user's instruction the frontend has no automated tests, so the in-browser pass is the only feature-correctness check.

- [ ] **Step 1: Start dev servers**

```bash
cd /Users/innei/git/innei-repo/mx-core && pnpm --filter @mx-space/core dev
# in a second shell:
cd /Users/innei/git/innei-repo/Yohaku && pnpm --filter @yohaku/web dev
```

- [ ] **Step 2: Verify the golden path in a browser**

Open `http://localhost:2323/<a post with > 30 comments>`.

Confirm:
1. The list no longer auto-loads on scroll; a "显示更多 (N 条)" button sits at the bottom.
2. The toolbar shows total count and a sort selector.
3. Switching sort to "最新" / "最早" reloads page 1 with the requested order.
4. "跳至最早" / "跳至最新" change the sort and put the corresponding edge on top.
5. Visiting the page with `#comment-<id>` for a comment that lives on page 4 jumps the user to that comment without forcing them through pages 1–3 manually, and the comment is in the viewport.
6. Clicking "显示更多" appends the next page (the URL anchor does NOT keep snapping back on subsequent loads — verify by clicking it twice).

- [ ] **Step 3: Edge-case pass**

- A post with 0 comments still shows the "no comments yet" empty state.
- A post with exactly `size` comments shows no "显示更多" button.
- Pinned comments remain sticky on top under `sort=pinned`, and lose their sticky position under `sort=newest` / `sort=oldest`.

- [ ] **Step 4: Report back**

Summarize: which scenarios passed, which (if any) need a follow-up.

---

## Self-Review Checklist (run after writing code, before merging)

1. **Spec coverage:**
   - Soft pagination (manual button) — Task 9
   - Sort selector — Tasks 1, 2, 4, 6, 8
   - Jump to oldest / newest — Tasks 8, 10
   - Anchor / `around` deep-linking — Tasks 3, 4, 6, 10
   - Total count surfaced to UI — Task 8 (toolbar), Task 9 (load-more remaining)
   - api-client kept in sync — Task 4

2. **Placeholder scan:** No `TBD` / `implement later` / "similar to Task N" patterns. The only "see existing" instructions (e.g. `Grep` for an existing helper, copy `CommentEventHandler` verbatim) are concrete reads, not deferred work.

3. **Type consistency:**
   - `CommentSort` is the single source of truth for sort literals (`~/queries/keys/comment`); imported by hook, atoms, toolbar, provider.
   - Backend `sort` enum (zod + service) matches frontend literally (`'pinned' | 'newest' | 'oldest'`).
   - api-client `getByRefId` typed extension matches both ends.
   - `around` is a plain `string | undefined` everywhere.

4. **Backward compatibility:** `sort` defaults to `pinned` (= legacy ordering); `around` is optional; api-client minor-bumped (additive); `LoadMoreIndicator` is removed only from `CommentProvider.tsx` (other call sites untouched, source file kept).

5. **Frontend tests:** Per user instruction, none. Backend service spec covers the riskiest logic (sort selection, around resolution).
