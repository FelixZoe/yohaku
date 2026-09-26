# 正文 codeblock UI 统一与实现收敛

2026-08-31

## 目标

1. **视觉重做**：正文里的代码块从「白卡片」改为「一条线」，去掉与正文割裂的容器感。
2. **实现收敛**：web / mobile / 共享包三份实现合并为一份，语言色与标签表只存在一处。
3. **覆盖 code-snippet**：`@haklex` 的多文件 code-snippet 节点纳入同一套设计语言。

## 现状

| | web | mobile | `@yohaku/rich-content` |
|---|---|---|---|
| 组件 | `ui/code-highlighter/shiki/ShikiWrapper.tsx` | `components/dom/code-block.tsx` | `lexical/portable/code-block.tsx` |
| 样式 | `shiki/Shiki.css`（`.shiki-code-*`） | `dom/code-block.css`（`.m-code-block*`） | `yohaku-block-styles.css`（`.yohaku-code-block*`） |
| 语言表 | `code-highlighter/constants.tsx`（icon + color） | `dom/code-block-chrome.ts`（label + color，手抄） | 无 |
| 高亮器 | Prism CDN（`CodeBlockRender` 的 `shikiNotSupports` 是空数组，Shiki 分支不可达） | Shiki（curated catalog） | Shiki |
| code-snippet | 上游 `@haklex/rich-compose/style/code-snippet.css`，零覆盖 | 同左 | 同左 |

三个已确认的问题：

- `dom/code-block.css` 是 `Shiki.css` 的逐行手抄（topline / divider / accent tint / copy 尺寸完全一致），语言色表也抄了一份，且已开始漂移（mobile 有 `'objective-c'` key，web 没有）。
- `PortableCodeBlock` 与 `.yohaku-code-block*` 是**死代码**：两个 host 都提供了 `slots.CodeBlock`，`CodeBlockOverride` 的 fallback 分支不可达；`yohaku-block-styles.css` 里「mobile 没有 Shiki 依赖」的注释已过时。
- code-snippet 完全没有 Yohaku 化，与重做后的 code-block 会视觉分裂。

## 视觉规范

### 结构

块内只有一个非文字视觉元素：**一条 1px `--color-neutral-4` 竖线**，贴块左缘，单色、不渐变、不分段、不叠色。所有层次由缩进量和 neutral 阶差表达。

**单代码块**

```
│  [icon] TypeScript                    复制     ← 头行
│  const r = createRenderer({ slots })           ← 代码
```

**code-snippet（多文件）**

```
│  [icon] renderer.ts  [icon] Host.tsx  [icon] setup.js   ← tabs 独占头行，可横滚
│  export const renderer = create({ slots })              ← 代码
│  renderer.ts                          复制              ← 尾行
```

**折叠态**（代码与线一起被 mask 裁到折叠处）

```
│  [icon] TypeScript                    复制
│  export const host = {
│    slots: { CodeBlock },
   （渐隐）
   展开 · 128 行                                          ← 单块：新增一行，居左
```

多文件折叠时并进已有尾行：`renderer.ts ｜ 展开 · 128 行 ｜ 复制`。

规则一句话：**头行放身份，尾行只在被迫时出现**——tabs 占满了头行把 copy 挤下去，或代码被折叠。没有内容就没有尾行。

### 度量与 token

| 元素 | 规格 |
|---|---|
| 线 | 1px，`--color-neutral-4`，`top:0 bottom:0`（折叠时随代码裁断） |
| 线 → 代码 | 18px |
| 块左缘 → 线 | 继承正文缩进，两端一致 |
| 代码 | `--font-mono`，`text-copy-13`（13/1.54），`--color-neutral-9` |
| 头行 / 尾行文字 | `--font-sans`，`text-label-12`，`--color-neutral-7` |
| copy / 非活动 tab | `text-label-12`，`--color-neutral-5`（触控热区靠 padding 撑到 44pt） |
| 活动 tab | `--color-neutral-9`，`font-medium`，**不加下划线、不加分隔线** |
| icon | 14px 方形，SimpleIcons 原品牌色 |
| 块外边距 | 上下 20px |

无边框、无阴影、无圆角容器、无背景填充、无 topline、无 divider、无 header 分隔。

### 颜色

语言身份**只由 icon 承载**。线与文字全部中性。

1. 有 icon → 用 SimpleIcons 原品牌色 icon。
2. 无 icon 但有语言色 → 5px 语言色圆点。
3. 都没有 → 5px `--color-neutral-5` 圆点。

这样品牌 raw hex 的着色面积压到 14px 见方，符合 design-system「accent ≤ 5% 表面」的约束；线不再携带品牌色。

### 深色模式

neutral 阶自动反转，无需额外规则。icon 保持原品牌色不做压暗（面积已足够小）。

## 架构

### 归属

`@yohaku/rich-content` 拥有**全部**块壳与样式：

```
packages/rich-content/src/lexical/portable/
  code-block.tsx        ← 复活，成为唯一实现（PortableCodeBlock → CodeBlock）
  code-snippet.tsx      ← 新增，接管 @haklex 的 CodeSnippetRenderer
  code-shell.tsx        ← 新增，两者共用的壳（线 / 头行 / 尾行 / 折叠）
  code-language.ts      ← 新增，语言 → { label, icon, color } 单一映射表
  code-collapse.ts      ← 保留
  tween-height.ts       ← 保留
packages/rich-content/src/styles/
  yohaku-block-styles.css  ← `.yohaku-code-*` 重写为新形态
```

host 只注入三样东西，别的不注入：

- `slots.CodeBlock` — 仅用于 host 接管**特殊语言**：web 注册的 slot 只把 `mermaid` / `excalidraw` / `component` 分派给各自组件，其余语言原样委托回共享包的 `CodeBlock`，不再自建外壳。
- `host.labels.codeCopy / codeCopied / codeExpand` — 沿用已有的 `labels` 机制（`nestedDoc*` 是先例），共享包不引入任何 i18n 依赖。
- `host.theme` — 已有。

### web

- `ShikiWrapper.tsx` + `Shiki.css` 删除，`CodeBlockRender` 保留但只做**语言分派**（mermaid / excalidraw / component 走各自组件，其余交给共享包的 `CodeBlock`）。`Markdown.tsx` 与 `LexicalContent.tsx` 共用这一个入口，两条正文路径自动同步。
- `code-highlighter/constants.tsx` 的 icon / color 映射移入 `code-language.ts`；`language-icons.tsx`（SimpleIcons 组件）移入共享包。
- 高亮器统一到 Shiki。注意现状不是「Shiki 不支持的语言退回 Prism」：`CodeBlockRender` 里 `shikiNotSupports` 是空数组，且命中它的语言才走 Shiki，所以 web 上**所有**代码块都走 Prism，Shiki 分支不可达（`code-highlighter/index.ts` 的 `export * from './Shiki'` 已被注释，佐证该路径早已退役）。本次是把这条死路接回共享包的 curated catalog（48 语言 / 2 主题），与 mobile 同一套 theme，然后删除 `PrismHighLighter`、`HighLighterPrismCdn`、`ShikiFallback` 与 Prism CDN 的 `loadScript`。

### mobile

- `dom/code-block.tsx`、`dom/code-block.css`、`dom/code-block-chrome.ts`、`dom/code-block-chrome.test.ts` 删除，改为直接使用共享包的 `CodeBlock`。
- icon 成本：`language-icons.tsx` 是本地手写的内联 SVG 组件（约 16KB，十余个），不是 npm barrel，没有拉全量的问题。映射表会引用其中全部，mobile 因此固定增加这 16KB。

### code-snippet

上游 `CodeSnippetRenderer` 的 DOM 没有「尾行」这个位置（`rcs-header` 里塞了 tabs + titleBar + headerActions），纯 CSS 覆盖做不到把 copy 下沉并重复当前文件名。因此：

- 在 `create-renderer.tsx` 新增 `lexicalCodeSnippetModule`，用自己的 `CodeSnippetRenderer` 覆盖上游（与既有 `lexicalCodeBlockModule` 同构）。
- `module-imports.ts` 停止 `import '@haklex/rich-compose/style/code-snippet.css'`（与 code-block / link-card / poll / quote / table 的处理一致）。
- 序列化格式不动：`type: 'code-snippet'`、`files: { filename, code, language }[]`，admin 侧无需改动。

## 交互

- **copy**：纯文字「复制」，点击后翻成「已复制」，1.5s 后翻回。用 `slot-text/react` 翻牌（Yohaku 标志动效），不用图标。
- **复制范围**：多文件时复制**当前 tab** 的代码。
- **折叠**：阈值沿用 `CODE_COLLAPSE_LINE_THRESHOLD = 20` 行；渐隐 mask 从 60% 起；「展开 · N 行」的 N = 总行数。展开后该项消失，尾行退回原结构；折叠状态**不再切回**（沿用现有 `expandedFor` 语义）。
- **展开动画**：沿用 `useExpandHeight`。动效参数走 mobile 既有的近临界阻尼约定，不新增 spring 参数。
- **tab 切换**：只换代码区，线与头行不动；tabs 行溢出时自身横向滚动，滚动条隐藏。
- **横向滚动**：代码区独立 `overflow-x: auto`，`-webkit-overflow-scrolling: touch`，块本身不产生横向滚动。

## i18n

新增三条文案 × 五个 locale（`en / ja / ko / zh / zh-TW`）：`code.copy`、`code.copied`、`code.expand`（带 `{count}` 占位）。`messages/message-usage.test.ts` 会强制五个 locale 齐全。mobile 侧在 `apps/mobile/src/i18n/messages/` 补同样三条，经 `rich-body.tsx` 的 `labels` 透传进 WebView。

## 测试

- `code-language.test.ts`：label / icon / color 解析，含 alias（`objc`、`c++`、`zsh`）与三级 fallback。
- `code-collapse.test.ts`：已有，保留。
- `create-renderer.test.tsx`：断言 code-snippet 走本地 renderer 而非上游。
- `messages/message-usage.test.ts`：五 locale 齐全（自动覆盖）。
- 视觉验证：`app/dev-demos/lexical` 的 `node-cases.ts` 已有 `code-block` / `code-snippet` fixture，补一条超过 20 行的长代码 fixture 覆盖折叠态。

## 不做

- 不改 Lexical 节点的序列化格式与 `type` 字符串。
- 不改 admin 侧编辑器。
- 不做行号、不做 diff 高亮、不做代码折叠区域（fold region）、不做语言切换器。
- 不改 markdown 路径以外的其他块（quote / table / callout 的视觉不在本次范围）。

## 风险

| 风险 | 处理 |
|---|---|
| web 从 Prism 切 Shiki 影响首屏 / SSR | 共享包的 `useShikiHtml` 是客户端 effect，SSR 输出纯 `<pre>`；需实测首屏 CLS 与 bundle 变化，不达标则保留 SSR 阶段的静态 `<pre>` 骨架 |
| 无卡片后代码与正文边界变弱 | 靠 20px 上下外边距与 mono 字体区分；dev-demos 长文 fixture 实际阅读验证 |
| 上游 haklex 升级改动 code-snippet | 已完全接管 renderer，只依赖序列化格式，不依赖上游 DOM |
