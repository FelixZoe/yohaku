# Timeline 页面精化设计

**Date**: 2026-04-20
**Scope**: `apps/web/src/app/[locale]/timeline/page.tsx` 及相关 `components/ui/list/Timeline*`、`components/modules/timeline/*`、`styles/layer.css` 中 `.yohaku-timeline*` 规则。

## 背景

现状 Timeline 页以「spine 脊栏 + 年份巨字 + hover 2px bar」为骨，信息密度中等，`TimelineProgress` 三项统计（day / year% / today%）为 header。痛点：

- 年份巨字与列表视觉断裂（spine 仅在列表段有 border，年份无）
- 年内无次级分组，长月连片失节奏
- title / date / meta 三者皆低饱和，扫视主次不清
- meta 仅 `lg:` 可见，mobile 无法见 mood/weather/type
- 过滤器（type/year/memory）仅 URL 可控，UI 不显
- 无密度切换，单模式难兼「细读」与「俯瞰」两用

## 目标

refine（非 redesign）。保留站内气质（米白纸感、accent 点睛、克制 motion），提升扫视性、节奏感、信息密度可调、URL 可分享。

**Out of scope**：后端 API 变更；新增数据字段；键盘导航；重写 `TimelineProgress`。

## 设计决议

### 一、去 spine，纯留白（Pure indent）

**范围限定**：仅 Timeline 页（`/timeline`）。`TimelineList` / `TimelineListItem` / `TimelineSpineLayout` 他处（`/categories/[slug]`、`/notes/series`、`/posts/tag/[name]` 等）仍用，契约不动。`.yohaku-timeline` 与 `.yohaku-timeline-spine` CSS 规则保留。

**Timeline 页内部**：
- 不再使用 `TimelineList` / `TimelineListItem` / `TimelineSpineLayout`
- 改用新组件 `TimelineRelaxed` / `TimelineDense` / `TimelineSkim`（自带样式，不依赖全局 spine class）
- 年份巨字 + 月份 micro-header + 列表项三层结构，靠字号、字重、间距自然分层，无竖线无 hover bar

### 二、年内月份分组（Month micro-header）

- 年份之下、列表之前，按月插入 micro-header
- 格式：「十二月 · DEC」— 中英并列，`font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase`
- 颜色：`text-neutral-10/45`
- 间距：月份之前 `padding-top: 14px`，之下 `padding-bottom: 6px`
- 同一月内多项按日期降序，月份之间以月 header 分段

### 三、色系 · 对齐项目

| 元素 | light | dark |
|---|---|---|
| page bg | `var(--color-root-bg)` `#fefefb` | `rgb(28,28,30)` |
| 年份字 | `n-10/50` | `n-10/50` |
| 年度 count | `n-10/30` | `n-10/30` |
| 月份 header | `n-10/45` | `n-10/45` |
| date 数字 | `n-10/45` | `n-10/45` |
| title | `n-10/90` weight 450 | `n-10/90` weight 450 |
| meta | `n-10/40` | `n-10/40` |
| hover date | `text-accent` | `text-accent` |
| hover title | `n-10` 100% | `n-10` 100% |
| bookmark icon | 保 `text-red-500`（SolidBookmark）| 同 |

**禁止**：accent 染底、accent 作非 hover 的常态点缀、任何 `neutral-50~950` 色值。

### 四、列表项布局（舒 · relaxed · 默认档）

```
[date 28px] [title flex:1 truncate] [meta shrink]
```

- 日期格式：`DD` 两位（月份由 micro-header 代之，不再 MM-DD）
- `tabular-nums`，`font-size: 12px`
- title `font-size: 14px`，`font-weight: 450`，`truncate`
- meta 重组：单行 `·` 分隔，`font-size: 10.5px`。mood/weather 保留文字（不引 icon）。lg+ 与 mobile 皆显
- bookmark：`SolidBookmark` 保持 `text-red-500`，`ml-0.5 shrink-0`
- padding 每行 `7px 0`，`gap: 14px`，item 与月份同左起（零缩进）

### 五、密度三档（View mode）

**舒 · relaxed**（默认）— 如上

**密 · dense**
- 单行：`[date 22px] [title flex truncate] [type 9.5px uppercase]`
- meta 隐，仅保类型（Note / Post）
- `padding: 3px 0`，`font-size: title 13px / date 11px`
- 适用：年末回看、目录检索

**概览 · skim**
- 布局：`[label 92px] [chart flex:1] [count 24px right]`
- label：月份 uppercase letter-spaced
- chart：
  - `position: relative; height: 18px`
  - **baseline**：`::after` `position: absolute; inset: auto 0 4px 0; height: 1px; background: var(--hair)` 贯通各行
  - **fill**：`position: absolute; left: 0; bottom: 4px; height: 2px; background: var(--accent); opacity: 0.55`，宽按该月数 / 最大月数 × 100%
  - hover：opacity `0.55 → 0.85`，height `2 → 3px`
- count：`font-size: 11px; width: 24px; text-align: right`
- 行 padding：`7px 0`，label/count 定宽，chart flex —— 各行起止 x 严格对齐
- **点月份行**：跳至该月首项，同时切回「舒」档
- 跨年：年份巨字 + 空行间隔

**新 CSS var**：`--hair: rgba(24,24,27,0.08)` (light) / `rgba(255,255,255,0.1)` (dark)，加入 `styles/variables.css`。

### 六、切换控件（Segmented control）

- 位置：header 右上，与 `TimelineSearchButton` 并列
- 形：三键 `舒 · 密 · 概览`，活跃键下方细横线（accent，1.5px）
- 写 URL：`?view=relaxed|dense|skim`，与 `type`/`year`/`memory` 共存
- localStorage key `yohaku:timeline:view` 记偏好，无 URL 参数时读之，URL 优先
- memory 模式下仍显（三档皆可用于 bookmark 回看）

### 七、Motion

**进场**（`styles/animation.css` 新增 keyframes）
- `timeline-fade-up`（已有）：year-group 整体 fade-up
- `timeline-item-in`：每项 stagger 40ms，总不超 300ms。以 `--li-index` 作 delay 乘数
- `timeline-month-in`：月份 micro-header fade-up，delay 随其前项数

**Hover**
- `.tl-item` 内 date/title transition `color 0.2s ease`
- 概览 fill `transition: opacity 0.2s, height 0.2s`
- 无额外 JS 追随逻辑

**Easing**
- 沿用 `var(--ease-spring)`（项目已有 linear() spring）

### 八、hover 行为（去 spine 之后）

- item `:hover`：`.tl-date { color: var(--color-accent) }`，`.tl-title { color: var(--color-neutral-10) }`
- 概览 row `:hover`：fill 加粗加深
- 不再用 JS 追随 indicator bar，不再用 `--indicator-*` CSS vars

### 九、selectId 跳锚

- 保留现 `useJumpTo` 逻辑（读 `?selectId`，滚动至 `[data-id]`）
- 去 spine 后，高亮动画仍用 `backgroundColor` 配 `accent-color` → transparent 1.5s
- 动画期间给 `<a>` 加 `no-shadow` 防 peek hover

### 十、URL 参数清单

- `?type=post|note`（保留）
- `?year=YYYY`（保留）
- `?memory=true` / `?bookmark=true`（保留）
- `?view=relaxed|dense|skim`（新增）
- `?selectId=<id>`（保留）

## 组件边界

```
TimelinePage (page.tsx)
├─ TimelineHeader             ← 新抽：title + count + search + view-toggle
│  ├─ TimelineSearchButton     (已有，复用)
│  └─ TimelineViewToggle       ← 新：segmented control
├─ TimelineProgress           (已有，不改；memory 模式下隐)
├─ TimelineView (依 view 派发)
│  ├─ TimelineRelaxed          ← 新或改：舒档
│  ├─ TimelineDense            ← 新：密档
│  └─ TimelineSkim             ← 新：概览档
└─ TimelineFooterBackToTop    (已有)

TimelineList / TimelineListItem / TimelineYearGroup / TimelineSpineLayout
  ← 删除 spine 相关 CSS/JS，重命名或内联进各 View
```

**文件变动预估**：
- `apps/web/src/app/[locale]/timeline/page.tsx` — 重构为 view dispatcher；sortedMap 构造保留并派生 monthMap + monthCounts
- `apps/web/src/components/modules/timeline/TimelineRelaxed.tsx` — **新增**（舒档）
- `apps/web/src/components/modules/timeline/TimelineDense.tsx` — **新增**（密档）
- `apps/web/src/components/modules/timeline/TimelineSkim.tsx` — **新增**（概览档）
- `apps/web/src/components/modules/timeline/TimelineMonthGroup.tsx` — **新增**（月份 micro-header）
- `apps/web/src/components/modules/timeline/TimelineViewToggle.tsx` — **新增**（segmented control）
- `apps/web/src/components/ui/list/TimelineList.tsx` — **不动**（他处仍用）
- `apps/web/src/components/ui/list/TimelineListItem.tsx` — **不动**
- `apps/web/src/components/ui/list/TimelineSpineLayout.tsx` — **不动**
- `apps/web/src/components/ui/list/TimelineYearGroup.tsx` — **不动**（他处若用则保；Timeline 页不再使用，由新组件内联年份层）
- `apps/web/src/styles/layer.css` — `.yohaku-timeline` / `.yohaku-timeline-spine` 规则 **保留**
- `apps/web/src/styles/variables.css` — 加 `--hair`
- `apps/web/src/styles/animation.css` — 加 `timeline-item-in` / `timeline-month-in`
- `apps/web/src/components/modules/timeline/*.module.css` 或内联 `layer.css` 新层 — 新组件样式（class 以 `yohaku-tl-*` 命名避冲）
- `apps/web/messages/*.json`（i18n）— 新增 `timeline.view.relaxed/dense/skim` 三 key

## 数据流

现 `apiClient.aggregate.getTimeline({ type, year })` 返 `{ posts, notes }`，照用。

新增 per-view 派生：
- `groupByMonth(entries)`：`Map<[year, month], Entry[]>`，排序降序
- `monthCounts(entries)`：`Map<[year, month], number>` 用于概览 chart

二者可于 page.tsx 内 memo 计算，无需新 query。

## 非功能

- **性能**：去 JS hover 追随，hover 纯 CSS；列表为纯 JSX，无 virtualization（现数据量不大，暂不引 react-virtual）
- **i18n**：月份「十二月」/「DEC」皆用 `Intl.DateTimeFormat(locale)`，非硬编。zh 用中文月名，en 用三字 uppercase
- **a11y**：view toggle 用 `role="tablist"` / `role="tab"` / `aria-selected`；segmented control 可键盘 ArrowLeft/Right 切换
- **mobile**：舒档 meta 保显（现状隐于 lg+ 之修正）。概览档 label 92px 于 mobile 仍可容（总宽 ≥ 320px）

## 风险

- **现 `useJumpTo` 依赖 `getComputedStyle(...).getPropertyValue('accent-color')`** — 去 spine 不影响此，但须验证 document-level `accent-color` 仍生效
- **`TimelineProgress.test.tsx`** 存在，确保不破
- **peek link**：`TimelineListItem` 用 `PeekLink` 承 hover 预览，重构后须保 `data-id` 与 `href` 契约

## 迭代分层（implementation 分层建议）

1. **色与布局**：去 spine，改 item 布局，加月份 group。仅影响 relaxed 档
2. **密度切换**：加 dense/skim 档与 toggle，URL + LS 持久化
3. **motion**：stagger 进场与 hover transition
4. **交互扩展**（可独立 PR）：搜索 inline（Q3 c）、filter chip（Q3 a）、锚点 mini-nav（Q3 b） — 本 spec 不强求一次完成

（详细拆步交由 writing-plans 产出。）

## 参考 mockup

brainstorm 过程产出，存于 `.superpowers/brainstorm/64899-1776691545/content/`：

- `refine-v2.html` — 色对齐
- `refine-v3-motion.html` — motion 三层
- `refine-v5-no-spine.html` — 去 spine 四替代
- `refine-v6-final.html` — Pure indent 修正
- `refine-v7-skim-baseline.html` — 概览基线对齐
