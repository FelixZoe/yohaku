# mobile 文章划线评论

2026-08-14 · 状态：待审

## 背景

Web 文章支持划线评论：选中一段文字 →「复制 · 评论」→ 用 `RangeAnchor`
（同一 lexical block 内的 offset + quote + prefix/suffix）发根评论 →
`CSS.highlights` 画虚线下划线 → 点下划线看该段 thread。

mobile 正文在 Expo DOM WebView（自有 `@expo/dom-webview`，`DomWKWebView`
子类）里；评论区是 Native（`CommentSection` + `CommentInputWell`）。发评论
目前只传 `{ text }`，`ApiComment` 没有 `anchor`，WebView 也不画已有划线。
选中文字弹出的是 iOS 系统编辑菜单（Copy / Look Up / Translate / Share）。

约束：iOS-only，deployment target 18.0。Custom Highlight API 与
`UIMenuBuilder` 都可用。Android 不在范围内。

## 已定决策

- 系统选区菜单收成 **复制 · 评论**（保留系统 Copy，去掉 Look Up /
  Translate / Share / Speak 等），外观和动画仍是系统菜单。
- 第一版做完整闭环：选区发评、已有划线画出来、点下划线看该段。
- 读写都走详情页上的 **Native `Modal` `pageSheet`**，不新开路由。
  expo-router `formSheet` 必须挂路由，且 RNScreens 对包在 View 里的
  ScrollView 会零高；nested-doc 已经在用的 `Modal` pageSheet 避开这两点。
- 划线算法（build / resolve / createDomRange / highlight CSS）从 web
  **原样拷到 mobile DOM 层**。本轮不抽进 `@yohaku/rich-content`。
- 菜单只在文章 `RichBody` 上 opt-in。Insights、nested-doc、池内未领养实例
  保持系统默认菜单。
- Sheet 视觉（A+C）：grabber → 小标题「划线评论」→ 衬线引用正文 → 发丝线
  → 输入井。不用 chip、不用左侧 accent 杠。thread 态在发丝线与输入井之间
  插入该段评论列表，列表下再一条发丝线。

明确排除：游客评论、悄悄话、评论图片、块级 gutter 评论、markdown 正文划线、
nested-doc 内划线、桌面 hover 高亮、通用 `menuItems` API。

## Native 菜单

`packages/dom-webview`：

- `DomWebView.types.ts` / `DomWebViewModule.swift` 增加
  `selectionMenu?: 'default' | 'copyComment'`（缺省 `'default'`）和
  `selectionCommentTitle?: string`。
- `DomWKWebView.buildMenu(with:)`：`'copyComment'` 时
  `remove` `.lookup` / `.share` / `.speech` / `.learn`，保留
  `.standardEdit` 里的 Copy；在其后插入 inline `UIMenu`，一条
  `UICommand`（title = `selectionCommentTitle`，缺省「评论」，
  action = `#selector(requestSelectionComment)`）。
- `requestSelectionComment` **只** `evaluateJavaScript`
  `window.__yohakuRequestSelectionComment && window.__yohakuRequestSelectionComment()`。
  不在 Swift 里读选区。
- 该 prop 与 `scrollEnabled` 一样，领养时写到当前 `WKWebView`。池里的
  实例在被领养前保持 `'default'`。

文章 `RichBody` 的 `dom` 传入：

```
selectionMenu: 'copyComment'
selectionCommentTitle: t('comment.selectionAction')
```

`buildMenu` 同步、JS 求值异步，所以「评论」始终出现；能不能评在点下去再判。

## 选区桥（DOM → Native）

`apps/mobile/src/components/dom/` 新增选区模块（从 web 拷贝，不改算法）：

- `anchor-utils.ts` ← `apps/web/src/components/modules/comment/anchor-utils.ts`
- `anchor-resolve.ts` ← `apps/web/src/components/modules/comment/anchor-resolve.ts`
- 类型与 web 对齐，写在这两个文件里，不新增 `@haklex/rich-editor` 入口：
  `RangeAnchor` 含 `mode: 'range'`、blockId、offsets、quote、prefix、
  suffix、fingerprint、可选 `lang`

`rich-body.tsx` 注册 `window.__yohakuRequestSelectionComment`：

1. `document.getSelection()`，空 / collapsed → 失败。
2. 选区必须落在 `.rich-content` 内，且不在
   `[data-no-article-selection]`。
3. `extractBlockInfos(content)` + `buildRangeAnchorFromSelection`。
   跨 block、无 `blockId`、空 quote → 失败。
4. 成功：`postMessage({ type: 'yohaku:selection-comment', selectedText, anchor })`。
5. 失败：`postMessage({ type: 'yohaku:selection-comment-invalid' })`。

`article-body.tsx` 的既有 `onMessage` 分发这两类。invalid 时 toast
`comment.selectionInvalid`（「请选择同一段落内的文字」），不弹 sheet。
成功则打开 sheet。`lang` 固定 `null`（mobile 无文章译文切换）。

markdown 正文没有 lexical `blockId`，走失败路径。不为此关菜单。

## Sheet 与发评

`ArticleBody` 新增必填 `refId` + `refType: 'post' | 'note'`（与
`primeKey` 分开：后者只给池用）。sheet、anchors query、往 `RichBody`
灌 `rangeComments` 都归它。post / note 详情把已有的内容 id 传进来。

呈现：`Modal` `presentationStyle="pageSheet"`，与 nested-doc 同一套。

Sheet 状态是一个对象：

```
{ kind: 'compose', selectedText, anchor }
| { kind: 'thread', anchor }
```

两种 kind 同一张 sheet：

- 顶上：小标题 `comment.selectionTitle`（「划线评论」）+ 衬线只读引用
  `anchor.quote`（过长截断，约 4 行）+ 发丝线。
- `kind: 'thread'` 时，引用下方列出该 `blockId + startOffset + endOffset`
  的根评论及其已加载回复（`CommentCell` 复用）。回复入口仍走现有
  `onReply`。
- 底部 `CommentInputWell`。未登录显示「登录后加入讨论」，sheet 照开。
- 发根评论：`api.readerComment(refId, refType, text, anchor)`。
- 回复：`api.readerReply(parentId, text)`，**不带** anchor。
- 成功：invalidate `['comments', refId]`（及下面的 anchors query），关 sheet。
- 失败：井下方报错，草稿保留，sheet 不关。

键盘：sheet 内 `ScrollView` `automaticallyAdjustKeyboardInsets`。

## API

`ApiComment` 增加可选 `anchor?: CommentAnchor | null`。`CommentAnchor` 与
web 同形，至少识别 `mode: 'range' | 'block'`；本轮只消费 `range`。

`readerComment` 签名改为第四参可选 `anchor`，POST body 为
`{ text, ...(anchor ? { anchor } : {}) }`。路径与 query 不变：
`POST /comments/reader/:refId?ref=post|note`。mx-core 已收 web 的
同形 `anchor`，mobile 不改服务端。

## 下划线

评论列表 query 只保证已翻页的根。下划线另走一条 sibling query，避免
「第一页以外的划线不出现」：

- key `['comments', refId, 'anchors']`
- `GET /comments/ref/:id?page=1&size=100`
- 抽出 `anchor.mode === 'range'` 的根，作为可序列化 props 传进
  `RichBody`：`rangeComments: { id, anchor }[]`
- 超过 100 条根的划线本轮不画（个人站点评论量远低于此）
- 发评成功后与列表 query 一同 invalidate

`rich-body` 在 `.rich-content` 就绪后：

1. `resolveRangeAnchor` + `createDomRange`。
2. `status === 'block-fallback'` 的丢掉。
3. `CSS.highlights.set('comment-highlight', new Highlight(...ranges))`。
4. 样式与 web 相同：

```
::highlight(comment-highlight) {
  text-decoration: underline dashed;
  text-decoration-color: color-mix(in srgb, var(--color-accent) 50%, transparent);
  text-underline-offset: 2px;
}
```

sheet 打开期间，当前 `anchor` 再设一层 `comment-selection-active`
（实线底 + 淡 accent 背景，与 web 写评时一致）；关掉删除。

不做 `comment-highlight-hover`。

## 点开

Highlight 不在 DOM 树上。在 `.rich-content` 上听 **`click`**（不用
`pointerdown`，以免抢走长按选字）：

- `caretRangeFromPoint` / `caretPositionFromPoint` +
  `range.comparePoint` 命中，规则与 web `CommentAnchorHighlight` 相同。
- 命中：`postMessage({ type: 'yohaku:range-comment', anchor })`，详情打开
  `{ kind: 'thread', anchor }` sheet。
- 未命中：不处理，让链接 / 图片既有 click 继续走。

## 列表里的引用

`CommentCell`：根评论且 `anchor.mode === 'range'` 时，作者行下方、正文
上方加一行衬线「`anchor.quote`」（`text-copy-13` / neutral-7，最多 2
行）。回复不加。声音跟 sheet 里的引用对齐，不用纯 meta 灰字。

## i18n

`apps/mobile/src/i18n/messages/{zh,zh-TW,en,ja,ko}.ts` 的 `comment`
命名空间新增（五份目录必须同 key，`messages.test.ts` 会查）：

| key | zh |
|---|---|
| `selectionAction` | 评论 |
| `selectionInvalid` | 请选择同一段落内的文字 |
| `selectionTitle` | 划线评论 |

## 组件落点

| 位置 | 改动 |
|---|---|
| `packages/dom-webview/ios/DomWebView.swift` | `buildMenu` + `requestSelectionComment` |
| `packages/dom-webview` types / module | `selectionMenu` / `selectionCommentTitle` |
| `apps/mobile/src/components/dom/anchor-utils.ts` | 从 web 拷贝 |
| `apps/mobile/src/components/dom/anchor-resolve.ts` | 从 web 拷贝 |
| `apps/mobile/src/components/dom/rich-body.tsx` | 注册选区函数、画线、click 命中 |
| `apps/mobile/src/screens/details/article-body.tsx` | 收 `refId`/`refType`、开菜单、分发 message、持有 sheet + anchors query |
| `apps/mobile/src/screens/details/{post,note}-detail.tsx` | 把内容 id / `'post'`|`'note'` 传给 `ArticleBody` |
| `apps/mobile/src/screens/comments/selection-comment-sheet.tsx` | 新：引用 + 可选 thread + InputWell |
| `apps/mobile/src/screens/comments/comment-cell.tsx` | range 引用行 |
| `apps/mobile/src/screens/comments/use-comments.ts` | anchors sibling query |
| `apps/mobile/src/api/{client,types}.ts` | `anchor` 类型与 POST |
| `apps/mobile/src/i18n/messages/*` | 三 key |

`webview-host.ts`、`insights-body`、pool warmer、nested-doc `RichBody`
不传 `selectionMenu`，零菜单改动。

## 错误与边界

- 跨段 / 空选 / 非 lexical / `data-no-article-selection`：toast，无 sheet。
- 评论 GET 失败：无下划线；选区发评仍可用。
- 发评 401：沿用 client 清 session；井切回登录 CTA。
- 服务端幂等「已说过」：井下原文案，sheet 不关。
- 池领养：`selectionMenu` 在 Prop 同步时写上，不依赖 prime。
- TTS `.tts-current` 与 `::highlight` 不冲突，无需互斥。

## 验证

- Vitest：拷过来的 `anchor-utils` / `anchor-resolve` 带上 web 已有用例
  （exact / 跨 block 拒绝 / fuzzy / block-fallback）。`readerComment`
  POST body 在有无 `anchor` 两条路径上各锁一次。i18n 五目录 key 对齐
  走现有 `messages.test.ts`。
- 模拟器（`expo run:ios`）真文章：选中一段 → 菜单只有复制和评论 →
  评论 → sheet 引用正确 → 发出后 sheet 关、正文出现虚线 → 点虚线回到
  该段 thread。跨段选中 toast。未登录点评论出登录 CTA。nested-doc /
  Insights 仍是系统默认菜单。长按选字不被 click 抢走。
