# /notes/ 列表页强化最新日记展示

## 概述

在 `/notes/` 列表页顶部直接渲染最新一篇日记的正文内容，以 CSS `max-height: 60vh` + 渐变遮罩截断，点击"阅读全文"跳转详情页。下方时间线列表去除摘要文本，仅保留精简元数据。

## 页面结构

### 第一页（page=1）

```
┌──────────────────────────────────┐
│  [topic] [mood] [weather]        │  ← 元数据
│  标题                             │
│  日期 · #nid                      │
│  ┌────────────────────────────┐  │
│  │       封面图（如有）         │  │
│  └────────────────────────────┘  │
│  正文内容（详情页渲染组件）       │  ← max-height: 60vh
│  ░░░░ 渐变遮罩 ░░░░░░░░░░░░░░  │     overflow: hidden
│         阅读全文 →               │     + gradient mask
├──────────── 更早的日记 ──────────┤  ← 分隔线
│  时间线列表（不含最新日记）       │
│  分页导航                        │
└──────────────────────────────────┘
```

### 翻页（page > 1）

纯时间线列表，无最新日记内容区。

## 数据获取

服务端并发二请求：

```typescript
const [latestNote, listData] = await Promise.all([
  apiClient.note.getLatest(),
  apiClient.note.getList(currentPage, 10, {
    select: ['title', 'nid', 'meta', 'topic', 'mood', 'weather', 'bookmark', 'created', 'slug']
  })
])
```

- `getLatest()`: 返回完整数据（含 `text`/`content` 全文）用于正文渲染
- `getList()`: `select` 不含 `text`/`content`，仅取列表卡片所需字段
- 列表数据中过滤掉 `id === latestNote.id` 的条目，避免重复

## 组件变更

### 新增：NoteLatestRender

- 位置：`apps/web/src/components/modules/note/NoteLatestRender.tsx`
- 职责：渲染最新日记的标题、元数据、封面、正文内容
- 正文渲染：复用详情页的内容渲染组件（Markdown / Lexical static renderer）
- CSS 截断：外层容器 `max-height: 60vh; overflow: hidden; position: relative`
- 渐变遮罩：`position: absolute; bottom: 0` 的伪元素或 div
- 底部 CTA："阅读全文 →" 链接至 `buildNotePath(note)`

### 修改：NoteListCard

- 移除摘要文本（删除 `note.text?.slice(0, 120)` 及对应 `<p>` 元素）
- 保留：标题、nid、封面图、topic tag、mood、weather、bookmark

### 修改：notes/page.tsx

- 数据获取改为并发二请求
- 第一页：渲染 `NoteLatestRender` + 分隔线 + `NoteListTimeline`（过滤后）
- 非第一页：仅渲染 `NoteListTimeline`

## 无封面处理

不做特殊处理。有封面则显示，无封面则正文区域自然撑高。

## 边界情况

- 无日记数据：保持现有 `NothingFound` 组件
- 最新日记为密码保护/秘密日记：按现有逻辑处理（`NoteHideIfSecret`）
- 最新日记正文极短（不足 60vh）：正常显示，不强制撑满高度，渐变遮罩不显示
