# Mobile Me Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Tab 4 as a centered identity hero with tappable activity counts (liked / my comments / recently read), plus App Store minimums (privacy policy link, non-owner account deletion).

**Architecture:** Local SQLite remains the source of truth for likes and reading history. My-comments is network-first via a new mx-core reader endpoint. The Me screen stays one scroll surface; the three counts push `(me)` stack lists. Privacy lives on the web app at the stable URL `https://innei.in/privacy`.

**Tech Stack:** Expo Router NativeTabs, Drizzle + expo-sqlite, TanStack Query, next-intl, better-auth Expo client.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-15-mobile-me-tab-design.md`
- Repo root `/Users/innei/git/innei-repo/Yohaku`; iOS only (`apps/mobile/AGENTS.md`)
- Expo SDK 57; never `npx expo` — `pnpm exec expo`
- Zero comments / JSDoc unless a hidden constraint
- Lint/typecheck only files you touch: `cd apps/mobile && pnpm exec eslint <files>` / `pnpm exec vitest run <file>`
- i18n: every new mobile key in `en, ja, ko, zh, zh-TW`; every new web key in all five `apps/web/src/messages/*` namespaces
- No self-authored Terms page; no appearance toggle; thinking is never recorded as reading
- Owner session must not see Delete Account
- Each task commits only its own files

## File map

| File | Responsibility |
| --- | --- |
| `apps/mobile/src/db/schema.ts` | Add `readingHistory` table |
| `apps/mobile/drizzle/0004_*.sql` + `migrations.js` + `meta/_journal.json` | Migration |
| `apps/mobile/src/interactions/reading.ts` | `recordReading` upsert + cap 100 |
| `apps/mobile/src/interactions/liked-count.ts` | Count excluding `recently-down` |
| `apps/mobile/src/screens/me/activity-visibility.ts` | Show comments tile / delete row |
| `apps/mobile/src/screens/me/activity-stats.tsx` | Paper count tiles |
| `apps/mobile/src/screens/me/me-screen.tsx` | Hero + stats + rows |
| `apps/mobile/src/screens/me/liked-list.tsx` | Liked stack list |
| `apps/mobile/src/screens/me/reading-list.tsx` | Reading stack list |
| `apps/mobile/src/screens/me/my-comments-list.tsx` | Network comments list |
| `apps/mobile/src/app/(tabs)/(me)/liked.tsx` etc. | Routes |
| `apps/mobile/src/api/client.ts` + `types.ts` | Reader comments + report + delete |
| `apps/mobile/src/screens/me/provider-icon.tsx` | Apple glyph |
| `apps/web/src/app/[locale]/privacy/page.tsx` | Public privacy policy |
| `../mx-core` | Reader comments GET, report POST, delete-user, enable Apple — **separate repo, Task 9** |

**Independent later plan (do not block Tasks 1–6):** mx-core companions. Tasks 7–8 can land client UI against the contract; they 404 until Task 9.

---

### Task 1: Reading history data layer

**Files:**
- Modify: `apps/mobile/src/db/schema.ts`
- Create: `apps/mobile/src/interactions/reading.ts`
- Test: `apps/mobile/src/interactions/reading.test.ts`
- Generate: `apps/mobile/drizzle/0004_*.sql`, update `drizzle/migrations.js`, `drizzle/meta/_journal.json`

**Interfaces:**
- Consumes: existing Drizzle `db` pattern from `upsert-sets.test.ts` (`better-sqlite3` + apply `drizzle/*.sql`)
- Produces:
  - `export type ReadingKind = 'post' | 'note'`
  - `export const READING_HISTORY_CAP = 100`
  - `export async function recordReading(database: ReturnType<typeof drizzle>, input: { kind: ReadingKind; openedAt?: Date; refId: string }): Promise<void>`
  - table `reading_history` (`ref_id` PK, `kind` text, `opened_at` integer ms)

- [ ] **Step 1: Write the failing test**

```ts
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

import Database from 'better-sqlite3'
import { desc } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'

import { readingHistory } from '@/db/schema'

import { READING_HISTORY_CAP, recordReading } from './reading'

const migrationsDir = path.resolve(import.meta.dirname, '../../drizzle')

function createDb() {
  const sqlite = new Database(':memory:')
  for (const file of readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .sort()) {
    const content = readFileSync(path.join(migrationsDir, file), 'utf8')
    for (const statement of content.split('--> statement-breakpoint')) {
      sqlite.exec(statement)
    }
  }
  return drizzle(sqlite)
}

describe('recordReading', () => {
  let db: ReturnType<typeof createDb>
  beforeEach(() => {
    db = createDb()
  })

  it('upserts the same article and keeps one row', async () => {
    const first = new Date('2026-08-01T00:00:00.000Z')
    const second = new Date('2026-08-02T00:00:00.000Z')
    await recordReading(db, { refId: 'p1', kind: 'post', openedAt: first })
    await recordReading(db, { refId: 'p1', kind: 'post', openedAt: second })
    const rows = await db.select().from(readingHistory)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.openedAt).toEqual(second)
  })

  it('drops the oldest rows past READING_HISTORY_CAP', async () => {
    for (let i = 0; i < READING_HISTORY_CAP + 3; i += 1) {
      await recordReading(db, {
        refId: `p${i}`,
        kind: 'post',
        openedAt: new Date(1_700_000_000_000 + i * 1000),
      })
    }
    const rows = await db
      .select()
      .from(readingHistory)
      .orderBy(desc(readingHistory.openedAt))
    expect(rows).toHaveLength(READING_HISTORY_CAP)
    expect(rows.at(-1)?.refId).toBe('p3')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && pnpm exec vitest run src/interactions/reading.test.ts`

Expected: FAIL — `readingHistory` / `recordReading` not defined, or migration SQL missing the table.

- [ ] **Step 3: Schema + implementation**

Add to `schema.ts` after `likedRefs`:

```ts
export const readingHistory = sqliteTable('reading_history', {
  refId: text('ref_id').primaryKey(),
  kind: text('kind').$type<ReadingKind>().notNull(),
  openedAt: integer('opened_at', { mode: 'timestamp_ms' }).notNull(),
})

export type ReadingKind = 'post' | 'note'
export type ReadingHistoryRow = typeof readingHistory.$inferSelect
```

Run `cd apps/mobile && pnpm exec drizzle-kit generate`. If `migrations.js` is not updated, add `m0004` import like `m0003`.

`reading.ts`:

```ts
import { asc, count } from 'drizzle-orm'

import { readingHistory, type ReadingKind } from '@/db/schema'

export const READING_HISTORY_CAP = 100

export async function recordReading(
  database: {
    insert: typeof import('@/db').db.insert
    delete: typeof import('@/db').db.delete
    select: typeof import('@/db').db.select
  },
  input: { kind: ReadingKind; openedAt?: Date; refId: string },
) {
  const openedAt = input.openedAt ?? new Date()
  await database
    .insert(readingHistory)
    .values({ refId: input.refId, kind: input.kind, openedAt })
    .onConflictDoUpdate({
      target: readingHistory.refId,
      set: { kind: input.kind, openedAt },
    })
  const [{ total }] = await database
    .select({ total: count() })
    .from(readingHistory)
  if (total <= READING_HISTORY_CAP) return
  const overflow = total - READING_HISTORY_CAP
  const oldest = await database
    .select({ refId: readingHistory.refId })
    .from(readingHistory)
    .orderBy(asc(readingHistory.openedAt))
    .limit(overflow)
  if (oldest.length === 0) return
  await database.delete(readingHistory).where(
    inArray(
      readingHistory.refId,
      oldest.map((row) => row.refId),
    ),
  )
}
```

Use `inArray` from `drizzle-orm`. Type `database` as the drizzle instance used in tests (`ReturnType<typeof drizzle>`) if the structural type above is noisy — match `createDb()` return.

- [ ] **Step 4: Run tests**

`cd apps/mobile && pnpm exec vitest run src/interactions/reading.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/db/schema.ts apps/mobile/src/interactions/reading.ts apps/mobile/src/interactions/reading.test.ts apps/mobile/drizzle
git commit -m "$(cat <<'EOF'
feat(mobile): persist reading history with a 100-row cap

EOF
)"
```

---

### Task 2: Liked count + Me-row visibility

**Files:**
- Create: `apps/mobile/src/interactions/liked-count.ts`
- Test: `apps/mobile/src/interactions/liked-count.test.ts`
- Create: `apps/mobile/src/screens/me/activity-visibility.ts`
- Test: `apps/mobile/src/screens/me/activity-visibility.test.ts`

**Interfaces:**
- Consumes: `LikedKind` from `@/db/schema`; `SessionUser` from `@/auth/session-store`
- Produces:
  - `export function likedActivityCount(rows: { kind: LikedKind }[]): number`
  - `export function showMyComments(session: SessionUser | null): boolean`
  - `export function showDeleteAccount(session: SessionUser | null): boolean`

- [ ] **Step 1: Failing tests**

`liked-count.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { likedActivityCount } from './liked-count'

describe('likedActivityCount', () => {
  it('ignores thinking downvotes', () => {
    expect(
      likedActivityCount([
        { kind: 'post' },
        { kind: 'note' },
        { kind: 'recently-up' },
        { kind: 'recently-down' },
      ]),
    ).toBe(3)
  })
})
```

`activity-visibility.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import type { SessionUser } from '@/auth/session-store'

import { showDeleteAccount, showMyComments } from './activity-visibility'

const reader: SessionUser = {
  id: '1',
  name: '阿崔',
  email: null,
  image: null,
  handle: 'cuix',
  role: 'reader',
  provider: 'github',
}

describe('activity visibility', () => {
  it('hides comments and delete when signed out', () => {
    expect(showMyComments(null)).toBe(false)
    expect(showDeleteAccount(null)).toBe(false)
  })
  it('shows comments for any session and hides delete for owner', () => {
    expect(showMyComments(reader)).toBe(true)
    expect(showDeleteAccount(reader)).toBe(true)
    expect(showDeleteAccount({ ...reader, role: 'owner' })).toBe(false)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

`cd apps/mobile && pnpm exec vitest run src/interactions/liked-count.test.ts src/screens/me/activity-visibility.test.ts`

- [ ] **Step 3: Implement**

```ts
// liked-count.ts
import type { LikedKind } from '@/db/schema'

export function likedActivityCount(rows: { kind: LikedKind }[]): number {
  return rows.filter((row) => row.kind !== 'recently-down').length
}
```

```ts
// activity-visibility.ts
import type { SessionUser } from '@/auth/session-store'

export function showMyComments(session: SessionUser | null): boolean {
  return session != null
}

export function showDeleteAccount(session: SessionUser | null): boolean {
  return session != null && session.role !== 'owner'
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit** `feat(mobile): gate me-tab activity counts and delete-account`

---

### Task 3: i18n copy (mobile)

**Files:** Modify all five `apps/mobile/src/i18n/messages/{zh,zh-TW,en,ja,ko}.ts`

Add under `me`:

```ts
liked: '赞过的',
comments: '我的评论',
reading: '最近阅读',
privacy: '隐私政策',
deleteAccount: '删除账号',
deleteAccountConfirm: '删除后无法恢复，确定删除这个账号吗？',
deleteAccountFailed: '删除失败，稍后再试',
likedEmpty: '还没有赞过内容',
likedEmptyHint: '在博文、手记或思考里点赞后会出现在这里',
commentsEmpty: '还没有评论',
commentsEmptyHint: '在文章或思考里留言后会出现在这里',
readingEmpty: '还没有阅读记录',
readingEmptyHint: '打开博文或手记后会出现在这里',
unavailable: '内容已不可用',
```

`comment.report`: `'举报'`
`comment.reportConfirm`: `'要举报这条评论吗？'`
`comment.reportDone`: `'已收到举报'`
`comment.reportFailed`: `'举报失败，稍后再试'`

English (required): Liked / My comments / Recently read / Privacy policy / Delete account / Delete this account? This cannot be undone. / Couldn’t delete the account. Try again shortly. / No likes yet / Like a post, note, or thought and it will show up here. / No comments yet / Comments you leave on posts or thoughts will show up here. / No reading history yet / Open a post or note and it will show up here. / This content is no longer available. / Report / Report this comment? / Report received. / Couldn’t send the report. Try again shortly.

Fill ja / ko / zh-TW with natural equivalents (not English leftovers).

- [ ] **Step 1: Add keys to `zh.ts` first, run** `cd apps/mobile && pnpm exec vitest run src/i18n/messages.test.ts`

Expected: FAIL — other locales missing keys.

- [ ] **Step 2: Add the same keys to the other four files**

- [ ] **Step 3: Re-run messages.test.ts — PASS**

- [ ] **Step 4: Commit** `feat(mobile): add me-tab activity and store-compliance copy`

---

### Task 4: Me screen layout

**Files:**
- Create: `apps/mobile/src/screens/me/activity-stats.tsx`
- Modify: `apps/mobile/src/screens/me/me-screen.tsx`
- Modify: `apps/mobile/src/app/(tabs)/(me)/_layout.tsx` only if stack titles need setting (keep transparent header)

**Interfaces:**
- Consumes: `showMyComments`, `showDeleteAccount`, `likedActivityCount`, `recordReading` (not yet on this screen), `useSession`, `useLiveQuery` on `likedRefs` and `readingHistory`
- Produces: Me screen matching spec section「整页结构」. Tiles push `/liked`, `/comments`, `/reading` (Task 5–7 add those files; pushing a missing route is OK for this commit if you add placeholder routes in the same task)

Placeholder routes allowed in this task so tiles don’t crash:

```tsx
// apps/mobile/src/app/(tabs)/(me)/liked.tsx
import { AppText } from '@/components/ui'
export default function LikedRoute() {
  return <AppText variant="largeTitleSans"> </AppText>
}
```

Replace in Task 5. Same for `comments.tsx` / `reading.tsx` if you split; otherwise create real lists in 5–7 and only wire `router.push` here.

Hero: reuse `Avatar` + identity text, wrap in a column `alignItems: 'center'`. Signed-out keeps existing `Button` `signIn`. Stats: paper tiles (`palette.surface.paper`, `shadow.paperSmall`, radius 14, `borderCurve: 'continuous'`). Number via `SlotText` when the value is a number; comments tile while `total == null` renders the label and an empty number slot (do not pass `0`).

Privacy row: `WebBrowser.openBrowserAsync('https://innei.in/privacy')`.

Delete row: `showDeleteAccount(session)` — `Alert` using `me.deleteAccountConfirm`; on confirm call `deleteAccount()` stub:

```ts
// apps/mobile/src/auth/session.ts — add
export async function deleteAccount(): Promise<void> {
  await getAuthClient().deleteUser()
  setSession(null)
}
```

If `deleteUser` is missing on the typed client, call `getAuthClient().$fetch('/delete-user', { method: 'POST' })` then `signOut()`. Keep local likes/reading.

- [ ] **Step 1: Implement MeScreen + ActivityStats** (UI; logic already tested in Task 2)

Wire `useLiveQuery(db.select().from(likedRefs))` → `likedActivityCount`. Reading count = `readingHistory` row count. Comments: `useQuery` enabled only when `showMyComments(session)`; use `commentTotalFromPage` from Task 7 if that helper exists, otherwise leave comments count `null` until Task 7.

- [ ] **Step 2: `pnpm exec eslint` the touched me-screen files**

- [ ] **Step 3: Commit** `feat(mobile): rebuild me tab as identity hero and activity tiles`

---

### Task 5: Liked list

**Files:**
- Create: `apps/mobile/src/screens/me/liked-list.tsx`
- Create: `apps/mobile/src/app/(tabs)/(me)/liked.tsx`

Join `likedRefs` to current-locale `posts` / `notes` and to `thinkings`. Order `likedAt` desc. Skip `recently-down`.

Row:
- post with `categorySlug` + `slug` → `router.push({ pathname: '/posts/[category]/[slug]', params: { category, slug } })`
- note with `nid` → `/notes/[nid]`
- thinking → `/comments/[id]`
- missing join → `AppText` `t('unavailable')`, no `onPress`

Empty: `ListShell` `isEmpty` with custom empty copy — **do not** reuse list.sync empty. `ListShell` currently hardcodes `t('empty')`. If that’s too coarse, don’t use ListShell’s empty; render the two-line empty inside the same `EdgeEffectScrollView` when `items.length === 0`. Prefer not to change ListShell’s sync empty for posts/notes/thinking.

Title: `t('liked')` as `largeTitleSans`. Header back: set `Stack.Screen options={{ headerBackVisible: true }}` in the route file like post detail.

- [ ] Implement + eslint touched files
- [ ] Commit `feat(mobile): add liked activity list on me tab`

---

### Task 6: Reading list + record on detail

**Files:**
- Create: `apps/mobile/src/screens/me/reading-list.tsx`
- Create: `apps/mobile/src/app/(tabs)/(me)/reading.tsx`
- Modify: `apps/mobile/src/screens/details/post-detail.tsx`
- Modify: `apps/mobile/src/screens/details/note-detail.tsx`

When `post` / `note` row is defined, `useEffect` once per id:

```ts
useEffect(() => {
  if (!post) return
  void recordReading(db, { refId: post.id, kind: 'post' })
}, [post?.id])
```

Same for notes with `kind: 'note'`. Password notes that never mount `NoteDetailScreen` are not recorded (matches list `openNote` opening Safari instead). If `NoteDetailScreen` does mount for password notes, recording is correct per spec.

List: `openedAt` desc, join posts/notes at current locale, unavailable fallback like likes. Empty copy `readingEmpty` / `readingEmptyHint`.

- [ ] Implement
- [ ] Commit `feat(mobile): record and list recently read posts and notes`

---

### Task 7: My comments (client + list)

**Files:**
- Modify: `apps/mobile/src/api/types.ts`, `apps/mobile/src/api/client.ts`
- Create: `apps/mobile/src/screens/me/comment-total.ts` + `comment-total.test.ts`
- Create: `apps/mobile/src/screens/me/my-comments-list.tsx`
- Create: `apps/mobile/src/app/(tabs)/(me)/comments.tsx`
- Modify: `apps/mobile/src/screens/me/me-screen.tsx` / `activity-stats.tsx` to use the query

**Contract (mx-core Task 9 must match):**

`GET /comments/reader/me?page=&size=` with session cookie. Envelope unwraps to:

```ts
export interface ApiMyComment {
  createdAt: string
  id: string
  refId: string
  refType: CommentRefType
  sourceTitle: string | null
  text: string
  source?: {
    categorySlug?: string | null
    nid?: number | null
    slug?: string | null
  } | null
}
```

`api.myComments(page: number)` → `ApiPaged<ApiMyComment>` via existing `request()`.

```ts
export function commentTotalFromPage(
  previous: number | null,
  outcome: { total: number } | { error: unknown },
): number | null {
  if ('total' in outcome) return outcome.total
  return previous
}
```

Test: success sets total; error keeps previous; initial null stays null on error.

List: infinite query `['me-comments']`. Tap:
- `post` + `source.categorySlug` + `source.slug` → post detail with `params: { commentId: id }`
- `note` + `source.nid` → note detail + `commentId`
- `recently` → `/comments/[id]` with thinking `refId`

Detail screens may ignore `commentId` in this task (spec: opening the article is enough). Empty / retry copy from i18n.

Me tile: `useQuery({ queryKey: ['me-comments', 'total'], enabled: showMyComments(session), queryFn: () => api.myComments(1) })` then `commentTotalFromPage`.

- [ ] Tests + implementation
- [ ] Commit `feat(mobile): list the signed-in reader’s comments`

---

### Task 8: Privacy page (web) + Apple icon + report + delete polish

**Files:**
- Create: `apps/web/src/messages/{en,ja,ko,zh,zh-TW}/privacy.json`
- Modify: each locale `messages/*/index.ts` to export `privacy`
- Create: `apps/web/src/app/[locale]/privacy/page.tsx`
- Modify: `apps/mobile/src/screens/me/provider-icon.tsx` add `apple` path
- Modify: `apps/mobile/src/screens/comments/comment-cell.tsx` — wrap in `Pressable` `onLongPress` → `Alert` report
- Modify: `apps/mobile/src/api/client.ts` `reportComment(id: string)` → `POST /comments/:id/report`

Privacy JSON (`zh`):

```json
{
  "title": "隐私政策",
  "updated": "2026-08-15",
  "collect_title": "我们收集什么",
  "collect_body": "若你使用社交账号登录，我们保存你的名字、邮箱与头像，用于评论身份。你发布的评论正文会存储在服务器。点赞按 IP 去重，不与账号强制绑定。阅读记录与本机点赞状态只存在你的设备上。",
  "not_title": "我们不做什么",
  "not_body": "没有第三方分析 SDK，没有广告追踪，不会弹出 App Tracking Transparency。不会把数据卖给他人。",
  "delete_title": "删除账号",
  "delete_body": "在 App 的「我」页可以删除读者账号。删除后服务器上的登录身份与该身份下的评论关联会被移除。设备上的赞与阅读记录不会自动清除。",
  "contact_title": "联系",
  "contact_body": "关于本政策，请通过博客 innei.in 页脚的邮件联系。"
}
```

English equivalents in `en/privacy.json`. ja/ko/zh-TW required for message-usage.

Page: server component, `useTranslations('privacy')`, article layout with heading + sections. Default locale unprefixed → `https://innei.in/privacy`.

Apple icon: standard 24×24 filled Apple path (SF-like). `hasProviderIcon('apple')` becomes true so the login sheet shows it when `/auth/providers` includes apple.

Report: long-press comment → `Alert` `comment.reportConfirm` → `api.reportComment(comment.id)` → toast `reportDone` / `reportFailed`. Guests may report (no `enabled: !!session` on the action).

Delete: already wired in Task 4; if the client method 404s, keep the toast `deleteAccountFailed`.

- [ ] Run `cd apps/web && pnpm exec vitest run src/messages/message-usage.test.ts` after adding keys
- [ ] Commit `feat: add privacy policy page, Apple login glyph, and comment reporting`

---

### Task 9: mx-core companions (other repo)

Work in `/Users/innei/git/innei-repo/mx-core`, separate commits there.

1. `GET /comments/reader/me` — session reader, paginated, shape in Task 7. Not the admin `author-activity`.
2. `POST /comments/:id/report` — record + notify owner; 200 even if duplicate from same user.
3. Reader `deleteUser` through better-auth for Expo session cookies.
4. Enable Apple provider in production config so `GET /auth/providers` lists `apple`.

Do not start this task until Tasks 1–8 are on Yohaku `main` (or the working branch). Verify against local mx-core `localhost:2333`.

---

## Self-review vs spec

| Spec item | Task |
| --- | --- |
| Hero + 2/3 tiles | 4 |
| Liked / comments / reading lists | 5, 7, 6 |
| `liked_refs` minus down | 2, 5 |
| `reading_history` cap 100, posts/notes only | 1, 6 |
| Comments network, no flash 0 | 7 |
| Signed-out hides comments | 2, 4 |
| Privacy URL | 8 |
| Delete non-owner | 2, 4, 8 |
| Apple icon | 8 |
| Comment report | 8 |
| No terms / appearance / thinking-as-reading | honored by omission |
| mx-core endpoints | 9 |
