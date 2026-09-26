# Mobile 搜索

2026-08-20 · 状态：已批准（brainstorming）

## 背景

Native app 三个内容 tab（博文 / 手记 / 思考）只能浏览。分类、标签、专栏解决的是按结构发现，不是按关键词找回。Web 搜索已从 Algolia 换成 mx-core 站内 CJK / BM25（`GET /search`，以及 `GET /search/post|note|page`），带 highlight snippet；思考不在服务端索引里。Mobile 是 SQLite 离线优先，列表同步有标题和摘要，全文 `text` 只有打开过或预取的最近约 20 篇。

## 已定决策

- **当前 tab 严格隔离。** 博文只出博文，手记只出手记，思考只出思考。独立页 app 没有对应表面，不出。
- **独立搜索页，列表不放搜索栏。** 透明导航栏右上 `magnifyingglass` 推进根栈 `/search?scope=`。tab bar 退场，返回只回来源列表。
- **本地先出，联网追加。** 一份列表，不去重以外的重排，不分组、不标「本地 / 全站」。思考 tab 不发网络请求。
- **统一搜索行。** 标题 + 最多两行 snippet（命中词 accent 底反白）+ meta。不复用列表纸片。思考没有标题，snippet 就是主文。
- **空态。** 一进来就聚焦键盘；没打字时展示本机最近搜索（按 scope 各 10 条）。

## Non-goals

- 第五个 tab、列表内联搜索栏、跨类型混合结果、独立页
- 思考的服务端索引、SQLite FTS5、搜索结果分页
- 用线上 snippet / highlight 覆盖已画出的本地行
- 搜评论、专栏索引、分类/标签页、「我」
- 搜索历史云同步、搜索建议、AI
- 改 web 搜索
- Android、横屏、iPad 分栏
- Maestro / 组件快照

## 入口

三个内容 tab 共用：透明 header 右上 SF Symbol `magnifyingglass`，命中区域 ≥ 44pt，accessibility label 用 `search.entry`。「我」没有搜索。

手记列表右侧已有专栏 `square.stack`。搜索镜放在最右侧，专栏按钮在它左边。博文 / 思考只有这一枚镜。

点镜：`router.push({ pathname: '/search', params: { scope } })`。每次都是新会话（空井 + 最近搜索），不恢复上一次关键词。

`scope`：`posts` | `notes` | `thinking`。缺省或非法值按 `posts`。

## 路由

根栈文件 `apps/mobile/src/app/search.tsx`，与分类 / 专栏 / 详情同级。不进 `(tabs)`。

栈：来源列表 → `/search?scope=` → 详情或思考评论 sheet。从详情返回，搜索页还在、关键词还在。从搜索再返回，回列表，tab bar 回来。

关键词只活在这一屏的 state，不随每个字改 URL。`scope` 是进页参数。不要 `q=` 深链（web `/search?q=` 不接到 native）。

顶栏：左侧现有 `PaperNavigationControl` 返回；中间 `WellInput`（井 + accent 聚焦环，不再套纸片）；有字时右侧清掉。`autoFocus`、`returnKeyType="search"`、`autoCapitalize="none"`。Search 键不另触发请求（已是 live search），只收键盘。

Placeholder 按 scope：`search.placeholderPosts` / `placeholderNotes` / `placeholderThinking`。

## 页面结构

desk + `EdgeEffectScrollView`。顶栏 sticky。键盘升起时列表让底。

### 没打字

键盘立刻起来。下面「最近搜索」，右侧「清除」。

- 每条：左小镜、词本身、右 × 删一条。点整行把词填进井并开搜。
- 最多 10 条 / scope，MMKV，不进网络。
- 写入时机：这次搜索真正跑过（本地查询或线上请求已用这个词）或点了最近里的一条。每个 keystroke 不写。同一词再搜提到最前。
- 没有最近记录：井下面空白，只有 placeholder。
- 最近搜索用普通文本行，不用 `GroupedList`（那是「我」的设置语言）。

一开始打字，最近搜索整块撤掉。井清空，最近再回来。

### 有字 · 结果行

一份列表，行间发丝线，不用列表纸片。

**博文 / 手记**

1. 标题：sans，一行截断。
2. Snippet：最多两行。命中词 `Mark`：accent 底、反白。没有 snippet 的行（例如只命中标题、正文不可用）不留空高。
3. Meta：博文是分类名；手记是相对时间，有心情/天气则接在后面。线上 `isFallback` 时再加一句 `search.fallbackToSource`。

**思考**

没有标题。Snippet 是主文，最多三行，同样高亮。Meta 只有时间。点按打开现有 `/comments/[id]` formSheet，搜索页留在下面。

本地 snippet 从命中附近截（约 80 字）。线上条目用 `highlight.snippet` / `highlight.keywords`；若线上条目本地已有，整条跳过，不升级。

有密码的手记：只搜、只展示标题，不出正文 snippet。点按仍走现在的系统浏览器。

### 点结果

| scope | 去哪 |
| --- | --- |
| 博文 | `/posts/[category]/[slug]`。线上独有、本地还没有的，走现有详情拉取并 upsert |
| 手记 | `/notes/[nid]`；`hasPassword` 用 `WebBrowser.openBrowserAsync` |
| 思考 | `/comments/[id]` formSheet |

线上博文 hit 必须带 `category.slug` + `slug` 才能路由；手记必须带 `nid`。缺字段的 hit 丢掉，不当可点行。

## 数据

UI 不直接渲染 fetch。本地结果来自当前 locale 的 SQLite；线上结果经 TanStack Query，只用来追加本地没有的 id。

### 本地字段

| scope | 搜这些 | 不搜 |
| --- | --- | --- |
| 博文 | `title`、`excerpt`、`text`、`categoryName`、`tags` | `content`（Lexical JSON） |
| 手记 | `title`、`excerpt`、`text`（无密码时）、`mood`、`weather` | 密码手记的 `text` / `content` |
| 思考 | `content` | — |

博文 / 手记只查 `lang = 当前 locale`。思考没有 lang，一份表。

列表同步写下标题和摘要（约 160 字或 `summary`）；完整 `text` 只有打开过或预取的最近约 20 篇。本地搜不到的正文，靠线上补。

不做 FTS5，也不另写 SQL 搜索。和分类页一样：`useLiveQuery` 当前 scope 的 snapshot，纯函数子串过滤。拉丁字母两边都 lower case 再比；CJK 直接 `includes`。组字过程中每下 `onChangeText` 都跑本地；线上等输入停稳后 debounce 360ms（与 web 相同）。

本地排序：标题命中 → 摘要 / 分类 / 标签 / 心情天气 → 正文。同档 `createdAt` 倒序。

### 联网

不改 mx-core。已有：

- 博文 `GET /search/post?keyword=&lang=`
- 手记 `GET /search/note?keyword=&lang=`

只拿第一页。思考不请求。`GET /search`（混合）和 `GET /search/page` 不用。

`api.client` 增加 `searchPosts` / `searchNotes`，camelize 后的 hit 至少对齐：`id`、`title`、`type`、`slug`、`nid`、`category`、`highlight`、`isFallback`。

合并：本地先画。线上回来按 `id` 去重，只把本地没有的按服务端顺序接在后面，整表不重排。有网的独有条目点进详情后写入 SQLite。

### 失败 / 空

| 时机 | 画面 |
| --- | --- |
| 本地还没有、联网还在飞 | 不要「没有结果」，安静 loading |
| 两边都结束仍没有 | 居中 `search.empty` + `search.emptyHint` |
| 离线且本地没有 | `search.offline`，不提供「当在线」的重试 |
| 联网失败且已有本地结果 | 当没发生，不弹错 |
| 联网失败且本地也没有 | `common.retry`，点一下重试线上 |
| 点进去之后文章没了 | 详情自己的失败面，搜索页不抢 |

本地查询不当失败。

## 模块边界

新建 `apps/mobile/src/screens/search/`。列表页只加右上入口，不把搜索逻辑写进 `list-shell`。

| 文件 | 职责 |
| --- | --- |
| `src/app/search.tsx` | 根栈路由，读 `scope`，挂 screen |
| `screens/search/search-screen.tsx` | 顶栏、最近 / 结果切换、键盘 |
| `screens/search/search-hit.tsx` | 统一结果行 |
| `screens/search/local-search.ts` | 子串匹配、分档排序、snippet |
| `screens/search/merge-hits.ts` | 本地 ∪ 线上追加去重 |
| `screens/search/recents.ts` | MMKV，按 scope 各 10 条 |
| `api/client.ts` + `types.ts` | `searchPosts` / `searchNotes` |
| 三个列表 screen | 右上镜；手记与专栏按钮并存 |

## i18n

新 namespace `search`，五套 locale，走现有 `messages.test.ts`。

| Key | zh | en |
| --- | --- | --- |
| `entry` | 搜索 | Search |
| `placeholderPosts` | 搜索博文 | Search posts |
| `placeholderNotes` | 搜索手记 | Search notes |
| `placeholderThinking` | 搜索思考 | Search musings |
| `recents` | 最近搜索 | Recent |
| `clearRecents` | 清除 | Clear |
| `empty` | 没有找到 | No results |
| `emptyHint` | 试试其他关键词 | Try a different keyword |
| `offline` | 离线，只能搜索已下载的内容 | Offline — only downloaded content |
| `fallbackToSource` | 回退到原文 | Fallback to original |
| `clear` | 清除 | Clear |
| `deleteRecent` | 删除 | Delete |

`common.retry`、`common.back` 复用。思考 placeholder 用 app 已有的「思考 / musings」叫法，不要新造词。

## 测试

Vitest，不写组件快照。

- 本地匹配：标题 / 摘要 / 正文分档；tags、分类名；密码手记不碰正文；当前 locale。
- snippet：命中附近截断、无命中不造空 snippet。
- `merge-hits`：本地优先、线上只追加新 id、不重排。
- recents：cap 10、去重提前、按 scope 隔离、空词不写。
- 五套 locale key 对齐。

真机 / 模拟器：

1. 三个 tab 右上镜推进搜索，tab bar 退场，返回回对的列表。
2. 手记页镜在专栏按钮右侧，两者都能点。
3. 离线能搜已下载的标题 / 摘要 / 正文；思考是全文。
4. 有网时本地没有的博文 / 手记会追加，已有行不闪、不重排。
5. 最近搜索按 scope 各 10 条；× 删一条；清除全删。
6. 思考结果打开评论 sheet；密码手记走浏览器。
7. 空查询、无结果、离线无本地、线上失败有/无本地。

## 实施顺序

1. 纯函数：local-search、snippet、merge-hits、recents。
2. API types + `searchPosts` / `searchNotes`。
3. 搜索屏 + 根栈路由。
4. 三个列表的右上入口（手记与专栏并存）。
5. i18n。
6. 真机过一遍入口和离线 / 联网矩阵。
