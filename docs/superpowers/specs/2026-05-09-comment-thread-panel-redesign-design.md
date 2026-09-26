# Comment Thread Panel 重设计

**Date:** 2026-05-09
**Scope:** `apps/web/src/components/modules/comment/` 中 `CommentBlockThread` 与相关 panel / animation / cross-highlight；连带 `CommentAnchorHighlight` 之 hover-fill 迁至 CSS Custom Highlight API
**Status:** spec, not implemented

## 1. 背景与目标

当前 block-gutter 触发的 thread panel（[CommentBlockThread.tsx](apps/web/src/components/modules/comment/CommentBlockThread.tsx)）以 `parentCommentId` 单棵森林为骨架，按 createdAt 排序、最深 4 层缩进，左侧细竖线为分支记。其问题：

- **多引混杂**：一 block 内可同时承载多条 range 评（不同 quote 文本）与 block 级评。现状统一展平为一棵 forest，引文 (`anchor.quote`) 仅作为某 root 之首行 italic muted 文，缺乏视觉聚合，多引文时阅读节奏散乱。
- **缩进噪音**：4 层缩进 + 左竖线在深 thread 下产生横向挤压与视觉碎裂，读者负担重。
- **气韵杂**：`px-3 py-2` 紧凑 + 多 border-line 与 yohaku 项目"以余白分章"的整体语言不合。
- **hover fill bug**：`CommentAnchorHighlight` 之 `.comment-anchor-fill` 用 `position: fixed` overlay，page 滚动时背景滞留（无 scroll listener 重算 rect）。

本次重做的核心方向：**章引为序，扁平为体**——quote 不再是 root 行内属性，而升为 section divider；reply 取消缩进、以 mingcute chevron + 名展示对话之向；popover 容器以 240ms scale + X 自 gutter trigger 起一气呵成；hover fill 弃 overlay、改 CSS Custom Highlight API 之 `background-color`，由 browser 原生绘、随 scroll 自适。

## 2. Non-goals

- 不动 gutter trigger（印章 avatar、count badge、connector、overflow stack、`comment-seal-pulse`）
- 不动 page bottom 的全评列表 `Comments.tsx`
- 不动 `CommentBox` rich editor 内核 / submit 路径 / mutation
- 不动 anchor 解析 (`anchor-resolve.ts` / `anchor-utils.ts`)
- 不动 socket.io 实时通道 / TanStack Query 失效策略
- 不引入新 thread 状态库 / 新 anchor 类型
- 不为长 thread 加 collapse / 折叠（max-height + 内滚足矣）
- 不写组件级单元测试或视觉回归测试（仅保留 `thread.test.ts` 之 grouping 单测）

## 3. Architecture

涉文件（~3 改 + 1 新增 util + 1 css 重构）：

| 文件 | 改动 |
| --- | --- |
| `comment/CommentBlockThread.tsx` | 重写：弃 `buildThreadForest`，以 `groupCommentsByQuote` 分章；新 `<ThreadSection>` / `<ThreadComment>` 子件；compose chip 多态 |
| `comment/CommentBlockGutter.tsx` | panel 容器 enter/exit 动画（C 式 scale + X）；transform-origin 随 floating-ui placement |
| `comment/CommentAnchorHighlight.tsx` | 弃 `<RootPortal>` + `<m.span>` overlay + `hovered.rects` state + scroll 监听需要；改 `CSS.highlights.set('comment-highlight-hover', ...)` |
| `comment/Comment.css` | 弃 `.comment-anchor-fill` 一族；新增 `::highlight(comment-highlight-hover)` 之 background-color；新增 `.thread-*` 一族 |
| `comment/CommentProvider.tsx` | 暴 `setHoveredAnchor(anchor | null)` imperative API（panel ↔ article 双向亮共用） |
| `comment/thread.ts` | 加 `groupCommentsByQuote` 工具 |

依赖：复用项目既有 `motion` (lazy) / `floating-ui` / `mingcute icons` (Tailwind CSS Icons) / `var(--font-serif)` / 项目 neutral / accent token。无新 npm 依赖。

## 4. Section 模型

### 4.1 数据形

`thread.ts` 加新工具：

```ts
type ThreadSection =
  | {
      kind: 'quote'
      quoteText: string
      anchor: CommentAnchor       // mode: 'range'，含 blockId/start/endOffset/quote/lang
      comments: CommentWithAnchor[] // root + replies，时序 asc
    }
  | {
      kind: 'block'
      comments: CommentWithAnchor[]
    }

interface ThreadGrouping {
  sections: ThreadSection[]
  counts: { total: number; quotes: number; blockwise: number }
}

function groupCommentsByQuote(
  comments: CommentWithAnchor[],
  blockInfos: BlockInfo[],
): ThreadGrouping
```

### 4.2 聚合规则

1. 遍历 root comments（`!parentCommentId`）：
   - `anchor.mode === 'range'` 且 `langMatches` → 按 `anchor.quote` key 入 quote section（同句 quote 之 root 聚合一处）
   - 否则（`mode: 'block'`，或 lang 不匹配 fallback）→ 入 block section
2. reply（有 `parentCommentId`）随其 root 入同章；reply-of-reply 同入
3. 章内 comments 顺时序 asc；reply 紧随其 root（保留对话 locality）

### 4.3 章序

- quote 章按其 anchor 在文中位置排序（用 `resolveRangeAnchor` 之 `blockIndex` + `startOffset`）
- block 章末（永置最后）
- 退化态：仅 1 quote / 仅 0+ block 时，无须 divider 视觉之累

### 4.4 自动滚至

panel 由 range click 开启时（如自 `CommentAnchorPopover` 转入），将该 quote 章 `scrollIntoView({ block: 'start', behavior: 'smooth' })`。其余章仍在下，可滚阅。block click 开启则不自滚。

## 5. Comment row & 视觉

### 5.1 字相

| 元件 | 字号 | weight | 颜色 |
| --- | --- | --- | --- |
| name | 12.5px | 500 | `var(--text)` |
| arrow `i-mingcute-right-line` | 10px | — | `text-muted-foreground`，左右 -2px margin 紧贴名 |
| to-name | 11px | 500 | `color-mix(in srgb, var(--accent) 75%, var(--text-tertiary))` |
| time | 10.5px | — | `var(--text-tertiary)`；`font-feature-settings: 'tnum' 1` |
| text | 13.5px | — | line-height 1.75；padding-left 26px（与 name 起齐，让 avatar 之地） |

行 padding: `8px 20px 10px 34px`；内 gap: 4px。

### 5.2 Avatar

- 18px 圆，`linear-gradient(135deg, accent, accent×50% on surface-3)`
- base shadow: `inset 0 0 0 1.5px var(--surface-1)`
- OP（站主自评）：加外环 `0 0 0 1.5px color-mix(in srgb, var(--accent) 70%, transparent)`
- 新评（< 24h）：复用 `comment-seal-pulse` 思路，halo 力度减半（外 14% / 6%），适 18px 尺，置 `Comment.css` 内新 keyframe `comment-row-avatar-pulse`

### 5.3 Reply 标记

- root（无 parent）：仅 name + time
- reply 之 parent 在同章 → name + arrow + to-name + time
- reply 之 parent 不在 panel 视野（极少；如 parent 已删 / 数据缺）→ 退化为 name + time（无 arrow）

### 5.4 hover

- avatar：scale 1→1.04 / 220ms（袭 gutter）
- 整行 bg：**无**；唯 cursor: pointer 示可点回（点行 → compose chip 切为"回应 X"）

## 6. 章首与 Compose

### 6.1 quote 章首

```
[2px accent bar]  [serif italic 14.5px var(--font-serif) quote text]
padding: 6px 20px 10px 20px (相对位)
bar: position absolute, left 20px, top 8px, bottom 8px, width 2px
quote-text: padding-left 14px (避 bar)
```

### 6.2 block 章首

```
对此段     ←— 10px uppercase letter-spacing .14em，accent 60% on muted
─────  ─────  双虚线轴左右扁延，1px border 40% transparent
padding: 6px 20px 8px
```

### 6.3 panel header

```
此段 · {total} 言        {quotes} 引 · {blockwise} 段
左 ↑ 10.5px uppercase muted    右 ↑ 10.5px tabular-nums muted
border-bottom: 1px var(--border)/25%
```

文案随 mode 易：range 开则左 "此句 · N 言"；block 开则 "此段 · N 言"。`{quotes}` / `{blockwise}` 任一为 0 则隐其端（如仅 quote 则只显 "2 引"）。

### 6.4 Compose chip 多态

| 触发 | chip | dismissible | post anchor |
| --- | --- | --- | --- |
| block mode 开，未点行 | "回应此段"（无 quote pill） | 否 | `mode: 'block'` |
| range mode 开，未点行 | "引此句" + serif italic ellipsis pill | 是（`i-mingcute-close-line`） | range（沿用所点 anchor） |
| 点章内某 comment 行 | "回应 {name}" | 是 | parent's anchor + `parentCommentId = clicked.id` |
| × 关 chip | 退至 panel 默认态 | — | 同默认 |

`pill` 之色：`accent 12%` bg / `accent 70% on text` fg。serif 引文 pill 加 `font-family: var(--font-serif)`、italic、`max-width: 240px` ellipsis。

### 6.5 CommentBoxRoot 新 props

```ts
interface CommentBoxRootProps {
  // 现有：refId / anchor / afterSubmit / className / compact
  parentCommentId?: string         // 新增：reply 用
  onCancelReply?: () => void       // 新增：× 关 chip 时回调
}
```

`afterSubmit` 行为变更：现状 invalidate query 后调 `onClose?.()` 关 panel；**新案不闭**——让用户连发；闭由用户主动按外部 / Esc 触发。

### 6.6 焦点策略

- panel 开 → 50ms focus contenteditable（袭旧）
- 点行选回应 → 不夺焦点；chip 视觉切换即可
- × 关 chip → 焦点维持
- Esc：若 chip 现 → 先关 chip；再 Esc 才关 panel（keyboard handler 分层）

## 7. Popover 容器动画

仅整体 enter/exit；panel 内不作 stagger / per-row 入场。

### 7.1 Enter

```css
@keyframes panel-enter {
  from { opacity: 0; transform: translateX(-8px) scale(0.94); }
  to   { opacity: 1; transform: translateX(0)    scale(1);    }
}
animation: panel-enter 240ms cubic-bezier(0.2, 0.7, 0.2, 1) both;
```

### 7.2 Exit

```css
@keyframes panel-exit {
  from { opacity: 1; transform: translateX(0)    scale(1);    }
  to   { opacity: 0; transform: translateX(-4px) scale(0.97); }
}
animation: panel-exit 160ms cubic-bezier(0.4, 0, 1, 1) both;
```

入慢出快；scale 出态较入态保守。

### 7.3 transform-origin

依 floating-ui placement：
- `right-start` (outset)：`top left`
- `left-start` (inset)：`top right`

```tsx
const placement = ... // 由 useFloating 返
const origin = placement.startsWith('right') ? 'top left' : 'top right'
```

### 7.4 双层 wrapper

floating-ui 之 `floatingStyles` 任 panel 外层定位（fixed + transform），enter/exit 动画属内层包裹之 transform，互不犯：

```tsx
<RootPortal>
  <div ref={floatingElementsRef.setFloating} style={floatingStyles}>
    <m.div
      initial={{ opacity: 0, x: -8, scale: 0.94 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -4, scale: 0.97 }}
      transition={{ duration: 0.24, ease: [0.2, 0.7, 0.2, 1] }}
      style={{ transformOrigin: origin }}
      className="overflow-hidden rounded-xl border bg-neutral-1 shadow-lg"
    >
      <CommentBlockThread ... />
    </m.div>
  </div>
</RootPortal>
```

`AnimatePresence` 于外层包 `activePanel && ...` 以接 exit。

### 7.5 切 block 不闭

用户已开 panel，点他 block 时 floating-ui 改 reference。**不重 enter**：仅 layout 平移即可。实现：`AnimatePresence mode="popLayout"` 或不依赖 key 重渲，由 floating-ui 之 autoUpdate 直接平移外层（内层 `m.div` 无 key 变即不重 mount）。

### 7.6 Reduce-motion

```css
@media (prefers-reduced-motion: reduce) {
  panel: opacity 0→1 / 140ms ease only; no transform.
}
```

## 8. Cross-highlight (panel ↔ article)

### 8.1 共用机制

`CommentProvider` 暴一 imperative API：

```ts
interface CommentContextValue {
  // 现有...
  hoveredAnchor: CommentAnchor | null
  setHoveredAnchor: (a: CommentAnchor | null) => void
}
```

- `CommentAnchorHighlight` 内 mousemove 命中 dashed range 时 → `setHoveredAnchor(anchor)`；mouseleave / 未命中 → `setHoveredAnchor(null)`
- `<ThreadSection kind="quote">` mouseenter quote 区 → `setHoveredAnchor(section.anchor)`；mouseleave → `setHoveredAnchor(null)`

二者皆 subscribe `hoveredAnchor`，依其值绘自身亮态。

### 8.2 文章端反应（panel → article）

`CommentAnchorHighlight` 内 effect：

```ts
useEffect(() => {
  if (!hoveredAnchor || hoveredAnchor.mode !== 'range') {
    CSS.highlights.delete('comment-highlight-hover')
    return
  }
  const resolved = resolveRangeAnchor(hoveredAnchor, blockInfos)
  if (resolved.status === 'block-fallback') return
  const range = createDomRange(...)
  if (!range) return
  CSS.highlights.set('comment-highlight-hover', new Highlight(range))
  return () => CSS.highlights.delete('comment-highlight-hover')
}, [hoveredAnchor, blockInfos, contentEl])
```

无 scroll listener、无 rect 计算——browser 原生绘随 scroll。

### 8.3 panel 端反应（article → panel）

quote section 之 `data-anchor-key` (= `quote + blockId` hash) 与 `hoveredAnchor` 比对：

```css
.thread-section[data-active="true"] .thread-quote-bar {
  background: var(--accent);
  width: 3px;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
}
.thread-quote-bar {
  transition: background 200ms cubic-bezier(0.2, 0.7, 0.2, 1),
              width 200ms cubic-bezier(0.2, 0.7, 0.2, 1),
              box-shadow 200ms cubic-bezier(0.2, 0.7, 0.2, 1);
}
```

panel 未开时 panel 端无反应（`thread-section` 不存在）；panel 开则 bar 反亮。不强滚至该章（避刺目）。

## 9. CSS Custom Highlight API 迁移

独立 fix：弃 `<m.span>` overlay，全用 Highlight API。先 land 此 commit（修 scroll bug），新 panel 之事承之而进。

### 9.1 Comment.css 改

弃：

```css
.comment-anchor-fill { position: fixed; ... }
:where(.dark, [data-theme='dark']) .comment-anchor-fill { ... }
```

新：

```css
::highlight(comment-highlight-hover) {
  background-color: color-mix(in srgb, var(--color-accent) 14%, transparent);
}
:where(.dark, [data-theme='dark']) ::highlight(comment-highlight-hover) {
  background-color: color-mix(in srgb, var(--color-accent) 22%, transparent);
}
```

### 9.2 CommentAnchorHighlight.tsx 改

弃：
- `useState<FillRect[]>` 一族
- `<RootPortal>` + `<AnimatePresence>` + `<m.span>` 渲 fill 之段
- `motion/react` 之 fill 部分 import

留：
- mousemove handler / hitTest / popover 触发逻辑
- `ensureHighlightStyle` 增第二 rule

加：
- `hoverHighlightRef = useRef<Highlight | null>(null)`
- mousemove 内：命中时 set/clear `comment-highlight-hover`，未中时 delete
- effect cleanup 内 `CSS.highlights.delete('comment-highlight-hover')`

### 9.3 与 §8 之联

§8 之 imperative API (`setHoveredAnchor`) 在 article 端命中 range 时调，触发 §9 之 Highlight set。本质同一机制——一处入，一处出，互不重。

### 9.4 兼容性

CSS Custom Highlight API + `background-color` 支持：
- Chrome 105+ (2022-08)
- Safari 17.2+ (2023-12)
- Firefox 140+ (2025)

今 2026-05，evergreen 皆支持。无 fallback 之需。

### 9.5 接受之失

- 无 transition / scaleY 缓入：即点即绘（用户已许）
- 无 border-radius：方块 fill；与 yohaku 素直之气合
- 多行 range：browser 自处理，per-line 矩形

## 10. Mobile

- 仍用 `PresentSheet` 自底升
- 内容**复用**新 `CommentBlockThread` 组件——同 section + chip + compose box，唯外壳不同
- popover 容器动画（C 式）仅 desktop；sheet 自有动画，不替
- mobile 不接 cross-highlight（无 hover 概念；点 dashed 直开 sheet）——现状如此，不动

## 11. Accessibility

- panel 之 floating element 加 `role="dialog"` + `aria-label="此段评论" / "此句评论"`（依 mode）
- Esc 关 panel（袭旧），但若 chip 现则 Esc 先关 chip
- chip × 按钮：`aria-label="取消回应"` + `i-mingcute-close-line`，可 Tab 聚焦
- `prefers-reduced-motion: reduce`：popover 容器退为 opacity-only / 140ms；hover 反亮（quote-bar transition）退为 instant；highlight API 本无动画
- panel 开 → 50ms focus contenteditable

## 12. 实时

- socket `fn#shiro#update` 触发 `['comments', refId, 'anchors']` 失效，TanStack Query 重取
- 新 panel 由 query 驱动，不维护本地 list state；新评至自然进列
- 行无 enter 动画；新评仅 avatar pulse < 24h 之记
- 用户编辑期列变不夺焦点（contenteditable 自维 caret）

## 13. 长 thread

- panel `max-height: min(70vh, 600px)`，超则内滚（沿用现状 `ScrollArea`）
- 单章无折叠 / 截断；章内 50 评亦展开，凭外滚阅
- 简策；日后嫌长再加章内"展开/收起"

## 14. 部署 & 回滚

- 单 PR 即可，无后端 / api-client 改动
- 建议拆 2 commit：
  1. **highlight-api migration**（§9）：独立修 scroll bug，可单独 land、单独回滚
  2. **thread panel redesign**（§4–§8、§10–§13）：依赖 §9 之 `setHoveredAnchor`
- 无 schema migration、无 storage 改、无 i18n 文案大改（仅"此段/此句/N 言/M 引/K 段/对此段/回应/引此句"等微增）

## 15. Open questions（待 review 时定）

- 章序：quote 章按文中位置排 → block 章末。是否需可配按时混排？拟定为否。
- chip dismissible 之统一：所有 chip 是否皆有 ×（包括 "回应此段"）？拟定为：仅 reply / range-quote chip 有 ×；"回应此段" 为 panel 默认态，无须 dismiss。
- avatar OP 之判定：现有 owner / hostUrl 之记？沿用既有判断函数；若无则不显 OP 环。
- 长章 50+ 评之 UX：先简策内滚；若 user research 反馈则迭代。
- mobile 是否亦接 cross-highlight：暂否，避 sheet 频开扰阅。
