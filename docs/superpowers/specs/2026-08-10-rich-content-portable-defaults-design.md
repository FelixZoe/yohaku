# rich-content 可移植默认实现（portable defaults）

2026-08-10 · 状态：已批准

## 背景

`@yohaku/rich-content` 的 `HostCapabilities.slots` 当前语义是"宿主注入，否则简陋 fallback"。web 注入了 5 个 slot（InlineLink / BlockLinkCard / CodeBlock / StockKLine / MapBlock），mobile 的 `createWebviewHost` 一个都没注入，导致 mobile 端 lexical 正文与 web 存在系统性视觉漂移：inline link 无 favicon、裸 URL 无卡片、代码块无高亮、股票块永远骨架屏、地图块简陋 fallback、note 无 serif、heading 锚点 `#` 常驻（web 是 hover 才显示）。

## 原则

slots 语义改为：**包内提供两端一致的默认实现（基线），slot 仅用于宿主增强（覆盖）**。

- web 现有 5 个 slot 全部保留，行为不变（hover 弹卡、SSR 预注水、ReactComponentRender 等增强仍为 web 独有）。
- mobile 继续不写任何 slot，自动获得包默认。
- 新增默认实现放 `packages/rich-content/src/lexical/portable/`，约束不变：零 `next/*` / `expo-*` / `react-native*` 依赖；重资源一律 `import()` 异步加载；块级渲染继续被 `BlockBoundary` 包裹。

## 各块设计

### 1. heading 锚点

删除 `apps/mobile/src/components/dom/rich-body.tsx` 中 `@media (hover: none) { .rich-heading-anchor { opacity: 1 } }` 覆盖。对齐 web 移动端行为：触屏不显示锚点。包内 heading override 不动。

### 2. inline link（favicon）

- 新增包默认 InlineLink 渲染：`@haklex/rich-editor` 的 `LinkFavicon`（favicon 探测 + Globe/Mail 兜底）+ 现有 `linkClassName` 样式。
- **品牌图标下沉**：web `apps/web/src/components/ui/rich-link/favicon-config.tsx` 的平台判定 + 品牌 SVG（GitHub/Twitter/Telegram/Bilibili/Zhihu/Wikipedia/TMDB/Moz/Npm/Figma/XHS）迁入包（`portable/platform-icons.tsx`），web 侧 favicon-config 改为从包 re-export，避免双份。平台 URL 判定函数（`~/lib/link-parser` 中被引用的部分）随迁或在包内复制最小子集——以不让包依赖 web 为准。
- `link-overrides.tsx` 的 `InlineLinkRenderer`：无 `slots.InlineLink` 时渲染包默认（原来是裸 `<a>`）。

### 3. link card（裸 URL 段落 / link-card 节点）

- **实现中修订**：web 的 link card 从不在客户端 fetch——mx-core 在文章响应顶层 `meta.enrichments`（URL → entry map）里服务端注水，web 经 `EnrichmentMapProvider` 读取。`/enrichment/resolve` 仅服务于 web 桌面 hover 弹卡，且被 `EnrichmentOriginGuard` 拦 WebView origin。因此 mobile 不调接口、不改 guard，改为透传同一份 map：
  - mobile api 层 `requestDetail` 保留 envelope `meta.enrichments`（**URL key 必须跳过 camelize**，只 camelize entry 值），随 body 持久化进 SQLite（posts/notes 新增 `enrichments` JSON 列，迁移 `0001_dry_trauma.sql`）。
  - `HostCapabilities` 新增可选 `enrichments?: Record<string, HostEnrichment>`；rich-body 经 prop 注入。
- 包默认 `PortableLinkCard`：从 `host.enrichments[url]` 命中则渲染 favicon + 标题 + 描述 + 缩略图静态卡；未命中降级普通链接（与 web 无 provider 数据时的语义一致）。
- `LinkCardOverride` 与 `BlockLinkCardRenderer` 无 slot 时走该默认。

### 4. code block（Shiki）

- 新增包默认 CodeBlock：`import('shiki/bundle/full')` 异步高亮（与 rich-ext-embed 的 GithubFileEmbed 同款依赖，chunk 复用），主题随 `host.theme`（github-light / github-dark 或与 web 现用主题对齐，实现时以 web `ShikiHighLighterWrapper` 的主题为准）；含复制按钮，`navigator.clipboard` 不可用（WKWebView 非 secure context）时降级 `document.execCommand('copy')`。
- 高亮完成前 / shiki 加载失败 → 现状 `rich-code-block` 无高亮 `<pre>`。
- 不含 web 的 ReactComponentRender 活预览与 Prism 路径。

### 5. stock K 线

- K 线内脏（`StockFrame` / `StockStatGrid` / `Range52W` / EMA 常量等）已在包内（`biz/stock/shared.tsx`），将 web `YohakuKLineCard` 的组装层下沉进包。
- web 独有依赖的替换：`useLocale`（next-intl）→ `HostCapabilities` 新增可选 `locale?: string`（web 传 next-intl 值，mobile 传应用 locale）；`useIsDark` → `host.theme`。`slot-text/react` 为可移植依赖，随迁。
- `StockBlock` 无 `slots.StockKLine` 时渲染包默认（原来永远骨架屏）；数据经 `fetchJSON + apiBase`。
- web 的 `StockKLineRenderer` slot 保留（可改为薄包装包默认，实现时择优）。

### 6. map（本轮做占位，真地图后续讨论）

- v1 默认：静态占位卡片——标题 + POI 列表 + 点击 `openLink` 跳 web 对应页（用 `webOrigin` 拼 URL）。不加载 maplibre。
- 已评估并**推迟**的完整方案（后续单独讨论）：点击激活 maplibre（openfreemap 瓦片，无鉴权）+ rich-body postMessage 桥 `yohaku:scroll-lock` 锁原生 ScrollView + IntersectionObserver 门控 GL context。备选：离屏渲染静态快照（参考 web `MapExportDialog`）；原生地图 overlay（工程量大，不推荐）。

### 7. 字体 / 主题变量

- web `LexicalContent.tsx` 的 `fallbackSansFont / fallbackSerifFont / fallbackMonoFont` 常量与 `createThemeStyle` 调用参数下沉为包导出；web 改为 import 包常量（视觉零变化）。
- `rich-body.tsx` 改用同一 `createThemeStyle`（accent / link / accentLight / quoteBorder）+ 同一字体链，替换现有手写 `--rc-*` 变量；note variant 拿到 serif 字体链（iOS 系统字体栈可命中 Songti SC / Hiragino Mincho）。mobile 的 accent 取值仍来自 `@yohaku/design-system/tokens`。

## Host 契约变更

- `HostCapabilities` 新增可选 `locale?: string`（stock 数字/日期格式化用）。web 传 next-intl 当前值，mobile 传应用 locale；缺省 `undefined` 时 `Intl` 走运行时默认。
- 其余契约（fetchJSON 相对路径 + `HostFetchError`、openLink、theme、webOrigin）不变。

## 数据流与错误处理

- favicon 探测：纯 `<img>` onload，直连目标站点（haklex 现有实现，含内存缓存）。
- enrichment / 股票数据：`host.fetchJSON` 相对路径，apiBase 由实现前缀；`HostFetchError.status` 分支 404 / 瞬态。
- 所有 `import()` 失败、接口失败、数据缺失均降级到当前 fallback 形态——只会更好，不会更差。

## 不做的事（YAGNI）

- hover 弹卡（floating-ui enrichment popover）：web 桌面独有，web 移动视口本来就不启用。
- 划线 ink / selection ink、nested-doc modal：web 独有交互。
- 真地图交互（见 §6，推迟）。

## 验证

1. 包内 vitest（沿用 `create-renderer.test.tsx` 模式）：默认 InlineLink 渲染 favicon 元素；默认 CodeBlock 异步出高亮 DOM（mock shiki）；默认 link card 命中/失败两分支（mock fetchJSON）；stock 默认在 mock 数据下渲染出 K 线 DOM；map 占位卡渲染 POI；**slot 覆盖优先级不变**（提供 slot 时默认不渲染）。
2. `pnpm --filter @yohaku/rich-content check`：rich.css 产物同步（新增 tailwind 类进 dist）。
3. web 回归：现有 vitest 全绿；肉眼确认 web 文章页视觉零变化（slot 仍覆盖默认）。
4. mobile 模拟器实拍同一篇文章，逐项核对 §1-§7 与 web 截图。
