import type {
  CommentModel,
  CommentThreadItem,
  PaginateResult,
} from '@mx-space/api-client'
import { CollectionRefTypes } from '@mx-space/api-client'
import type { InfiniteData } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'

import type { BlockInfo } from './anchor-utils'
import type { CommentThreadInfiniteData, CommentWithAnchor } from './thread'
import {
  buildCommentTreeItem,
  groupCommentsByQuote,
  insertCommentIntoThreadPages,
  mergeThreadRepliesIntoPages,
} from './thread'
import type { BlockAnchor, RangeAnchor } from './types'

const makeComment = (
  id: string,
  createdAt: string,
  overrides: Partial<CommentModel> = {},
): CommentModel => ({
  id,
  createdAt,
  refType: 'posts' as CollectionRefTypes,
  refId: 'post-id',
  state: 1,
  author: `author-${id}`,
  text: `text-${id}`,
  mail: null,
  url: null,
  ip: null,
  agent: null,
  pin: false,
  avatar: '',
  parentCommentId: null,
  rootCommentId: null,
  replyCount: 0,
  latestReplyAt: null,
  isDeleted: false,
  deletedAt: null,
  isWhispers: false,
  location: null,
  authProvider: null,
  readerId: null,
  editedAt: null,
  anchor: null,
  ...overrides,
})

describe('comment thread helpers', () => {
  it('rebuilds nested children from flat replies using parentCommentId', () => {
    const root: CommentThreadItem = {
      ...makeComment('root', '2026-03-14T10:00:00.000Z', {
        parentCommentId: null,
        rootCommentId: null,
      }),
      replies: [
        makeComment('child-2', '2026-03-14T10:03:00.000Z', {
          parentCommentId: 'child-1',
          rootCommentId: 'root',
        }),
        makeComment('child-1', '2026-03-14T10:01:00.000Z', {
          parentCommentId: 'root',
          rootCommentId: 'root',
        }),
        makeComment('orphan', '2026-03-14T10:02:00.000Z', {
          parentCommentId: 'missing-parent',
          rootCommentId: 'root',
        }),
      ],
      replyWindow: {
        total: 3,
        returned: 3,
        threshold: 20,
        hasHidden: false,
        hiddenCount: 0,
      },
    }

    const tree = buildCommentTreeItem(root)

    expect(tree.children.map((comment) => comment.id)).toEqual([
      'child-1',
      'orphan',
    ])
    expect(tree.children[0]?.children.map((comment) => comment.id)).toEqual([
      'child-2',
    ])
  })

  it('groups comments by quote into ordered sections', () => {
    const blockInfos: BlockInfo[] = [
      {
        index: 0,
        blockId: 'b1',
        type: 'paragraph',
        textContent: 'alpha beta gamma delta',
        fingerprint: 'fp1',
      },
    ]
    const rangeA: RangeAnchor = {
      mode: 'range',
      blockId: 'b1',
      blockType: 'paragraph',
      blockFingerprint: 'fp1',
      snapshotText: 'alpha beta gamma delta',
      quote: 'alpha',
      prefix: '',
      suffix: ' beta gamma delta',
      startOffset: 0,
      endOffset: 5,
      lang: null,
    }
    const rangeB: RangeAnchor = {
      ...rangeA,
      quote: 'gamma',
      prefix: 'alpha beta ',
      suffix: ' delta',
      startOffset: 11,
      endOffset: 16,
    }
    const blockAnchor: BlockAnchor = {
      mode: 'block',
      blockId: 'b1',
      blockType: 'paragraph',
      blockFingerprint: 'fp1',
      snapshotText: 'alpha beta gamma delta',
      lang: null,
    }

    const c1 = makeComment('c1', '2026-03-14T10:00:00.000Z', {
      anchor: rangeB,
    } as Partial<CommentModel>) as CommentWithAnchor
    const c2 = makeComment('c2', '2026-03-14T10:01:00.000Z', {
      anchor: rangeA,
    } as Partial<CommentModel>) as CommentWithAnchor
    const c3 = makeComment('c3', '2026-03-14T10:02:00.000Z', {
      parentCommentId: 'c2',
      rootCommentId: 'c2',
    }) as CommentWithAnchor
    const c4 = makeComment('c4', '2026-03-14T10:03:00.000Z', {
      anchor: blockAnchor,
    } as Partial<CommentModel>) as CommentWithAnchor

    const grouping = groupCommentsByQuote(
      [c1, c2, c3, c4] as CommentWithAnchor[],
      blockInfos,
      null,
    )

    // Order: rangeA (offset 0) first, rangeB (offset 11) second, then block.
    expect(grouping.sections.map((s) => s.kind)).toEqual([
      'quote',
      'quote',
      'block',
    ])
    expect(grouping.counts).toEqual({ total: 4, quotes: 2, blockwise: 1 })

    const [s1, s2, s3] = grouping.sections
    expect(s1.kind).toBe('quote')
    if (s1.kind === 'quote') {
      expect(s1.quoteText).toBe('alpha')
      // c2 (root) and c3 (reply) belong to s1.
      expect(s1.comments.map((c) => c.id)).toEqual(['c2', 'c3'])
    }
    expect(s2.kind).toBe('quote')
    if (s2.kind === 'quote') {
      expect(s2.quoteText).toBe('gamma')
      expect(s2.comments.map((c) => c.id)).toEqual(['c1'])
    }
    expect(s3.kind).toBe('block')
    if (s3.kind === 'block') {
      expect(s3.comments.map((c) => c.id)).toEqual(['c4'])
    }
  })

  it('ignores range anchor lang mismatch and folds into block section', () => {
    const blockInfos: BlockInfo[] = [
      {
        index: 0,
        blockId: 'b1',
        type: 'paragraph',
        textContent: 'foo bar',
        fingerprint: 'fp1',
      },
    ]
    const range: RangeAnchor = {
      mode: 'range',
      blockId: 'b1',
      blockType: 'paragraph',
      blockFingerprint: 'fp1',
      snapshotText: 'foo bar',
      quote: 'foo',
      prefix: '',
      suffix: ' bar',
      startOffset: 0,
      endOffset: 3,
      lang: 'ja',
    }
    const c = makeComment('c1', '2026-03-14T10:00:00.000Z', {
      anchor: range,
    } as Partial<CommentModel>) as CommentWithAnchor

    const grouping = groupCommentsByQuote([c], blockInfos, null)
    expect(grouping.sections.map((s) => s.kind)).toEqual(['block'])
    expect(grouping.counts).toEqual({ total: 1, quotes: 0, blockwise: 1 })
  })

  it('merges loaded middle replies back into paginated thread data', () => {
    const root: CommentThreadItem = {
      ...makeComment('root', '2026-03-14T10:00:00.000Z', {
        parentCommentId: null,
        rootCommentId: null,
      }),
      ref: {
        id: 'post-id',
        type: CollectionRefTypes.Post,
        title: 'a post',
        slug: 'a-post',
      },
      replies: [
        makeComment('child-1', '2026-03-14T10:01:00.000Z', {
          parentCommentId: 'root',
          rootCommentId: 'root',
        }),
        makeComment('child-3', '2026-03-14T10:03:00.000Z', {
          parentCommentId: 'root',
          rootCommentId: 'root',
        }),
      ],
      replyWindow: {
        total: 3,
        returned: 2,
        threshold: 20,
        hasHidden: true,
        hiddenCount: 1,
        nextCursor: 'cursor-1',
      },
    }

    const data = {
      pageParams: [1],
      pages: [
        {
          data: [root],
          pagination: {
            page: 1,
            totalPages: 1,
            hasPrevPage: false,
            hasNextPage: false,
            size: 10,
            total: 1,
          },
        },
      ],
    } satisfies InfiniteData<PaginateResult<CommentThreadItem>>

    const next = mergeThreadRepliesIntoPages(data, {
      rootCommentId: 'root',
      replies: [
        makeComment('child-2', '2026-03-14T10:02:00.000Z', {
          parentCommentId: 'child-1',
          rootCommentId: 'root',
        }) as unknown as CommentWithAnchor,
      ],
      replyWindow: {
        total: 3,
        returned: 3,
        threshold: 20,
        hasHidden: false,
        hiddenCount: 0,
      },
    })

    expect(
      next.pages[0]?.data[0]?.replies.map((comment) => comment.id),
    ).toEqual(['child-1', 'child-2', 'child-3'])
    expect(next.pages[0]?.data[0]?.replyWindow.hasHidden).toBe(false)
  })
})

describe('insertCommentIntoThreadPages', () => {
  const makeRoot = (
    id: string,
    createdAt: string,
    overrides: Partial<CommentModel> = {},
  ): CommentThreadItem => ({
    ...makeComment(id, createdAt, overrides),
    replies: [],
    replyWindow: {
      total: 0,
      returned: 0,
      threshold: 20,
      hasHidden: false,
      hiddenCount: 0,
    },
  })

  const makePage = (
    roots: CommentThreadItem[],
    pagination: Partial<PaginateResult<CommentThreadItem>['pagination']> = {},
  ) => ({
    data: roots,
    pagination: {
      page: 1,
      totalPages: 1,
      hasPrevPage: false,
      hasNextPage: false,
      size: 10,
      total: roots.length,
      ...pagination,
    },
    readers: {},
  })

  const makeData = (
    pages: ReturnType<typeof makePage>[],
  ): CommentThreadInfiniteData => ({
    pageParams: pages.map((_, i) => i + 1),
    pages,
  })

  it('inserts a top-level comment after pinned roots and bumps totals', () => {
    const data = makeData([
      makePage(
        [
          makeRoot('pinned-1', '2026-03-14T09:00:00.000Z', { pin: true }),
          makeRoot('old-1', '2026-03-14T10:00:00.000Z'),
        ],
        { total: 5, hasNextPage: true },
      ),
      makePage([makeRoot('old-2', '2026-03-13T10:00:00.000Z')], {
        page: 2,
        total: 5,
      }),
    ])

    const next = insertCommentIntoThreadPages(
      data,
      makeComment('fresh', '2026-03-14T11:00:00.000Z') as CommentWithAnchor,
      { sort: 'pinned' },
    )

    expect(next.pages[0]?.data.map((c) => c.id)).toEqual([
      'pinned-1',
      'fresh',
      'old-1',
    ])
    expect(next.pages.map((page) => page.pagination.total)).toEqual([6, 6])
  })

  it('appends a top-level comment to the last page for oldest sort', () => {
    const data = makeData([
      makePage([makeRoot('a', '2026-03-13T10:00:00.000Z')]),
      makePage([makeRoot('b', '2026-03-14T10:00:00.000Z')], { page: 2 }),
    ])

    const next = insertCommentIntoThreadPages(
      data,
      makeComment('fresh', '2026-03-14T11:00:00.000Z') as CommentWithAnchor,
      { sort: 'oldest' },
    )

    expect(next.pages[0]?.data.map((c) => c.id)).toEqual(['a'])
    expect(next.pages[1]?.data.map((c) => c.id)).toEqual(['b', 'fresh'])
  })

  it('inserts a reply into its root sorted by createdAt and bumps the window', () => {
    const root = makeRoot('root', '2026-03-14T10:00:00.000Z')
    root.replies = [
      makeComment('child-1', '2026-03-14T10:01:00.000Z', {
        parentCommentId: 'root',
        rootCommentId: 'root',
      }),
    ]
    root.replyCount = 1
    root.replyWindow = {
      total: 1,
      returned: 1,
      threshold: 20,
      hasHidden: false,
      hiddenCount: 0,
    }
    const data = makeData([makePage([root])])

    const next = insertCommentIntoThreadPages(
      data,
      makeComment('child-2', '2026-03-14T10:02:00.000Z', {
        parentCommentId: 'child-1',
        rootCommentId: 'root',
      }) as CommentWithAnchor,
    )

    const nextRoot = next.pages[0]?.data[0]
    expect(nextRoot?.replies.map((c) => c.id)).toEqual(['child-1', 'child-2'])
    expect(nextRoot?.replyCount).toBe(2)
    expect(nextRoot?.replyWindow).toMatchObject({ total: 2, returned: 2 })
    expect(next.pages[0]?.pagination.total).toBe(1)
  })

  it('returns the same reference when the comment already exists', () => {
    const root = makeRoot('root', '2026-03-14T10:00:00.000Z')
    root.replies = [
      makeComment('child-1', '2026-03-14T10:01:00.000Z', {
        parentCommentId: 'root',
        rootCommentId: 'root',
      }),
    ]
    const data = makeData([makePage([root])])

    expect(
      insertCommentIntoThreadPages(
        data,
        makeComment('root', '2026-03-14T10:00:00.000Z') as CommentWithAnchor,
      ),
    ).toBe(data)
    expect(
      insertCommentIntoThreadPages(
        data,
        makeComment('child-1', '2026-03-14T10:01:00.000Z', {
          parentCommentId: 'root',
          rootCommentId: 'root',
        }) as CommentWithAnchor,
      ),
    ).toBe(data)
  })

  it('returns the same reference when the reply root is not loaded', () => {
    const data = makeData([
      makePage([makeRoot('root', '2026-03-14T10:00:00.000Z')]),
    ])

    expect(
      insertCommentIntoThreadPages(
        data,
        makeComment('reply', '2026-03-14T10:02:00.000Z', {
          parentCommentId: 'other-root',
          rootCommentId: 'other-root',
        }) as CommentWithAnchor,
      ),
    ).toBe(data)
  })

  it('merges the reader into the target page readers map', () => {
    const data = makeData([
      makePage([makeRoot('root', '2026-03-14T10:00:00.000Z')]),
    ])

    const next = insertCommentIntoThreadPages(
      data,
      makeComment('fresh', '2026-03-14T11:00:00.000Z', {
        readerId: 'reader-1',
      }) as CommentWithAnchor,
      {
        reader: {
          id: 'reader-1',
          email: 'r@example.com',
          name: 'Reader',
          handle: 'reader',
          image: '',
          role: 'owner',
        },
      },
    )

    expect(next.pages[0]?.readers?.['reader-1']).toMatchObject({
      name: 'Reader',
      role: 'owner',
    })
  })
})
