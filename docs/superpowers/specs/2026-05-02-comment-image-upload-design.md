# Comment Image Upload — Design

**Date**: 2026-05-02
**Scope**: `mx-core` (NestJS API) + `Yohaku` web (`apps/web`)
**Status**: Approved (pending user review of this document)

## 1. Overview

Extend the existing master-only file upload subsystem in **mx-core** so that authenticated readers can attach images to comments. Persist a `FileReference` record per uploaded image, bind it to the owning `Comment`, and provide deterministic orphan cleanup with audit logging.

The integration point on the client is the existing Lexical-based comment editor (`UniversalTextArea`) in `apps/web/src/components/modules/comment/CommentBox/`.

## 2. Goals

1. Authenticated readers can upload images from the comment editor and reference them in the submitted comment markdown.
2. Every uploaded image is tracked in MongoDB and bound to a specific `Comment` after submission.
3. Orphaned images (never bound, or detached after edits, or whose comment was removed) are deleted automatically.
4. All deletions are logged for audit and operator visibility.
5. Owner upload paths and permissions remain entirely unaffected.

## 3. Non-goals

- No public/anonymous (guest) image uploads. Reader account is required.
- No image post-processing (resize, transcode, watermark) in this iteration.
- No signed URL / hotlink protection. Public URLs as today.
- No URL reuse semantics — each upload is a new record; pasting a foreign URL is treated as plain markdown and not tracked.
- No moderation pipeline (NSFW detection, etc.).
- No migration of existing comment markdown.

## 4. Architecture

```
┌─────────────────────────────┐         ┌────────────────────────────────┐
│ Yohaku web (CommentBox)     │         │ mx-core (file + comment)       │
│                             │         │                                │
│ Lexical editor              │  POST   │ POST /comments/uploads         │
│  ├─ paste/drop/button ──────┼────────▶│  → ReaderAuthGuard             │
│  │                          │         │  → quota & rate middleware     │
│  │  on success: insert      │         │  → S3/local write              │
│  │  ![](url) into markdown  │         │  → FileReference (status=      │
│  │                          │         │     pending, readerId)         │
│  │                          │         │  ◀── { url, fileName }         │
│  │                          │         │                                │
│  └─ submit ─────────────────┼────────▶│ POST /comments/master/...      │
│                             │         │  → CommentService.create       │
│                             │         │  → parseMarkdownImages(text)   │
│                             │         │  → attachFiles(commentId, urls)│
│                             │         │     (mongoose session)         │
└─────────────────────────────┘         │                                │
                                         │ Cron (every 15 min)            │
                                         │  → orphan/detached cleanup     │
                                         │                                │
                                         │ Comment delete hook            │
                                         │  → cascade file hard-delete    │
                                         └────────────────────────────────┘
```

Two new modules / extensions in **mx-core**:

- `CommentUploadController` — reader-facing upload endpoint, lives inside the existing `file` module
- `FileReferenceService` extensions — reader quota, comment binding via markdown parse, detached marking, structured stdout deletion log

One front-end addition in **Yohaku/apps/web**:

- Image upload plugin for the Lexical editor in `CommentBox` (drop, paste, toolbar button), gated on `useSessionReader()`.

## 5. Data Model

### 5.1 `FileReferenceModel` — additions

Existing fields (kept as-is): `fileUrl`, `fileName`, `status`, `refId`, `refType`, `s3ObjectKey`.

Added:

| Field | Type | Index | Notes |
|---|---|---|---|
| `readerId` | `string` (Reader._id) | yes | Upload owner; required for reader uploads, null for owner uploads |
| `uploadedBy` | `'owner' \| 'reader'` | yes | Discriminator for analytics & cleanup paths |
| `mimeType` | `string` | no | Captured at upload time |
| `byteSize` | `number` | no | Captured at upload time, used for quota |
| `detachedAt` | `Date \| null` | yes (sparse) | Set when status transitions to `detached` |

`status` enum extended: `pending | active | detached`.

Compound indexes:

- `{ readerId: 1, status: 1, createdAt: 1 }` — quota & TTL scans
- `{ status: 1, detachedAt: 1 }` — detached TTL scan
- `{ refType: 1, refId: 1 }` — already exists, reused for cascade lookups

### 5.2 `FileReferenceType` — extension

Add `Comment` to the existing `FileReferenceType` enum (`file-reference.model.ts`). `refId` for comment-attached files stores `comment._id`. Note: `CollectionRefTypes` (in `db.constant.ts`) is a separate enum used by other modules and is not modified.

### 5.3 Hard-delete logging

Hard deletions are logged as structured JSON via the NestJS logger (stdout), **not persisted to a DB collection**. Each deletion emits one log entry from `FileReferenceService.hardDeleteFile`:

```json
{
  "event": "file_hard_delete",
  "reason": "pending_ttl | detached_ttl | comment_deleted | comment_spam | cascade_post_deleted | manual",
  "fileName": "...",
  "fileUrl": "...",
  "s3ObjectKey": null,
  "byteSize": null,
  "uploadedBy": "reader",
  "readerId": "...",
  "refType": "comment",
  "refId": "...",
  "storageRemoved": true,
  "storageError": null
}
```

Successful deletes use `logger.log`; storage-delete failures (which still proceed to remove the DB record) use `logger.warn`. Operators rely on log aggregation (journald/loki/etc) for retention and search.

## 6. Backend API Design

### 6.1 `POST /comments/uploads` (reader-only)

Request:

- `multipart/form-data`, single field `file`
- Optional query: `commentDraftId` (UUID issued by client; not validated server-side, only echoed back for client-side correlation — files are bound to real comments by markdown parsing, not by draft id)

Guard chain:

1. `ReaderAuthGuard` — rejects unless `request.session.user` exists with `role === 'reader' || role === 'owner'`. Owner is allowed for testing parity but does not consume reader quota.
2. `ReaderUploadQuotaInterceptor` — checks rate limit and total active byte size for this `readerId`.
3. `ImageMimeWhitelistPipe` — accepts only `image/jpeg`, `image/png`, `image/webp`, `image/gif`. 415 on mismatch (verified by magic bytes via `file-type`, not just `Content-Type`).
4. `ImageSizeLimitPipe` — rejects > 5 MB (config-driven).

Storage:

- If `imageStorageOptions.enable === true`, write to S3/R2 using prefix `imageStorageOptions.commentUploadPrefix` (new field). Fallback prefix: `comments/{readerId}/{Y}/{m}/{md5}.{ext}`.
- Otherwise write to local FS under `STATIC_FILE_DIR/comments/{readerId}/...`.
- Write storage object **first**, then create `FileReference` record. On record-write failure, the storage object is left for the orphan cron (object-store reconcile pass) — see §10.

Response:

```json
{ "url": "https://cdn.example.com/comments/abc/2026/05/xxx.png",
  "fileName": "comments/abc/2026/05/xxx.png",
  "byteSize": 184320,
  "expireAt": "2026-05-02T14:33:00Z" }
```

`expireAt` lets the client display "image expires in N min unless you submit your comment".

### 6.2 Comment create / update — markdown parse + attach

Inside `CommentService.create` and `CommentService.update`, within a single mongoose transaction that also covers the comment document write:

1. `parseMarkdownImageUrls(text)` extracts all `![]()` URLs whose origin matches the configured CDN/site host(s). Foreign URLs (origins not in the allowlist) are ignored entirely — they are passed through as plain markdown and are **not counted** against the per-comment cap.
2. Enforce **per-comment image cap** (`commentImageMaxCount`, default 4) on the candidate URL count from step 1. Reject 422 (`COMMENT_IMAGE_CAP_EXCEEDED`) if exceeded, before any DB lookup.
3. For each candidate URL:
   - Look up `FileReference` by exact `fileUrl` match.
   - If not found → ignore (treated as foreign / stale paste).
   - If found and `readerId !== currentReader._id` → **reject the entire comment with 403** (`FILE_NOT_OWNED`). Prevents binding another reader's pending file.
   - If found and `status === 'pending'` → set `status='active'`, `refType='Comment'`, `refId=comment._id`.
   - If found and `status === 'active'`:
     - Same comment (`refId === comment._id`, update path only) → no-op.
     - Different comment → reject 409 (`FILE_ALREADY_BOUND`). Reader must re-upload.
   - If found and `status === 'detached'` and `refId === comment._id` (update path; reader re-added a previously removed image within the cron window) → revert to `status='active'`, clear `detachedAt`.
4. On `update`: compute `previousAttachedFileIds \ newAttachedFileIds` and mark those `status='detached'`, `detachedAt=now`.

All four operations (comment write, attach, revive, detach) share one mongoose transaction. Failure rolls back atomically.

### 6.3 `GET /comments/uploads/config` (public)

Read-only endpoint consumed by the web client to render UI affordances and gate behaviour. No auth required.

Response:

```json
{
  "enable": true,
  "singleFileSizeMB": 5,
  "commentImageMaxCount": 4,
  "mimeWhitelist": ["image/jpeg","image/png","image/webp","image/gif"],
  "pendingTtlMinutes": 120
}
```

Cached aggressively (`Cache-Control: public, max-age=300`).

### 6.4 Cron: orphan & detached cleanup

Extends existing `cron-business.service.ts`. Schedule: every 15 min.

Two passes:

- **Pending pass**: `status='pending' AND createdAt < now - 2h` → hard delete.
- **Detached pass**: `status='detached' AND detachedAt < now - 30min` → hard delete.

Hard delete sequence per file:

1. Delete storage object (S3 or local). Capture failure into `storageError`.
2. Delete `FileReference` record.
3. Emit structured log line (`logger.log` on success, `logger.warn` on storage failure) — see §5.3.

Existing endpoints `/objects/files/orphans/list` and `/objects/files/orphans/cleanup` remain for manual operator use; they are extended to display the new statuses and `uploadedBy` field.

### 6.5 Cascade delete hooks

In `CommentService.delete` (covering reader self-delete, admin delete, spam-state transition, and post-cascade deletion) — runs as a post-delete hook on the comment model:

```ts
const files = await fileReferenceModel.find({ refType: 'Comment', refId: commentId })
for (const f of files) await hardDeleteFile(f, reasonForContext)
```

`reasonForContext` resolves to one of:

- `comment_deleted` — explicit delete by reader / admin
- `comment_spam` — state transitioned to 2 (configurable: `deleteFilesOnSpam`, default `true`)
- `cascade_post_deleted` — invoked from post/note/page delete cascade

Hooks run **after** the comment document delete commits (post-delete hook on the model), to avoid leaving files dangling if the comment delete itself is rolled back.

## 7. Authentication & Authorization

`ReaderAuthGuard` is a thin variant of the existing `AuthGuard` that:

- Resolves `request.session.user` via better-auth (same MongoDB session collection as web).
- Passes if `role` is `reader` or `owner`. Owner bypass exists so that the same endpoint is testable from the owner account.
- 401 on missing session, 403 if role is anything else.

Owner uploads continue to flow through existing `POST /objects/files/upload` with the existing `AuthGuard` — that path is **untouched**.

## 8. Quotas & Rate Limits

All thresholds live under a new config block `commentUploadOptions` (sibling to `imageStorageOptions`). All optional, defaults shown:

| Key | Default | Notes |
|---|---|---|
| `enable` | `true` | Master switch. `false` disables endpoint with 503. |
| `pendingTtlMinutes` | `120` | Pending → hard delete |
| `detachedTtlMinutes` | `30` | Detached → hard delete |
| `cronIntervalMinutes` | `15` | Cleanup cadence |
| `singleFileSizeMB` | `5` | Per-upload byte cap |
| `commentImageMaxCount` | `4` | Per-comment image cap (enforced at attach) |
| `readerHourlyUploadCount` | `10` | Per-reader uploads in trailing 60 min |
| `readerTotalActiveBytesMB` | `50` | Per-reader sum of active+pending byte size |
| `readerMinAccountAgeHours` | `0` | Reader account must be at least this old (0 = no gate) |
| `readerMinCommentCount` | `0` | Reader must have ≥ this many non-spam comments before first upload (0 = no gate) |
| `deleteFilesOnSpam` | `true` | Whether state=2 transition triggers cascade |
| `mimeWhitelist` | `['image/jpeg','image/png','image/webp','image/gif']` | Magic-byte verified |

Quota checks happen in `ReaderUploadQuotaInterceptor` before storage write; rejection returns 429 with a `Retry-After`-style header where applicable.

## 9. Storage Strategy

- New config field `imageStorageOptions.commentUploadPrefix` (string, optional). Path template; default `comments/{readerId}/{Y}/{m}/{md5}.{ext}`.
- Template engine extended to support `{readerId}` placeholder in addition to existing `{Y} {m} {d} {md5} {uuid} {ext}`.
- Reader uploads are kept in this prefix only — never mixed with owner content paths. This makes bulk operator actions (audit, mass-delete during incident) trivial.

## 10. Deletion Lifecycle & Logging

Hard delete is the only deletion mode for reader-uploaded files. Structured stdout log lines (see §5.3) are the audit trail — operators rely on log aggregation for retention and search.

Deletion paths:

| Trigger | Mode | Latency |
|---|---|---|
| Pending TTL | cron | ≤ 15 min after expiry |
| Detached TTL | cron | ≤ 15 min after expiry |
| Comment delete (reader / admin) | post-delete hook | immediate |
| Comment → spam (state=2) | post-update hook | immediate (config gated) |
| Post/Note/Page cascade | comment-delete hook chain | immediate |
| Operator manual `/objects/files/orphans/cleanup` | API | immediate |

Storage-delete failure does **not** abort record-delete: the log entry records `storageRemoved=false` and `storageError=…`. A periodic reconcile job (out of scope for v1; tracked as follow-up) can sweep these.

## 11. Frontend Integration (Yohaku web)

### 11.1 Editor extension

In `apps/web/src/components/modules/comment/CommentBox/`:

- New Lexical plugin `ImageUploadPlugin` (or extend existing markdown plugin) that handles three input modes:
  - Toolbar button (file picker)
  - Drag-and-drop into the editor surface
  - Paste of image data from clipboard
- All three modes funnel through a single `uploadCommentImage(file)` function in a new `apps/web/src/components/modules/comment/CommentBox/uploads.ts`.
- Upload happens immediately; on success, insert standard markdown `![](url)` at the cursor.
- During upload, show an inline placeholder node with progress + cancel; replace with the markdown image on completion.

### 11.2 Auth & gating

- Plugin is registered only when `useSessionReader()` returns a non-null reader. Guests see no upload affordance.
- The toolbar button is disabled with a tooltip if the reader has hit the rate limit (after a 429 response, surface "稍后再试" and disable for 60s).

### 11.3 API client

- `@mx-space/api-client` ships `comment.getUploadConfig()` and `comment.uploadImage(file)` (see `packages/api-client/controllers/comment.ts`). Yohaku currently uses a direct `$fetch + buildUrl` wrapper at `apps/web/src/lib/comment-uploads.ts` while waiting for the next api-client npm release; switch to the SDK methods after the bump.
- `uploadImage` returns `{ url, fileName, byteSize, mimeType, expireAt }`. The `expireAt` value is held in component state so a soft warning ("图片将于 1:23 后过期") can render in the editor footer.

### 11.4 Submit-time behaviour

No client-side change to submit payload. Markdown is sent as today; backend handles binding.

## 12. Configuration Summary

New config additions (MongoDB-backed, edited via existing admin config UI):

- `imageStorageOptions.commentUploadPrefix: string` (optional)
- `commentUploadOptions: { ... }` (full block per §8)

No env-var changes required.

### 12.1 mx-core schema declaration

mx-core's config system is Zod-driven with embedded UI metadata via `withMeta()` helpers. The `admin-vue3` settings page is **fully schema-driven** — it pulls form layout from `GET /config/form-schema` and renders automatically. No admin-vue3 code change is required to expose `commentUploadOptions` to operators.

Four files to touch in mx-core:

1. **`apps/core/src/modules/configs/configs.schema.ts`** — add the section schema. Place adjacent to `ImageStorageOptionsSchema` and add the new `commentUploadPrefix` field on the existing image-storage section.

   ```ts
   export const ImageStorageOptionsSchema = section('图床设置', {
     // ... existing fields ...
     prefix: field.plain(z.string().optional(), '文件路径前缀', {
       description: 'Owner 上传之 S3 路径前缀，支持模板占位符 …',
     }),
     // ↓ NEW
     commentUploadPrefix: field.plain(z.string().optional(), '评论图片路径前缀', {
       description: '读者评论上传之独立路径前缀，留空则使用 comments/{readerId}/{Y}/{m}/{md5}.{ext}。占位符同 prefix，且额外支持 {readerId}。',
     }),
   })

   export const CommentUploadOptionsSchema = section('评论图片上传', {
     enable: field.toggle(z.boolean().optional(), '启用读者评论图片上传', {
       description: '关闭则隐藏前端上传入口，且接口返回 503',
     }),
     pendingTtlMinutes: field.number(
       z.preprocess((v) => (v ? Number(v) : v), z.number().int().min(5).optional()),
       'Pending TTL（分钟）',
       { 'ui:options': { halfGrid: true }, description: '上传后未被评论引用之保留时长，过期清除。默认 120' },
     ),
     detachedTtlMinutes: field.number(
       z.preprocess((v) => (v ? Number(v) : v), z.number().int().min(1).optional()),
       'Detached TTL（分钟）',
       { 'ui:options': { halfGrid: true }, description: '评论编辑后被移除之图保留时长。默认 30' },
     ),
     cronIntervalMinutes: field.number(
       z.preprocess((v) => (v ? Number(v) : v), z.number().int().min(1).optional()),
       '清理巡检间隔（分钟）',
       { 'ui:options': { halfGrid: true }, description: '默认 15' },
     ),
     singleFileSizeMB: field.number(
       z.preprocess((v) => (v ? Number(v) : v), z.number().int().min(1).max(50).optional()),
       '单图最大大小（MB）',
       { 'ui:options': { halfGrid: true }, description: '默认 5' },
     ),
     commentImageMaxCount: field.number(
       z.preprocess((v) => (v ? Number(v) : v), z.number().int().min(1).max(20).optional()),
       '单评论图片张数上限',
       { 'ui:options': { halfGrid: true }, description: '默认 4' },
     ),
     readerHourlyUploadCount: field.number(
       z.preprocess((v) => (v ? Number(v) : v), z.number().int().min(1).optional()),
       '单读者每小时上传上限',
       { 'ui:options': { halfGrid: true }, description: '默认 10' },
     ),
     readerTotalActiveBytesMB: field.number(
       z.preprocess((v) => (v ? Number(v) : v), z.number().int().min(1).optional()),
       '单读者活跃图总容量上限（MB）',
       { 'ui:options': { halfGrid: true }, description: '默认 50' },
     ),
     readerMinAccountAgeHours: field.number(
       z.preprocess((v) => (v ? Number(v) : v), z.number().int().min(0).optional()),
       '读者账号最小年龄（小时）',
       { 'ui:options': { halfGrid: true }, description: '准入门槛，0 = 不限。默认 0' },
     ),
     readerMinCommentCount: field.number(
       z.preprocess((v) => (v ? Number(v) : v), z.number().int().min(0).optional()),
       '读者最小已发评论数',
       { 'ui:options': { halfGrid: true }, description: '准入门槛，0 = 不限。默认 0' },
     ),
     deleteFilesOnSpam: field.toggle(z.boolean().optional(), '评论标记 spam 时同步删图', {
       description: '默认 true。关闭则仅删评论保留图待手动处理',
     }),
     mimeWhitelist: field.array(
       z.array(z.string()).optional(),
       'MIME 白名单',
       { description: '默认 image/jpeg, image/png, image/webp, image/gif。修改后立即生效' },
     ),
   })
   ```

2. **`apps/core/src/modules/configs/configs.default.ts`** — append default values for the new block, matching the defaults in §8.

3. **`apps/core/src/modules/configs/configs.interface.ts`** — extend `IConfig` with the `CommentUploadOptions` interface and add `commentUploadPrefix?: string` to `ImageStorageOptions`. Inferred from the Zod schemas via `z.infer<typeof CommentUploadOptionsSchema>` where the codebase already does this for other sections.

4. **`apps/core/src/modules/configs/configs.schema.ts` → `configSchemaMapping`** — register the new section so the form-schema endpoint emits it. Key: `'commentUploadOptions'`.

### 12.2 admin-vue3 — no code change required

The admin settings UI consumes `GET /config/form-schema` and renders sections dynamically via `SectionFields` / `FormFieldItem` (see `apps/admin/src/views/setting/index.tsx` and `apps/admin/src/components/config-form/index.tsx`). Once §12.1 is shipped, the new section appears automatically as a settings tab labelled "评论图片上传", with the new field on the existing 图床设置 tab.

Manual verification checklist after deploying mx-core:

- New tab "评论图片上传" appears in the admin settings sidebar.
- Each numeric field shows the documented description as helper text.
- Toggling `enable` and saving round-trips correctly via `optionsApi.patch('commentUploadOptions', ...)`.
- The new `commentUploadPrefix` field appears in the existing 图床设置 tab, after `prefix`.

If a non-trivial UI affordance is later wanted (e.g., a "test cleanup" action button or a usage chart), it would warrant a static tab override in `apps/admin/src/views/setting/tabs/`. Out of scope for v1.

## 13. Testing Strategy

**mx-core**

- Unit: `parseMarkdownImageUrls` (origin filter, dedup, malformed markdown).
- Unit: `ReaderUploadQuotaInterceptor` (rate window, byte sum, edge cases at boundary).
- Integration: upload → submit comment → verify `status=active`, `refId` set; update comment removing image → verify `status=detached`, `detachedAt` set; cron pass → verify hard-delete + log.
- Integration: cascade — delete post → comment cascade → file cascade → log entries with `cascade_post_deleted`.
- Integration: 403 on cross-reader binding attempt; 409 on double-bind attempt.

**Yohaku web**

- Component: editor plugin renders placeholder during upload, swaps to markdown on success, shows error on 429/415/413.
- Component: plugin not registered for guests.

## 14. Rollout

1. Ship mx-core changes with `commentUploadOptions.enable=false` (default for the migration). Owner-side untouched, no behaviour change for end users.
2. Run cron for one cycle in staging; verify no regressions in existing orphan endpoints.
3. Ship Yohaku web changes behind the same flag — the UI calls `GET /comments/uploads/config` (§6.3) on mount and hides the upload affordance when `enable=false`.
4. Flip `enable=true` in production after monitoring staging for 48h.

No data migration required — existing `FileReference` records remain valid; the new fields default to null/owner.

## 15. Open Questions

None at this time.
