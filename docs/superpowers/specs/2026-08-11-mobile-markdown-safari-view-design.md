# mobile markdown 内容改走 SFSafariViewController

2026-08-11 · 状态：已批准

## 背景

mobile 详情页已适配 Lexical 渲染（`@yohaku/rich-content` 经 `RichBody` DOM WebView）。`contentFormat === 'markdown'` 的旧内容目前退回 `post.text` / `note.text`，在同一个 DOM WebView 里用 `markdown-to-jsx` 低保真渲染——无 Shiki、无 mx-space 扩展语法、样式与源站不一致。决定不再原生渲染 markdown：一律用 `expo-web-browser`（SFSafariViewController，底层 WebKit）在 app 内打开源站对应页面。

## 已定决策

- **呈现形态**：SFSafariViewController 模态（`WebBrowser.openBrowserAsync`），不做推入导航栈的自绘 WKWebView 页。
- **拦截时机**：列表点击时拦截，markdown 条目不进 detail 路由；detail 保留兜底。
- **旧路径**：`markdown-to-jsx` 内嵌渲染彻底移除，接受 markdown 文章离线不可读。
- **范围**：post + note。thinking 列表是纯文本内嵌展示，不涉及。

## 列表 meta 同步携带 contentFormat

- `sync/merge.ts`：`postMetaFromApi` / `noteMetaFromApi` 增加 `contentFormat: x.contentFormat ?? 'markdown'`。mx-core 列表接口已确认返回该字段（post/note 均有），且为标量，不受 `truncate=160` 截断影响。
- `sync/upsert-sets.ts`：`postConflictSet` / `noteConflictSet` 增加 `contentFormat: sql\`excluded.content_format\``，并修正顶部注释——`text/content/body_version` 仍为 body 专属，`content_format` 改为 meta 拥有。
- DB 无迁移：`content_format` 列两表已存在。旧行该列可能为 null（body 未拉取过），下次列表同步回填；null 视作「格式未知」走 detail 兜底，不等同于 markdown。
- 服务端 markdown→lexical 转换的过渡态：列表同步先把 `contentFormat` 翻成 lexical 而本地 `content` 仍为旧值/null 时，detail 现有 `bodyVersion` 过期检测（`modifiedAt` 抬升）会触发 body 重拉，短暂 loading 后正常，无需额外处理。

曾考虑的替代方案（点击时先请求 detail API 判断格式）给每次点击加网络往返，否决。

## 列表点击拦截

`posts-list.tsx` / `notes-list.tsx` 的 `onPress`：

- `contentFormat === 'markdown'` → `WebBrowser.openBrowserAsync(webUrl)`；post 为 `${SITE_URL}/posts/${categorySlug}/${slug}`，note 为 `${SITE_URL}/notes/${nid}`。
- `'lexical'` 或 null → 照旧 push detail 路由。

## detail 兜底（deep link / 格式未知旧行）

body 加载完成（`bodyVersion !== null`）且判定非 lexical 时：自动弹一次 Safari；背后的 detail 页渲染「在网页中打开」可点文本，关闭 Safari 后可再点或正常返回，不留死页面。

## 移除旧 markdown 路径

- `components/dom/rich-body.tsx`：删除 `format` prop、`markdown-to-jsx` import 及分支。
- `screens/details/article-body.tsx`：删除 `format` 透传，只接 lexical。
- `apps/mobile/package.json`：移除 `markdown-to-jsx`（mobile 内仅 rich-body 引用，已确认）。
- 有密码的 note 打开源站页会由网页端要密码，行为交给 web，不做原生处理。

## 验证

- 单测：`merge.test.ts` 补 meta 函数输出 `contentFormat`；`upsert-sets.test.ts` 补列表重同步更新 `content_format` 但不覆盖 `text/content/body_version`。
- 模拟器手动矩阵：markdown post 点击弹 Safari、lexical post 原生渲染不回归、note 两种格式各一、deep link 直达 markdown post 走兜底、`contentFormat` 为 null 的旧行点击进 detail 后兜底弹出。
