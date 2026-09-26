# Peek Modal 重做：定高框、入场动效、PDF 阅读器

日期：2026-08-25
范围：`apps/web/src/components/modules/peek/`、`apps/web/src/components/ui/rich-content/pdf/`，外加 modal stack 的一处容器约定

## 背景

Peek 是桌面端的就地预览层。现有三类内容走它：note 预览、post 预览，以及新加的 PDF 预览。当前实现的问题：

1. **入场没有来源感。** note/post 用的是通用 modal 动效（`opacity 0.5→1, y 50→0`，`microReboundPreset`），和被点击的元素没有任何空间关系；PDF 直接复用同一套。
2. **定高框缺位。** note/post 的滚动发生在外层 `Dialog.Popup`（`fixed inset-0 overflow-auto`），纸没有确定的视口内矩形，任何依赖几何的动效无从下手。PDF 自己声明了 `h-[80vh]`，三处各写各的。
3. **PDF 阅读器没有身份。** 顶栏是三段式工具条，每页一张 `rounded-lg ring-1` 卡片，页码是死文字，20 页以上无法导航。换个 favicon 就是任何一个 pdf.js viewer。
4. **回弹取向不合适。** `microReboundPreset`（stiffness 300 / damping 20）过冲明显，用在大面积纸上像橡皮。

## 触发点清单

| 位置 | 来源形状 |
|---|---|
| `app/[locale]/thinking/item.tsx:186` | 行内文字 |
| `components/ui/list/TimelineListItem.tsx:32` | 行内文字 |
| `components/modules/timeline/TimelineItem.tsx:25` | 行内文字 |
| `app/[locale]/posts/(post-detail)/[category]/[slug]/pageExtra.tsx:271` | 行内文字 |
| `components/layout/footer/GatewayInfo.tsx:205` | 行内文字 |
| `YohakuFileCard` — 首页 canvas 区、「查看更多」按钮 | **卡片（首页缩略）** |
| `YohakuFileCard` — inline 链接、文件名、「打开」 | 行内文字 |
| `socket/handlers/note.ts:23`、`socket/handlers/post.ts:21` | **无来源** |

三种来源形状，各配一种入场机制。

## 决策

| 项 | 决定 |
|---|---|
| 定高框 | **`PeekModal` 统一提供**：定高、`overflow: hidden`、内部滚动。PDF 去掉自己的 `h-[80vh] rounded-xl ring-1 bg-paper` |
| 尺寸档 | `PeekModal` 加 `size?: 'default' \| 'max'`。default = `max-w-[62rem]` + 上下 `10vh`；max = `w-[90vw] h-[90vh]`，PDF 用 max |
| 行内文字来源 | **transform FLIP**，不做反向补偿 |
| 卡片来源（PDF） | **页 FLIP**：第 1 页作为 shared element 等比放大，外框 clip 裁开，chrome 错峰入场 |
| 无来源 | **clip-path 揭开**：视口中心 `240×2` 短缝，先竖后横 |
| PDF 布局 | **胶片轨**（左侧 84px 缩略图轨，常驻 0.45 透明度，hover 阅读区升起） |
| 遮罩 | 保持现状（黑 12% / 暗色 45% 平涂） |
| 曲线 | 入场 `cubic-bezier(.22,1,.36,1)`（= modal stack 现有的 `MODAL_EASING`）；出场 `cubic-bezier(.4,0,1,1)` |
| 时长 | 入场 800ms，出场 220ms |

### 被否决的方向

- **卡片几何 FLIP + 行内降级** — 提出时以为触发点全是文字；PDF 出现后卡片分支不再是死代码，但两者需要**不同**的机制，不是一套加降级。
- **暖灰洇开遮罩（径向浓淡 + 噪点）** — 原型对比后维持平涂。
- **纸容器改版（accent 刷边 / 页眉 / 底部淡出）** — note/post 的纸视觉一律不动。
- **transform + 内层反向补偿** — 补偿的 `transform-origin` 固定左上角，正文会从左上角漂移进场，与纸的居中对齐错开。代价大于它消除的形变。
- **PDF「纸叠」布局**（页间 1px 暗缝、右下角磨砂 folio、顶栏滚动让路） — 观感更有身份，但完全不给导航，40 页时无法使用。
- **PDF 整框 FLIP** — 轨道和顶栏会被一起压扁。

## 动效规格

三种入场共用：出场、遮罩、阴影层、reduced-motion 处理。

### 甲 · 行内文字来源（note / post / PDF 的文字入口）

设 `box` 为框的最终矩形，`origin` 为 `getClientRects()[0]`。

```
sx = origin.width  / box.width
sy = origin.height / box.height
tx = origin.left - box.left
ty = origin.top  - box.top
transform-origin: 0 0
```

| 层 | 关键帧 | 时长 / 曲线 |
|---|---|---|
| 框 | `translate(tx,ty) scale(sx,sy)` + `border-radius: origin.height/2/sy` → `none` + `4px` | 800ms / `MODAL_EASING` |
| 内容 | `opacity` 0（保持到 5%）→ 1 | 920ms / `cubic-bezier(.4,0,.2,1)` |

内容不做反向补偿，头 ~300ms 处于横向拉伸态，这是选定的观感。

### 乙 · 卡片来源（PDF 首页卡片）

**核心：等比 scale，不是双轴。** 卡片里是第 1 页，viewer 里也是第 1 页，宽高比相同：

```
s  = origin.width / page1.width        // 单一比例，纵横同值
tx = origin.left  - page1.left
ty = origin.top   - page1.top
hiddenBelow = max(0, page1.height - origin.height / s)   // 卡片 max-h 裁掉的部分
```

| 时段 | 层 | 变化 |
|---|---|---|
| 0 → 100% | **第 1 页** | `translate(tx,ty) scale(s)` → `none`；`clip-path: inset(0 0 hiddenBelow 0)` → `inset(0)` |
| 0 → 78% | **外框** | `clip-path` 从 `origin` 矩形 → `inset(0)` |
| 45% → 100% | **顶栏** | `translateY(-8px)` + `opacity` 0 → 1 |
| 55% → 100% | **胶片轨** | `translateX(-14px)` + `opacity` 0 → **0.45** |
| 50% 起错峰 40ms | **第 2..n 页** | `translateY(10px)` + `opacity` 0 → 1 |

全程零形变。外框裁开与页放大是两个独立动作，只共用起点矩形，所以轨道和顶栏不会被压扁——它们只是还没进场。

轨道的终点是 **0.45 而非 1**：它从来不全亮，鼠标进阅读区才升起。

### 丙 · 无来源（socket 推送）

起点 `inset()` 由视口中心 `240×2` 短缝换算，圆角 = 半高。

| 阶段 | 变化 |
|---|---|
| 0 → 45% | 上下 inset → 0（竖向拉开），左右不变 |
| 45% → 100% | 左右 inset → 0（横向铺开），圆角 → `4px` |

内容淡入的保持段延长到 25%（缝窄时显字会脏）。

### 共用

- **阴影层**：从框上剥离到不参与 transform 的 fixed 兄弟层，show 时按 `box` 写入 rect，`opacity` 0（保持到 50~55%）→ 1。留在框上会被 `scale` 压扁成一条黑线。
- **遮罩**：`opacity` 0 → 1，入场时长的 70%。
- **出场**：不区分来源，单段 220ms `cubic-bezier(.4,0,1,1)`，按各自机制反向回起点。阴影 110ms、内容 132ms、遮罩 200ms 淡出。开是仪式，关不是。
- **reduced-motion**：跳过所有几何动画，160ms 纯淡入淡出。

## 结构改动

### PeekModal 成为定高框

**现状**：滚动在 `Dialog.Popup`（`modal.tsx` 的 `CustomModalComponent` 分支，`fixed inset-0 z-20 overflow-auto`），`PeekModal` 内层是 `mt-[10vh]` 的普通块，高度由内容撑开。

**改为**：框固定在视口内，`overflow: hidden`，滚动移到框的内层子级；`size` 决定尺寸档。

需要动的：
- `usePeek.tsx` 的 `basePresentProps.modalClassName` — 去掉 `overflow-auto`，改为定高布局容器
- `PeekModal.tsx` — 承担 `overflow: hidden`、内部滚动子层、`size` 分档
- `PdfPeekViewer` — 去掉 `h-[80vh] rounded-xl bg-paper ring-1 ring-neutral-4`，只保留 header + 轨道 + 页列表

**为什么必须改**：三种入场都要求框有确定且稳定的视口内矩形。内容撑开高度时 `box` 在数据到达前后会变，动画起点算错。固定高度顺带解决了另一个问题——预览内容都是异步加载的，`Loading` 态和加载完成态的矩形现在一致，动画可以在 present 的那一帧就开始，不必等数据。

### 两个死参数

`modal.tsx` 的 `CustomModalComponent` 分支只消费 `modalContainerClassName`：

- `YohakuFileCard` 传的 `contentClassName: 'p-0 -mx-2'` 无效
- `max: true` 无效（`max` 只在 `modal.tsx:258` 的非 custom 分支里）

两者都删掉，尺寸改由 `PeekModal` 的 `size="max"` 表达。

## PDF 阅读器

### 布局

```
PeekModal size="max"        90vw × 90vh，overflow hidden
└─ header                   文件名 · 页码(slot-text) · 下载 · 关闭
└─ split (flex, min-h-0)
   ├─ rail    84px          缩略图轨，opacity .45，split:hover → 1
   └─ reader  flex-1        页列表，max-w-44rem 居中，gap-6
```

- 每页保留 `ring-1 ring-neutral-4` + 轻投影（区别于「纸叠」方案的 1px 暗缝）
- 轨道当前页 ring 换 accent，页号变 accent
- 滚动时轨道 `scrollIntoView({ block: 'nearest' })` 跟随
- 点缩略图 `scrollIntoView({ behavior: 'smooth' })` 跳页

### 页码用 slot-text

`{current}/{total}` 是随滚动变化的数字，按项目约定必须走 `slot-text/react` 翻牌，不能是纯文本节点。

### 缩略图渲染策略

**动画不阻塞在渲染上。** 轨道 55% 才入场，之前有 440ms 可用：

1. present 那一帧就 `renderPdfPage` 主区首屏
2. 缩略图走 `IntersectionObserver`（复用现有 `useInView` 的 `rootMargin` 模式）+ 低 scale（约 0.2）渲染
3. 轨道滑入时缩略图是骨架，渲好逐个换上

`PdfPeekPage` 现有的双 `useInView`（`rootMargin: '800px'` 预加载 + `threshold: 0.35` 定位当前页）保持不变。

### PdfFirstPage 卡片

布局不变（`max-h-96` 窗口 + 底部渐变 + 「查看更多」）。它是 FLIP 的起点，`max-h` 裁切量参与 `hiddenBelow` 计算，改动会牵动动画。

## 管线改动

1. `usePeek` 签名 `(href)` → `(href, origin?: DOMRect)`
2. `PeekLink.handlePeek` 传 `e.currentTarget.getClientRects()[0]`。**必须是 `getClientRects()[0]` 而非 `getBoundingClientRect()`** — 行内 `<a>` 跨行时后者返回横跨两行的大框，动画会从一个不存在的矩形出发
3. `YohakuFileCard.openPdf` 传 `event.currentTarget.getBoundingClientRect()`，并标记来源类型：canvas 区与「查看更多」→ 卡片（乙），三个文字入口 → 文字（甲）
4. `PeekModal` 接 `origin` + `originKind` + `size`，`useLayoutEffect` 中读框矩形并驱动动画
5. `window.peek`（两处 socket handler）不传 origin → 丙
6. 现有 `history.replaceState` peek 参数逻辑不变；PDF 不传 `to`，无全屏入口，也不写 URL 参数

**用 WAAPI（`element.animate()`）而非 motion 的 `m.div`。** clip 分支需要 `inset()` 的 `round` 参与插值，WAAPI 行为更可预测；FLIP 起点必须在布局完成后才能算，命令式驱动比声明式 variants 更直接。`microReboundPreset` 在 peek 上不再使用。

## 不做的事

- 移动端 peek（`usePeek` 仍在 `isMobile` 时返回 false）
- 键盘导航、栈内前进后退、"继续读下去"过渡
- PDF 缩放、搜索、文本选择、大纲
- note/post 纸的任何视觉改版；遮罩语言变更
- 其他 modal 的动效（`modalMontionConfig` 不变）

## 验证

- `pnpm --filter @yohaku/web exec tsc --noEmit`
- `pnpm --filter @yohaku/web exec vitest run src/components/ui/rich-content/file-preview.test.ts`
- 浏览器实测（`verify` skill）：
  - 甲：thinking 列表连点多条、时间线条目、footer 链接
  - 乙：PDF 卡片 canvas 区与「查看更多」各一次，看轨道与顶栏的错峰
  - 丙：console 调 `window.peek('/posts/<category>/<slug>')`
- 跨行链接：找一条恰好折行的链接，确认从首行矩形出发
- 多页 PDF（≥ 20 页）：确认缩略图 lazy 生效、轨道跟随、跳页正常
- 系统"减弱动态效果"开启后重跑
- 亮暗两套主题各一次

## 原型

一次性，未入库：

- 行内文字 FLIP 与无来源 clip：<https://claude.ai/code/artifact/4650a3b0-e664-4599-9f1b-ded11f30e95a>
- PDF 三种 chrome 对比：<https://claude.ai/code/artifact/dfb99104-0c3b-482e-a892-e63453c5f13c>
- PDF 页 FLIP 编排：<https://claude.ai/code/artifact/0266dc57-0e5a-49fc-82bc-69fdd452b3e2>
