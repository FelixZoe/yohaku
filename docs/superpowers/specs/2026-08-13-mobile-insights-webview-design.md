# mobile 余白 sheet：独立 DOM WebView + 池隔离

2026-08-13 · 状态：已批准

## 背景

文章详情的 AI 折叠卡已能点开「余白」，当前 `InsightsSheet` 把
`GET /ai/insights/article/:id` 的 Markdown 剥成 `AppText`。余白正文是
标题 / 列表 / 图 / 自定义 `<ref>`，web 用 `YohakuContent` → `markdown-to-jsx`
渲染；mobile 必须用 WebView 才能对齐排版。

正文已经走手搓的 `@expo/dom-webview`（`packages/dom-webview`）：全局池
`capacity = 2`，按 **bundle URL** `take`，但 `give` / `backfill` /
`noteSourceURL` / `noteBootScripts` 是全池一份、最后写入者生效。余白若当成
第二个普通 `'use dom'` 组件往里丢，会：

- 关掉 sheet 时 `give()` 占掉一格，文章回填被挤掉
- 覆盖 `storedSourceURL` 与 boot scripts，下一次 `primeArticleBody` 打空
  或 backfill 用余白的启动脚本把运行时弄坏

余白是点开 sheet 才拉的 Markdown，用不上文章那条点击 `prime`。

## 范围

做：

- `DomWebView` 增加 `pooled`（默认 `true`），余白 opt-out
- 独立 `'use dom'` 组件渲染余白 Markdown，文章 / 手记两套皮
- formSheet 里 WebView 自滚；图 → QuickLook；外链走现有 link 路由
- `<ref>` 角标对齐 web；点了在 sheet 内展开那段原文（不跳回文章 WebView）

不做：

- 不进文章池、不调 `prime`、不改 `WebViewPoolWarmer`
- 不把 Markdown 抽进 `@yohaku/rich-content`（包里明确另开 spec）
- 不复刻桌面侧栏撕纸 / 可拖宽度
- 不实现点角标滚回 Lexical 正文并闪高亮
- 不接 KaTeX / Shiki / Tabs / LinkCard 全家桶

## 已定决策

- 隔离手段 = **`pooled={false}`**，不是「共用 rich-body」也不是「扩成
  按 URL 分容的多池」。
- UI 对齐 **web 窄屏 `YohakuSheet`**，不是桌面 `YohakuDrawerPaper`。
- 文章用 `.markdown--yohaku`，手记用 `.markdown--yohaku-note`。
- 标题、meta 眉放进 DOM；原生只留 formSheet grabber。避免 RNScreens
  「`View` 包 `ScrollView` 整页空白」。
- 取数继续 `onlyDb: true`（折叠卡能点余白 ⇒ `hasInLocale`）。

---

## A · 池隔离

`packages/dom-webview`：

- `DomWebViewProps.pooled?: boolean`，默认 `true`（正文零变化）
- 原生 `Prop("pooled")` 落到 `DomWebView.pooled`，默认 `true`
- `pooled == false` 时：
  - `setupWebView()` **不** `take`、**不** `noteSourceURL`
  - `resetupScripts()` **不** `noteBootScripts`
  - `deinit` **不** `give`，直接丢弃 `WKWebView`
- 默认路径一行不改

`apps/mobile` 的 `insights-body` 传 `dom={{ pooled: false, ... }}`。
expo 的 `webview-wrapper` 会把 `dom` 摊到我们的 `WebView` 上——与
`primeKey` / `matchContents` 同一条路。

`expo-contract.test.ts` 把 `pooled` 加进契约快照。补单测：
`pooled: false` 的实例不进入 `give` 可观察面（能测的 JS 层测 prop
转发；Swift 行为靠模拟器：开余白再进第二篇文章，池日志无余白 URL、
文章仍 `adopt`）。

## B · DOM 组件

新文件 `apps/mobile/src/components/dom/insights-body.tsx`，`'use dom'`。
**单独入口 = 单独 babel bundle URL**，即使有人漏设 `pooled`，`take`
也不会领养到文章实例。`pooled={false}` 是防 `give` 污染，不是防领养串台。

Props（沙箱读不到 native store，全部由宿主传入）：

```ts
{
  markdown: string
  variant: 'post' | 'note'
  theme: 'light' | 'dark'
  locale: string
  fontFaces: RichBodyFontFace[]
  labels: { missing: string }
  onImagePress: (payload: { src: string; images: string[]; index: number }) => Promise<void>
  onLinkPress: (url: string) => Promise<void>
}
```

渲染：

1. `extractMeta(markdown)` 抽出 trailer（把 web
   `parser/extractMeta.ts` 拷到 `apps/mobile/src/lib/insights-meta.ts`，
   单测一起搬；本轮不抽共享包）
2. 剥 `<!-- insights-meta -->` 后交给 `markdown-to-jsx`
3. override：
   - `ref` → 圆角标（class 对齐 web `yohaku-ref-anchor`）。点了在
     文内展开 `quote`（小条，不是跳文章）
   - `img` → `<img>`，click 调 `onImagePress`（宿主 QuickLook）
   - `a` → `onLinkPress`
4. 顶栏：`YohakuMetaHeader` 的 plain / literary 两套文案（文章 plain，
   手记 literary 且仅 `zh*`），DOM 里用同样结构
5. 样式：从 web 抽出 `.markdown--yohaku` / `.markdown--yohaku-note` 的
   计算后规则（不要 `@apply`，mobile DOM 没有 Tailwind 编译这条
   入口）。token 用 `@yohaku/design-system` + 现有
   `createYohakuThemeStyle`。字体用正文同一套 `fontFaces`
6. 报 `yohaku:insights-ready`（可选，sheet 用来收 loading）

不注册 `window.__yohakuPrime`。

## C · Sheet 宿主

`InsightsSheet`：

- 原生只负责：拉数（已有 `api.insights` + react-query）、错误/空态
  （数没到或失败时仍用 `AppText`，**此时不要挂 WebView**）
- 成功后根节点是 `InsightsBody`，`dom`：

  ```
  pooled: false
  scrollEnabled: true
  matchContents: false
  contentInsetAdjustmentBehavior: 'never'
  automaticallyAdjustContentInsets: false
  style: { flex: 1 }
  ```

- 不要外面包 `ScrollView` / `View` 当滚动容器
- `kind` 从路由带上：`/insights/[kind]/[id]`（改现有
  `/insights/[id]`，否则手记套不上 note 皮）。`kind` 只决定
  `variant`，取数仍按 article id
- 图：`YohakuNative.presentQuickLook`，与 `ArticleBody` 相同
- 链：`hrefForExternalUrl` → 站内 `router.push`，否则
  `WebBrowser`

冷开 1–2s 可接受。数在飞时 sheet 先出 desk 底 + 一行 loading，
再换 WebView，避免空 WKWebView 闪白。

## D · 数据与文案

- 接口不变：`GET /ai/insights/article/:id?lang=&onlyDb=true`
- meta 从 content trailer 解析，不另开字段
- i18n：沿用 `notice.aiInsights` / loading / failed / missing；
  meta 眉的时长 / 难度 / 体裁键从 web `common.yohaku_*` 按需抄进
  mobile `notice`（五语言齐）
- `stripInsightsMarkup` 仍给测试和失败兜底用；主路径不再用它当
  UI

## 错误处理

| 场景 | 行为 |
| --- | --- |
| `onlyDb` 空 / 404 | 不挂 WebView，显示 `insightsMissing` |
| 请求失败 | `insightsFailed`，点行 refetch |
| Markdown 无 trailer | 照常渲染正文，不显示 meta 眉 |
| `<ref>` 无 quote | 角标仍在，点了无展开条 |
| 漏设 `pooled` | 独立 bundle URL 不会领养文章实例；`give` 仍会占格 —— 用 dev 断言或单测保证 insights 传了 `false` |
| 文章池被余白污染 | 视为回归：开余白再进第二篇，必须仍能 `adopt` 文章 URL |

## 验证

- Vitest：`extractMeta` 移植；`pooled` 出现在 expo 契约；
  insights 宿主把 `pooled: false` 传进 `dom`（抽纯函数测，或对
  sheet 的 dom 构造测）
- 模拟器：
  - 文章余白：无衬线、accent 小标题、plain meta
  - 手记余白：衬线、短木线、literary meta（中文）
  - 角标可点，sheet 内展开 quote
  - 图 QuickLook
  - 开余白 → 退回 → 再进另一篇，池日志仍是文章 URL 的 adopt / give，
    无余白 bundle URL
  - 明暗两套

## 文件

| 路径 | 动作 |
| --- | --- |
| `packages/dom-webview/src/DomWebView.types.ts` | `pooled?: boolean` |
| `packages/dom-webview/ios/DomWebView.swift` | 跳过 take / give / note* |
| `packages/dom-webview/ios/DomWebViewModule.swift` | `Prop("pooled")` |
| `packages/dom-webview/src/expo-contract.test.ts` | 契约加 `pooled` |
| `apps/mobile/src/components/dom/insights-body.tsx` | 新 `'use dom'` |
| `apps/mobile/src/screens/details/insights-sheet.tsx` | 改挂 WebView |
| `apps/mobile/src/app/insights/[kind]/[id].tsx` | 改路由带 kind |
| `apps/mobile/src/screens/details/article-ai-fold.tsx` | push 带 kind |
| `apps/mobile/src/lib/insights-meta.ts` | 从 web 拷 extractMeta |
| `apps/mobile/src/app/_layout.tsx` | 改 screen name |
