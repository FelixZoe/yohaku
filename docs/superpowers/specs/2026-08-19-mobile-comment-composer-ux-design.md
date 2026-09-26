# mobile 评论写读 UX

2026-08-19 · 状态：已批准

修订 `2026-08-11-mobile-comments-likes-design` 的输入井位置，以及
`CommentCell` 回复层级的视觉。API、markdown 子集、点赞、划线算法、
举报长按、展开 thread、分页均不动。

## 背景

评论已按 8-11 / 8-14 spec 落地：`CommentSection` 接在 `ArticleBody` 之后，
输入井在列表上方。回复只给井挂 chip，不滚回输入井；长文里点「回复」要
往上找框。未登录社交井 `minHeight: 140`，登录后多行井 72pt + 发送行，
挡住评论第一屏。回复列表 `marginLeft: 42`（按根头像整列对齐），过宽。

## 已定决策

- **写贴键盘，不进 sheet。** 文章评论仍 inline；真正的 `WellInput` 是
  `ScrollView` 外、贴键盘的 `CommentComposer`。列表里只留一行入口。
- **三态：** 静止一行入口 → 贴底写/回 → 未登录同一行高度。
- **材质：** iOS 26 `GlassView` `regular`（`isGlassEffectAPIAvailable`，
  与朗读条 / Toast 同一检测）；iOS 18 实色 `desk` + 顶发丝线，不装假模糊。
  条贴满键盘宽度，不是朗读条那种 inset 胶囊。
- **读：** 回复仍缩进，**16px**、24px 头像。直回根评论不写 `›`；回复的
  回复名行 `余 › 井上`。行上保留「回复」。
- 思考 sheet、划线 sheet **共用** `CommentComposer`。

明确排除：游客发评、评论编辑、排序、图片上传、块级 gutter、把文章评论
改成独立 sheet、iOS 18 毛玻璃 polyfill。

## Composer

### 结构

`CommentComposer` 与滚动容器是兄弟，不能放进 `ArticleTail`（它仍在
ScrollView 里）。`draft` / `replyTo` / `focused` 放在详情屏或 sheet 根。
`CommentSection` 的入口和「回复」只回调上去。`ArticleTail` 把回调
继续传到屏根，不在 Tail 里存 draft。宿主：

| 宿主 | 滚动容器 | Composer 贴在 |
|---|---|---|
| post / note 详情 | `EdgeEffectScrollView` | 屏幕底，键盘之上 |
| 思考 `formSheet` | sheet 内 `ScrollView` | sheet 底 |
| 划线 `pageSheet` | sheet 内 `ScrollView` | sheet 底 |

`CommentSection` 不再渲染真正的输入框。标题「评论 N」下是一行约 44pt
的井形入口：登录后 placeholder「写下评论…」；未登录「登录后加入讨论」+
现有 `ProviderButton`（高度收进同一行，去掉 `minHeight: 140`）。点入口
→ `focused`，`replyTo = null`。点社交按钮 → 现有 OAuth，回来后入口变成
写评 CTA。

### 贴底

键盘升起。回复时井上方 chip：现有 `replyingTo` + ×。井在左、发送在右
（ink，高 36）。井 `minHeight` 约 44、最多约 140，往上长。距 500 字还剩
100 以内才露计数。错误仍在井下。

点「回复」：设 `replyTo`、聚焦、把该 `CommentCell` 滚到 composer 上方
留约 12pt。点 chip ×：清 `replyTo`，键盘不收。发送成功：清空、清
`replyTo`、收键盘（划线 sheet 发**根**评仍关 sheet，与 8-14 一致；回复
成功留在 sheet）。失败：贴底留着，草稿不动。

朗读条在 `focused` 时让开，避免两层底栏叠。

### 键盘与 WebView

文章页 `EdgeEffectScrollView` 现在 `automaticallyAdjustKeyboardInsets`。
Composer 聚焦时关掉它，改用 `contentInset.bottom = composer 高度`
（composer 已经吃掉键盘，ScrollView 不要再垫一层）。思考 / 划线 sheet
同样：Composer 在 ScrollView 外，避免 RNScreens formSheet 把包在 View
里的 ScrollView 做成零高。

### 材质细节

```
isGlassEffectAPIAvailable()
  ? GlassView colorScheme={palette.theme} glassEffectStyle="regular"
  : View backgroundColor={desk} + 顶 hairline
```

井仍是 `surface.well` + `shadow.wellInset`。发送不进井里。玻璃条
`overflow: 'hidden'` + `borderCurve: 'continuous'`；外缘贴屏幕左右与
键盘顶，圆角只出现在上沿（左右下贴齐，不要做成悬浮 pill）。

## 评论行

改 `comment-cell.tsx` / `comment-section.tsx` 的 replies 容器：

- `styles.replies.marginLeft`：**42 → 16**。
- 回复头像 24px 保留。
- `replyTargetAuthor` 行为已是「parent 是根则 null」。把现在单独一行
  `replyingTo` 挪进名行：`name › {replyTargetName}`。`›` 用 n-6 小字；
  被回者名用 accent 70% on n-7，与 web thread 名行同思路。无
  `replyTargetName` 时名行仍是 名 + 主人/置顶 + 时间。
- 「回复」仍是名行下的 meta 按钮，不是点整行。
- 划线引用衬线、最多 2 行、长按举报：不动。

## 组件落点

| 位置 | 改动 |
|---|---|
| `screens/comments/comment-composer.tsx` | 新：贴底井 + chip + 发送 + glass/fallback |
| `screens/comments/comment-section.tsx` | 去掉 `CommentInputWell`；44pt 入口；回复缩进 16；`onReply` 交给宿主 |
| `screens/comments/comment-input-well.tsx` | 并进 `CommentComposer`，不再由 section 直接渲染 |
| `screens/comments/comment-login-inline.tsx` | 压成 44pt 行（入口未登录态） |
| `screens/comments/comment-cell.tsx` | `replyTargetName` 进名行，去掉单独一行 |
| `screens/details/article-tail.tsx` | 仍只含赞 + `CommentSection`；不挂 Composer |
| `screens/details/{post,note}-detail.tsx` | Composer 与 `EdgeEffectScrollView` 兄弟；聚焦时改 keyboard inset；把回复 cell 滚进视口 |
| `screens/comments/thinking-comments-sheet.tsx` | Composer 与 sheet ScrollView 兄弟 |
| `screens/comments/selection-comment-sheet.tsx` | 同上；根评发送仍关 sheet |
| `lib/comment-thread.ts` | 不改 `replyTargetAuthor` |
| i18n | 不新增 key |

## 错误与边界

- 列表失败 / 空态 / 评论关闭：仍在 `CommentSection` 内，与 composer 无关。
- 未登录点「回复」：入口已是登录行；`showReply` 仍仅登录可见，不变。
- 发送 401：沿用 client 清 session，入口切回登录行，composer 收起。
- 服务端「已说过」：井下原文案，不收键盘。
- 无障碍：入口与发送保持按钮/输入角色；chip × `hitSlop` ≥ 10。

## 验证

- 文章长文：点一条靠下的「回复」，该条出现在键盘上方，无需先滚到文末井。
- 静止：评论标题下是一行入口，列表紧跟，第一屏能看到至少一条评论。
- iOS 26：贴底条是系统玻璃；iOS 18 模拟器：实色 + 发丝线，无半透明糊层。
- 回复的回复名行为 `余 › 井上`；直回根的回复名行没有 `›`。
- 缩进目测约一头像半径，不是整列头像宽。
- 思考 sheet、划线 sheet 键盘不盖输入；formSheet 不零高。
- 朗读中打开输入，朗读条让开；收键盘后朗读条可回来。
- Vitest：`replyTargetAuthor` 现有用例仍过（根 parent → null）。不强制新视觉单测。
