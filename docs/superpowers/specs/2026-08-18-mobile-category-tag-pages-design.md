# Mobile 分类页 / 标签页

2026-08-18 · 状态：已批准（brainstorming）

## 背景

Web 已有编辑式聚合页 `/categories/[slug]` 与 `/posts/tag/[name]`。Mobile 已把 `categories` 和每篇博文的 `categorySlug` / `tags` 同步进 SQLite，但分类名和标签在博文列表、详情里只是纯文字，点不进去；`link-router` 也还没认这两条 web 路径（`/posts/tag/react` 会被误当成分类 `tag`、slug `react` 的博文）。

手记侧已有专栏（`/series`、`/series/[slug]`）可作 native 骨架参考。分类/标签不做索引页，只做详情。

## 已定决策

- **只要详情，不要索引。** 入口是博文列表元信息、博文详情、正文站内链接。
- **视觉**：系列页那套 native 骨架（desk、collapsing title、Anno 按年分组）+ web 已验证的结构差异（分类有置顶和标签 chips，标签是查询结果、露来源分类）。不搬 web 的大数字 + accent-rule。
- **列表行**：博文列表语言（sans 标题 + meta），不要专栏信纸的日期|标题横排。普通行不要摘要；置顶纸片保留摘要。
- **数据**：先渲染本地 SQLite，打开后再打 API upsert 补齐。只 upsert，不按这次响应对 `posts` prune。
- **路由**：根栈，无 tab bar。内部路径与 web 对齐：`/categories/[slug]`、`/posts/tag/[name]`。不用 `/tags/[name]`。

## Non-goals

- 分类 / 标签索引页
- 新 `tags` 表或 schema migration
- 分页（两端 API 一次返回全集）
- 回到顶部
- 把专栏页抽成通用聚合壳
- Maestro / 组件快照
- Android

## 路由

两条都是 `app/` 根栈文件，与 `posts/[category]/[slug].tsx`、`notes/[nid].tsx`、`series/[slug].tsx` 同级。不进 `(tabs)`，tab bar 退场。

| Native | 文件 | Web |
| --- | --- | --- |
| `/categories/[slug]` | `src/app/categories/[slug].tsx` | `/categories/:slug` |
| `/posts/tag/[name]` | `src/app/posts/tag/[name].tsx` | `/posts/tag/:name` |

Expo Router 静态段 `tag` 优先于动态 `[category]`，所以 `/posts/tag/react` 进标签页，不会进博文详情。若存在 slug 为 `tag` 的分类，与 web 同样歧义，接受。

`link-router` 匹配顺序：标签路径必须在博文路径之前。

- `/posts/tag/:name`（可带 locale 前缀）→ `{ pathname: '/posts/tag/[name]', params: { name } }`
- `/categories/:slug` → `{ pathname: '/categories/[slug]', params: { slug } }`
- `/posts/:category/:slug` 仍映射博文详情

`name` / `slug` 一律 `encodeURIComponent` 进出。`isClaimedPath` 把 `/categories` 也算进已认领前缀，避免未映射的分类 URL 落到错误屏。

## 入口

1. **博文列表元信息**：分类名、每个可见标签各自可点，`stopPropagation`，标题/摘要仍进文章。现有 `Link.Menu` 仍挂在整行上。
2. **博文详情**：eyebrow 分类可点。标题下、meta 行附近加 tag chips，点进 `/posts/tag/[name]`。
3. **正文站内链接**：经现有 DOM `onLinkPress` → `link-router`。
4. **交叉跳转**：分类页 chips → 标签页；标签页 chips 与行上来源分类 → 分类页。

聚合页普通行本身只进文章，不再在行上套一层标签点击（chips 负责发现）。标签页行上的来源分类除外，可点。

## 页面结构

共用：desk 底、`EdgeEffectScrollView`、`useCollapsingTitle`、与专栏相同的左侧 `PaperNavigationControl` 返回、下拉 `syncAll({ force: true })`。

### 分类页 `/categories/[slug]`

1. Hero：sans 大标题（分类名）+ 一行 meta。
   - `count <= 1` 或最早年份是今年 → `{count} 篇`
   - 否则 → `{count} 篇 · 始于 {year}`
2. 有 `pinAt`：第一篇用现有置顶纸片语言（Pinned + 标题 + 最多两行摘要 + 日期 · #tags）。该篇不出现在下面的年份列表。无摘要则不留空高。
3. 其余按年分组；仅跨年才渲染 Anno + 大号年份。普通行：标题 + meta（`M月 D日` 或单年时带年 · 最多两个 `#tag`）。无摘要。
4. 底部 chips：「此分类下的标签」，`#name` + count，点进标签页。无标签不出。
5. 空：居中「尚无篇章」。无置顶、无 chips。

### 标签页 `/posts/tag/[name]`

1. Hero：accent `#` + 标签名。跨 ≥2 个分类 → `{count} 篇 · 散落在 {M} 个分类`，否则只显示篇数。
2. 无置顶。按年分组规则同分类页。行 meta：日期 · 来源分类名（accent，可点进分类页）。无摘要。
3. 底部 chips：仅 `M >= 2` 时「散见于」分类 chips。
4. 空：居中「还没有这枚标签下的文章」。

Year head 复用专栏 `Anno` + serif 大号年份 + `{count} 篇`。不做回到顶部。日期用 locale 日历，不用相对时间。

## 数据

UI 不直接渲染 fetch。`useDatabaseSnapshot` 订阅 `posts`（分类页再加 `categories`）。

### 读

- 分类：`posts.categorySlug = slug AND lang = locale`，排序 `pinAt desc, createdAt desc`。显示名：`categories` 表该 slug，否则第一篇文章的 `categoryName`，再否则 slug。
- 标签：当前 lang 下 `tags` JSON 含该名字。用可测的 SQLite/`json_each` helper，不用模糊 `LIKE`。
- `tagsSum`、跨分类计数、是否多年、置顶（现有 `pickFeaturedPost`）都从本次 snapshot 算，不另存。

### 写

打开时后台：

- `GET /categories/:slug?lang=` → 子文章 upsert
- `GET /categories/:name?tag=true&lang=` → 命中文章 upsert

走现有 `postMetaFromApi` + `postConflictSet`。分类/标签响应不是全站存档，**禁止按这次响应对 `posts` prune**。API 一次返回全集，无翻页。

### 失败 / 空

| 情况 | 行为 |
| --- | --- |
| 本地有数据，刷新失败 | 继续显示本地，顶上一行同步失败（与博文列表相同） |
| 本地没有，刷新失败 | 居中「点此重试」 |
| 分类 404 | 「找不到这个分类」 |
| 分类存在但 0 篇 | 「尚无篇章」 |
| 标签 0 篇 | 「还没有这枚标签下的文章」 |

离线可读已入库内容；chips 按本地算，可能偏少，联网后补齐。

## 模块边界

新建 `apps/mobile/src/screens/taxonomy/`，不改专栏模块内部。可复用：

- `groupNotesByYear`（已是泛型）
- `pickFeaturedPost`
- Paper 返回：在 `taxonomy-chrome.tsx` 按 `TopicBackControl` 同款复制，不把 taxonomy 塞进 `screens/topics/`，此 PR 不抽共用
- 置顶纸片视觉跟 `PostFeaturedSheet`
- 普通行做成博文 index item 的紧凑变体（无摘要；meta 由页面决定是 tags 还是来源分类）

API 在 `src/api/client.ts` 增加 `categoryBySlug`、`tagByName`。ingest 放进 `src/sync/engine.ts`，与 `ingestTopicPage` 并列，由 screen 调用。

## i18n

新 namespace `taxonomy`，五套 locale 都要有，走现有 `messages.test.ts`。

| Key | zh | en |
| --- | --- | --- |
| `categorySubtitleCountOnly` | `{count} 篇` | `{count} articles` |
| `categorySubtitleWithYear` | `{count} 篇 · 始于 {year}` | `{count} articles · from {year}` |
| `tagSubtitleCountOnly` | `{count} 篇` | `{count} articles` |
| `tagSubtitleWithCross` | `{count} 篇 · 散落在 {cross} 个分类` | `{count} articles · across {cross} categories` |
| `subTagsLabel` | 此分类下的标签 | Tags in this category |
| `crossCategoriesLabel` | 散见于 | Appears in |
| `categoryEmpty` | 尚无篇章 | Nothing here yet |
| `tagEmpty` | 还没有这枚标签下的文章 | No posts with this tag |
| `categoryMissing` | 找不到这个分类 | Category not found |
| `tagMissing` | 找不到这个标签 | Tag not found |
| `entryCount` | `{count} 篇` | `{count} posts` |

`list.pinned` 复用。Year head 右侧用 `entryCount`，不要借用 `topic.noteCount` 或专栏的 letter 文案。

## 测试

Vitest，不写组件快照。

- `link-router`：`/categories/:slug`、`/posts/tag/:name`（不得映射为博文）、locale 前缀、encode、`/posts/coding/hello` 仍是博文。
- 标签 JSON 包含查询、按年分组、置顶抽取、`tagsSum`、跨分类计数。
- ingest 只 upsert、不 prune（夹具里其他分类的文章必须还在）。
- 五套 locale key 对齐。

真机 / 模拟器：

1. 列表点分类名进分类页，点标题仍进文章。
2. 详情 eyebrow / tag chip 可跳。
3. 正文 `/categories/...`、`/posts/tag/...` 进 native 根栈页，无 tab bar。
4. 分类 chips → 标签页 → 来源分类再回来。
5. 飞行模式看已缓存的；联网后补齐。
6. 空分类、不存在的 slug、零文章标签。

## 实施顺序

1. 纯函数：标签查询、聚合、ingest upsert、router 匹配。
2. API + sync ingest。
3. taxonomy screens + 根栈路由。
4. 博文列表 / 详情入口。
5. i18n。
6. 真机过一遍入口矩阵。
