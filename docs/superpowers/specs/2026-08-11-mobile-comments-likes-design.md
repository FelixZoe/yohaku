# mobile 评论 + 点赞

2026-08-11 · 状态：已批准

## 背景与范围

mobile 目前只读：详情页 meta 行有静态 `♡ 计数`，无点赞动作，评论零实现。
mx-core 侧能力齐备：`GET /comments/ref/:id`（offset 分页，`sort` 缺省
`pinned`，根评论带扁平 `replies[]` + `replyWindow` 截断窗口）、
`GET /comments/thread/:rootId`（cursor 展开，返回
`{ replies, remaining, done, nextCursor }`）、已登录读者
`POST /comments/reader/:refId?ref=<type>` 与
`POST /comments/reader/reply/:parentId`（body `{ text ≤500 }`，身份由
better-auth session 决定）、`POST /activity/like`（post/note，服务端按 IP
去重，重复点返回 `ALREADY_SUPPORTED` 错误码）、
`POST /recently/attitude/:id?attitude=0|1`（顶/踩，IP 维度 toggle，返回
`{ code: 1 | -1 }`）。评论正文是 markdown 字符串。refType 含
`post | note | recently`，思考与 post/note 走同一套评论接口。
匿名评论 GET 有 15s 服务端缓存，**登录态请求绕过缓存**，发完即时可见。

本轮包含：评论阅读 + 已登录回复、post/note 点赞、思考顶/踩。
明确排除：举报、评论图片上传、游客评论、悄悄话（isWhispers）、
评论编辑、排序切换（固定 pinned）。

## 已定决策

- 评论区是**原生组件**，inline 接在 `ArticleBody`（定高 DOM WebView）之后，
  同在 `EdgeEffectScrollView` 内；输入为内嵌井样式，不用 sheet。
- 思考无详情页，评论走 **half sheet**（v1 原案）。
- 评论正文用**轻量原生 markdown 子集**渲染，不走 WebView。
- 交互数据层引入 **@tanstack/react-query**（内容仍归 SQLite，职责分离
  遵循 v1 总设计）。
- 本地已赞记录存现有 SQLite（新表），不引入 MMKV。

## 组件结构

新目录 `src/screens/comments/`：

- **`CommentSection`** `{ refId, refType: 'post' | 'note' | 'recently' }`，
  post/note 详情与思考 sheet 复用。自上而下：标题行「评论 N」（SlotText
  计数，N 取 `pagination.total`）→ 输入井 → 评论列表 → load more（显示
  剩余数）。**自身不滚动**（纯 View 内容）：详情页由外层
  `EdgeEffectScrollView` 滚动，sheet 场景由 sheet 提供滚动容器。
- **`CommentCell`**：expo-image 头像（`reader.image` ?? `avatar`）、作者名
  （`reader.name` ?? `author`）+ `reader.role === 'owner'` 时 accent
  「主人」小标、相对时间、markdown 子集正文、「回复」入口。**两级展示**：
  根评论 + 其下回复扁平列出，回复的回复加「回复 @作者」前缀（按
  `parentCommentId` 查作者名），不做无限缩进。`replyWindow.hasHidden` 时
  显示「展开 n 条回复」，走 thread cursor 接续拉取并合并。
- **`CommentInputWell`**：`WellInput` 同族多行输入。未登录显示
  「登录后加入讨论」，点击跳登录 sheet（`(me)/login`）；回复态上方挂
  「回复 @xxx ×」chip；500 字限，发送中锁定。成功后清空、退出回复态并
  invalidate 列表。
- **`MarkdownLite`**（`src/lib/markdown-lite.tsx`）：解析子集 = 粗体 /
  斜体 / 行内代码 / 链接 / 图片 / 换行，输出纯 RN Text/Image；图片点击
  复用现有 QuickLook 预览；超出子集的语法原样降级为纯文本。

## 数据层

- root layout 挂 `QueryClientProvider`（不持久化，网络优先）。
- `api/client.ts`：`fetchRawJson` 增加 `method` / `body`（JSON）支持，
  沿用现有 cookie 附加与 401 清 session 逻辑。新增方法：
  `commentList(refId, page)`、`commentThread(rootId, cursor)`、
  `readerComment(refId, ref, text)`、`readerReply(parentId, text)`、
  `like(type, id)`（type 小写 `post|note`）、
  `recentlyAttitude(id, attitude)`。
- 评论列表 `useInfiniteQuery`，key `['comments', refId]`；发评论 / 回复
  成功后 invalidate。thread 展开的 cursor 页合并进本地组装的树。
- 服务端 create 带 20s 幂等窗口（重复提交报「已说过」），错误文案原样
  透传到输入井下方。

## 点赞

- **post/note**：文末 action row（body 之后、评论区之前）放 paper pill
  点赞按钮（`SinkPressable` + ♡ + SlotText 计数），已赞态 accent 描色。
- **`liked_refs` 表**（现有 SQLite）：`refId` 主键、`kind`
  （`post|note|recently-up|recently-down`）、`likedAt`。启动即知已赞态、
  防重复提交；服务端 `ALREADY_SUPPORTED` 视为「已赞」写入本地而非报错。
- **思考顶/踩**：列表卡片底部 action row：▲ up / ▼ down / 评论数（均
  SlotText）。attitude 是 toggle：`code: 1` 记录/切换、`code: -1` 取消，
  按返回值更新本地表与计数。
- 点赞成功轻震动（现有 haptics 约定），失败计数回滚、无弹窗。

## 思考 half sheet

- 新路由 `(thinking)/comments/[id]`，`presentation: 'formSheet'`，
  detents `[0.66, 1]`。内容：原文摘要（3 行截断）+
  `CommentSection(refId, 'recently')`。
- **已知风险**：RNScreens formSheet 对 ScrollView 有零高特殊布局（repo
  既有经验）。对策：sheet 根用普通 View + 显式高度
  （`useWindowDimensions` × detent 比例），滚动列表置于其内；若仍不稳，
  逃生口是降级 `presentation: 'modal'`（pageSheet）。

## 详情页集成与键盘

- post/note 详情：`ArticleBody` 后接 `<ArticleTail>`（action row +
  `CommentSection`）。
- 键盘避让：ScrollView `automaticallyAdjustKeyboardInsets`，聚焦时滚到
  输入井。
- `allowComment`：实现时确认 mx-core 的 posts/notes 表没有该列（服务端对
  这两类恒返回可评），故只给 thinkings 补字段（表列 + merge，缺省 true）；
  false 时显示「评论已关闭」、隐藏输入井。post/note 不做本地开关。

## 错误处理

- 列表加载失败：区内占位 + 点击重试（兼作离线降级，不引入 NetInfo）。
- 发送失败：输入井下方一行语义 error 文案，草稿保留。
- 点赞失败：回滚，静默。

## 验证

- Vitest：markdown-lite 解析（子集 + 降级）；评论树组装（roots +
  replyWindow + thread cursor 合并）；`liked_refs` 帮助函数；api client
  POST 路径与错误透传。
- 模拟器 + 本地 mx-core：登录后发评论 / 回复 / 展开长 thread；post/note
  点赞与重复点；思考顶/踩 toggle 与 sheet 滚动；未登录点输入井跳登录；
  `allowComment=false` 降级。
