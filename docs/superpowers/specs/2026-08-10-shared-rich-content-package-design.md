# 共享富文本渲染包 `@yohaku/rich-content` 设计

日期：2026-08-10
状态：设计已确认，待实施
范围：Lexical 渲染路径（Markdown 路径留待后续独立 spec）

## 目标

让 mobile app 的 WebView 正文渲染力对齐 web，手段是把 web 的 Yohaku Lexical 渲染层抽成两端共用的 workspace 包，用「宿主能力注入」隔离环境差异。

非目标：本次不动 Markdown 渲染路径。历史内容（`contentFormat` 为 `null`）走 markdown，mobile 目前是裸 `markdown-to-jsx`，该路径的修复另开 spec —— 但本 spec 建立的 CSS 管道与 `HostCapabilities` 接口需要能被它直接复用。

## 现状

### Web

`apps/web/src/components/ui/rich-content/LexicalContent.tsx` 用 `composeRenderer` 组装：

- 上游 `@haklex/rich-compose` 模块 13 个
- Yohaku override 13 个（`Lexical*Override.tsx`）
- Yohaku biz 模块 5 个（poll / map / stock / afilmory / chat）+ web 自建 `staticExcalidrawModule`
- 样式：`lexical-content-styles.ts` 精选 12 个 `@haklex/rich-compose/style/*.css` 子路径，**故意跳过** code-block / link-card / poll / quote / table / alert / banner / nested-doc（这些被 override），再叠 `yohaku-block-styles.css`（389 行纯 CSS，零 `@apply`）

### Mobile

`apps/mobile/src/components/dom/rich-body.tsx`（`'use dom'`）：

- 上游模块 13 个，**Yohaku override 0 个**
- biz 节点通过 `UNSUPPORTED_TYPES` 白名单预先替换成占位段落（`〔投票 · 请在网页中查看〕`）

> **实施期实证修正（Task 4）**：本文档原先断言「`parseEditorState` 遇到未注册类型会崩」。实测在 `@haklex/rich-compose` 0.34.0 下并非如此 —— 未注册节点被**静默丢弃**，不抛错。因此 `sanitize` 的真实价值不是防崩溃，而是把**静默丢内容**转成**可见的占位提示**。下文「错误处理」一节按此理解。
- 样式：`import '@haklex/rich-compose/style.css'` 吃**全量**，与 web 的精选清单不一致，上游默认样式会盖住 Yohaku 语义

### 分层实测

读过全部 override 源码后的准确分层（与初判不同，初判认为 A 层六个 override 全部零耦合）：

| 类别 | 成员 | 耦合 |
|---|---|---|
| 纯语义 class | Alert · Banner · Details · ListItem | 仅依赖 `yohaku-block-styles.css` |
| Tailwind utility | Blockquote · Table · Heading | `text-copy-15` / `border-neutral-3` / `i-mingcute-hashtag-line` |
| 可移植但需替环境 | Image+Exif(`exif-js`) · Mermaid(`lumeo` + 上游 `MermaidRenderer`) · excalidraw-static(rough.js 手写场景) · chat · mark-ink / selection-ink | `useIsDark` / apiBase |
| 真宿主耦合 | openImage(photo-zoom) · nested-doc(modal stack) · heading 锚点滚动 · inline link(floating-ui hover card) · block link card(enrichment) · CodeBlock(shiki) | 需注入 |
| biz 取数 | poll(`~/lib/request`) · afilmory(manifest) · stock(`~/constants/env`) | 需注入 |

**结论：Tailwind 管道是这个包的必需件**，因为 Blockquote / Table / Heading 用 utility class，而 mobile 的 Metro 里没有 Tailwind。

## 架构

### 包形态

`packages/rich-content` → `@yohaku/rich-content`，**源码包 + 一个 checked-in 构建产物**（形态对齐 `@yohaku/design-system`：无构建步骤，两端各自 transpile 源码）。

```
packages/rich-content/
├── src/
│   ├── host.tsx                    HostCapabilities 接口 + Context + useHost()
│   ├── lexical/
│   │   ├── create-renderer.tsx     createYohakuLexicalRenderer(host) → composeRenderer 实例
│   │   ├── sanitize.ts             未注册 node type → 占位段落（通用兜底）
│   │   ├── overrides/              Alert Banner Blockquote Details ListItem Table Heading
│   │   ├── portable/               Image+Exif · Mermaid · excalidraw-static · chat · ink
│   │   └── biz/                    poll · stock 快照 · afilmory · map 占位
│   └── styles/
│       ├── yohaku-block-styles.css 389 行纯 CSS，从 web 原样迁入
│       └── module-imports.ts       @haklex 精选 CSS 清单（从 lexical-content-styles.ts 迁入）
├── styles/build.css                Tailwind CLI 入口
├── tailwind.config.ts              仅 icons plugin，复刻 apps/web/tailwind.config.ts
├── scripts/check.ts                CSS drift 检查
└── dist/rich.css                   构建产物，checked in
```

`package.json` 的 `exports`：

```json
{
  "./host": "./src/host.tsx",
  "./lexical": "./src/lexical/create-renderer.tsx",
  "./module-imports": "./src/styles/module-imports.ts",
  "./block-styles.css": "./src/styles/yohaku-block-styles.css",
  "./rich.css": "./dist/rich.css"
}
```

三个样式入口职责单一，互不重叠：`./module-imports` 是 `@haklex` 精选 CSS 清单（现 `lexical-content-styles.ts` 的内容，该文件迁走后 web 侧删除），`./block-styles.css` 是 Yohaku 语义层，`./rich.css` 只含 Tailwind utility 层。

- web：引前两者，Tailwind utility 由 web 自己的编译产出
- mobile：三者全引，`rich.css` 补上 Metro 没有的 utility 层

### CSS 管道

两端同源、消费方式不同。

**Web** —— 保持现有 Tailwind 配置不变，只在 `apps/web/src/styles/tailwindcss.css` 增加扫描源：

```css
@source "../../../../packages/rich-content/src/**/*.{ts,tsx}";
```

web 已有 `@config "../../tailwind.config.ts"`（`@egoist/tailwindcss-icons`，收录 material-symbols / mingcute / octicon）和 `@import '@yohaku/design-system/tokens.css'`（含 `--text-copy-15`、`--text-label-12` 等 type scale），包内 utility 与语义 scale 全部现成。

**Mobile** —— 消费预编译产物。`packages/rich-content/styles/build.css`：

```css
@import 'tailwindcss';
@config "../tailwind.config.ts";
@import '@yohaku/design-system/tokens.css';
@source "../src/**/*.{ts,tsx}";
```

不 import `yohaku-block-styles.css` —— 它由两端各自单独引，保证 `rich.css` 只承担 utility 层，不与 `./block-styles.css` 重复。

`@tailwindcss/cli` 产出 `dist/rich.css`，`rich-body.tsx` 直接 `import '@yohaku/rich-content/rich.css'`。该路径已验证可行：`rich-body.tsx` 现在就 `import 'katex/dist/katex.min.css'` 与 `@haklex/rich-compose/style.css`，Metro 的 DOM web bundle 吃 CSS import。

产物 checked in，避免给 mobile 引入构建步骤。`scripts/check.ts` 重建后 `git diff --exit-code dist/rich.css` 做 drift 检查，模式照抄 `@yohaku/design-system` 的 `check.ts`。

**顺带修的 bug**：mobile 从全量 `style.css` 切到 `module-imports.ts` 精选清单，让 Yohaku override 拿到正确的层叠顺序。`yohaku-block-styles.css` 里那段「Tripled class selectors beat @haklex foundation.css resets」的注释就是在打这场仗。

### HostCapabilities

```ts
export interface HostCapabilities {
  openImage(payload: { images: string[]; index: number; src: string }): void | Promise<void>
  openLink(url: string): void | Promise<void>
  scrollToAnchor(id: string): void | Promise<void>

  // 绝对 URL 直接使用（afilmory 的 galleryUrl 是站外地址）；相对路径拼 apiBase。
  // 宿主负责鉴权与错误归一化
  fetchJSON<T>(url: string, init?: RequestInit): Promise<T>

  slots?: {
    InlineLink?: ComponentType<InlineLinkProps>
    BlockLinkCard?: ComponentType<{ url: string }>
    CodeBlock?: ComponentType<{ code: string; language?: string }>
    StockKLine?: ComponentType<StockKLineProps>
    MapBlock?: ComponentType<MapSlotProps>
  }

  // nested-doc 的 UI 文案。web 传 next-intl 的翻译结果，mobile 传常量
  labels: { nestedDocLabel: string; nestedDocExpand: string }

  nestedDocPresentation: 'modal' | 'inline'
  theme: 'light' | 'dark'
  apiBase: string
  webOrigin: string
}
```

**取数原语**：`@tanstack/react-query` 是 web 侧 poll adapter / afilmory manifest / excalidraw 的共同依赖，mobile 没装。为避免「同一份取数逻辑两端各写一遍」，包内自带极小的 `useResource(key, fetcher)`（内存缓存 + in-flight 去重，约 40 行），所有 biz 取数一律走它 + `host.fetchJSON`。web 侧的 react-query 保留在 web 自己的代码里，不进包。

**host 对象不过桥**：`webviewHost` 是在 `rich-body.tsx`（WebView 内）本地构造的，只有它包装的 DOM props 函数才过桥。因此 `slots` 放组件、host 放 hook 都没问题；序列化约束只作用于传给 `onImagePress` / `onLinkPress` 这类函数的**参数**。

**组件槽是承重墙**：包负责「Yohaku 排版壳 + 什么时候渲染什么块」，宿主负责「这块用哪个实现」。web 保住 floating-ui hover link card 和全量 shiki，mobile 换轻量实现，两端块结构与 `yohaku-block-styles.css` 完全一致。

**过桥约束**：`expo/dom` 支持函数当 props 传递（`rich-body.tsx` 现有的 `onImagePress` / `onLinkPress` 即是），但参数必须可序列化、函数必须 async。这否掉了 `expandNestedDoc(payload: { content: ReactNode })` —— `ReactNode` 过不了桥。改用策略位 `nestedDocPresentation`：web 传 `'modal'`（复用现有 modal stack + `PeekModal`），mobile 传 `'inline'`（就地展开，包内实现）。inline 展开的高度变化走 `ResizeObserver → matchContents` 正常路径，而 modal 会撑高 body 污染 RN 容器高度测量。

### C 层降级策略

降级写死在包里，不给宿主选择余地，否则又生出双份逻辑。

| 块 | mobile 行为 |
|---|---|
| poll | 渲染选项 + 票数条；无投票通道时投票按钮禁用 + 「在网页中投票」 |
| stock | 只搬 `StockSnapshotRenderer` 静态快照卡。**`lightweight-charts` K 线整块不进包**，`YohakuKLineCard` 留 web 侧走 `slots.StockKLine` 注入；mobile 不传该 slot，K 线块渲染为快照卡 |
| afilmory | manifest 走 `fetchJSON`（绝对 URL），渲染缩略图网格，点击走 `openImage` |
| map | 包内只提供静态占位卡（标题 + 坐标 + 「在网页中打开」），不引地图库。web 通过 `slots.MapBlock` 注入现有 `next/dynamic` 版 `MapBlock`；mobile 不传，落到占位卡 |
| excalidraw | 包内 rough.js 静态场景渲染（web 现有实现原样迁入） |

### mobile 特有约束

`--surface-paper` 定义在 `apps/web/src/styles/variables.css`（运行时注入层），**不在** design-system 的 tokens.css 里，而 `LexicalNestedDocOverride` 的截断渐变遮罩用到它。mobile 的 `rich-body.tsx` 必须显式注入该变量，否则遮罩渐变到 `transparent` 失效。

`scrollToAnchor` 不是可选项。mobile WebView 是 `scrollEnabled: false` + `matchContents: true`，滚动条在外层 RN ScrollView 上。现有 `lexicalHeadingOverride` 的 `springScrollToElement(target, -100)` 在 webview 内执行等于 no-op —— 点标题锚点无反应。必须改成 `host.scrollToAnchor(slug)`，mobile 实现转发到 RN 侧滚动 ScrollView。

## 错误处理

现状两端都是**整篇级**边界（web 的 `<ErrorBoundary>`、mobile 的 `BodyErrorBoundary`），一个 biz 块崩掉整篇正文退化成「在网页中打开」。C 层进来后该粒度不可接受。

- **块级边界**：`createYohakuLexicalRenderer` 给每个 biz 块（poll / stock / afilmory / map / excalidraw / mermaid）套 boundary，崩了只把该块换成占位卡，正文其余照常渲染
- **整篇级边界**保留作最后兜底
- **未注册 node type**：清空 mobile 现有的 `UNSUPPORTED_TYPES` 白名单（poll/map/stock/afilmory 抽包后都已注册），换成 `sanitize.ts` 的通用兜底 —— 递归遍历时遇到包内未注册的 type 一律替换成占位段落。这样 admin 后续新增节点类型不会让 mobile 白屏
- mobile 现有三阶段 watchdog（`nextWatchdogPhase` → reload → fail）保持不动

## 测试

| 层 | 方式 |
|---|---|
| override 单测 | 包内 vitest + happy-dom，逐个断言关键 class / DOM 结构，不依赖宿主 |
| 契约 fixture | 一份覆盖全部块类型的 `SerializedEditorState`，两端各渲染一次，断言块级 class 齐全 |
| CSS drift | `scripts/check.ts` 重建 `dist/rich.css` 后 `git diff --exit-code` |
| host 契约 | mobile 侧断言 `webviewHost` 所有动作的参数可序列化，防止再出现 ReactNode 过桥类问题 |

## 实施顺序

第 0 步先立基线，随后六步；第 1–4 步 web 单独可验证、mobile 不受影响，第五步才是 mobile 一次性切换。

0. **体积与时延基线**。测当前 mobile DOM bundle 体积（`npx expo export` 产物中 `'use dom'` 对应的 bundle）与渲染时延（复用 `src/screens/dev-demos/webview-pool-lab.tsx` 现有计时：挂载 → `yohaku:rendered`，现状冷启动 2689ms / 池化领养 16-27ms）。数字记进本 spec 末尾的基线表，第 3 步与第 4 步完成后各复测一次
1. 建包 + CSS 管道跑通 + 迁入 Alert / Details / ListItem，web 切过去，验证零回归
2. 迁入 Blockquote / Table / Heading + `HostCapabilities` 落地 + `scrollToAnchor` 改造，web 切过去
3. 迁入可移植层剩余：Image+Exif / Mermaid / excalidraw-static / chat / mark-ink / selection-ink
4. 迁入 C 层只读渲染器（poll / stock 快照 / afilmory / map 占位），K 线走组件槽留 web
5. mobile `rich-body.tsx` 重写为薄壳 + `webviewHost`，`module-imports.ts` 替掉全量 `style.css`
6. mobile 端验证：模拟器跑真实文章，逐块比对

## 风险

- **web 回归面**：`LexicalContent.tsx` 服务所有文章 / 笔记正文。缓解手段是分步迁移，每步只动一小撮 override，web 侧独立验证后再进下一步
- **WebView bundle 体积**：现状冷启动 2689ms、池化领养 16-27ms。C 层引入 rough.js、exif-js、mermaid 会推高 DOM bundle。缓解：第 0 步先立基线，第 3、4 步后各复测；K 线（`lightweight-charts`）与地图库明确不进包；若复测显示冷启动明显恶化，再评估 Metro 的 `import()` 分包（该能力在 DOM 组件里未验证，不作为本次前提）
- **CSS 产物 drift**：产物 checked in 是已定的取舍（换取 mobile 侧零构建步骤），代价是依赖开发者记得重建。缓解：`scripts/check.ts` 纳入 lint 流程

## 基线

第 0 步填写，第 3、4 步后追加行。

| 时点 | DOM bundle (gzip) | 冷启动 | 池化领养 |
|---|---|---|---|
| 迁移前 | 6,088,768B / 5.81MiB（raw 27,947,642B） | 2689ms | 16-27ms |
| Task 4 后 | 6,088,312B / 5.81MiB（raw 27,946,759B） | 2689ms | 16-27ms |

体积经 `npx expo export --platform ios` 实测：默认参数下导出因 Metro serializeHtml 的 common chunk 断言 bug（`Error: Asset not found: _expo/static/js/web/__common-*.js`，退出码 1）而失败，产物目录为空；加 `EXPO_NO_BUNDLE_SPLITTING=1` 绕过（禁用 web bundle 分包）后导出成功，`www.bundle/` 下只产出单个 DOM JS 文件。第 3、4 步复测须使用同一 workaround（或待 Expo 修复该 bug 后统一切换）以保证口径一致。时延两列为既有记录值，冷启动/池化领养复测待人工在模拟器中执行（见 task-0-report.md）。

Task 4 后的体积与迁移前几乎完全相同（差 456B gzip，属噪声范围）——**这是预期结果，不是没有变化**：`apps/mobile/src/components/dom/rich-body.tsx` 目前仍是独立实现，尚未导入 `@yohaku/rich-content`（Task 5 才切换），所以本次导出的 Metro 依赖图完全没有触达 Task 4 新增的 poll/stock/afilmory/map biz 模块与 `rough.js`/`exif-js` 等依赖。`@yohaku/rich-content` 包本身在 Task 4 后的真实体积影响，要等 Task 5 把 mobile 接到 `createYohakuLexicalRenderer()` 之后才能测出来。
- **nested-doc 观感差异**：mobile 走 inline 展开而非原生 modal，与 web 的浮层观感不同。这是为绕开 ReactNode 过桥与 matchContents 高度污染而做的有意取舍
