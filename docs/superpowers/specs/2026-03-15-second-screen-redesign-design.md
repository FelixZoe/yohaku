# 第二屏重设计 — 折页信纸

## Overview

重新设计首页第二屏（原 ActivityScreen），从当前的二栏功能列表改为「折页信纸」布局，承接 Hero 的「书写·信纸·光影」视觉语言。上半页展示近期笔墨（首篇突出+行列），下半页以灵活三栏呈现「此刻」「来信」「碎念」，通过 perspective rotateX 展信动画从折痕处翻转展开。

## Design Decisions

| 维度 | 决定 |
|------|------|
| 整体布局 | 折页上下——上半页近期笔墨，下半页此刻/来信/碎念 |
| 折页动效 | 展信动画——上半页先淡入，下半页从折痕 rotateX 翻转展开 |
| 上半页卡片 | 首篇突出——最新一篇卡片含摘要，其余行列排列 |
| 下半页权重 | 灵活缺省——有数据显示，无数据隐藏，flex 自适应 |
| Hero 过渡 | 自然流——无分界线，光斑渐变自然延伸至第二屏 |
| 移动端 | 纯线性流——取消折痕，所有区块纵向排列，统一 fade-in |
| 暗色主题 | 跟随现有 dark mode token，无额外处理 |
| 无障碍 | `prefers-reduced-motion` 时禁用展信动画，直接显示 |

## Architecture

### Component Structure

```
SecondScreen.tsx (新建，替代 ActivityScreen 在首页的位置)
├── RecentWriting          — 上半页：近期笔墨区
│   ├── FeaturedPost       — 首篇突出卡片（标题+摘要+元信息）
│   └── PostRow[]          — 其余行列（标题+日期+分类）
├── FoldCrease             — 折痕装饰线（CSS 阴影+高光）
└── BottomSection          — 下半页：灵活三栏容器
    ├── NowStatus          — 「此刻」（在读/在听/在看，从 thinking 提取）
    ├── RecentLetters      — 「来信」（最近评论摘录）
    └── Musings            — 「碎念」（最近 thinking 纯文本条目）
```

所有子组件内联于 SecondScreen.tsx 中，除非单组件超 80 行才拆分文件。

### Layout — Desktop (lg+)

```
┌─────────────────────────────────────────────────────────────┐
│  (Hero 自然过渡，无分界线，光斑渐变延续)                       │
│                                                             │
│  近期笔墨                                                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 笔记 · 三月十二日 · ☁️ 多云                           │    │
│  │ 关于春天的碎碎念                                      │    │
│  │ 春天来了，窗外的樱花开始冒芽，空气里有泥土的味道...     │    │
│  └─────────────────────────────────────────────────────┘    │
│  TypeScript 类型体操笔记                          三月八日   │
│  ─────────────────────────────────────────────────────────  │
│  三月读书清单                                    三月五日   │
│  ─────────────────────────────────────────────────────────  │
│  用 Rust 重写一个小工具                          二月廿八日  │
│                                                             │
│  ═══════════════════ 折痕 ═══════════════════                │
│                                                             │
│  此刻          │  来信                │  碎念                │
│  📖 置身事内    │  "类型体操那篇       │  "终于把那个 bug     │
│  兰小欢 · 在读  │   让我豁然开朗"      │   修了..."           │
│  ♪ Night Dancer│  — 某访客 · 昨日     │                      │
│  imase · 在听   │                      │  "樱花快开了"        │
│  铃芽之旅      │  "春天好有共鸣"       │                      │
│  ★★★★☆ · 在看 │  — 友人 · 三日前     │  — 最近两日          │
└─────────────────────────────────────────────────────────────┘
```

下半页三栏为 flex 布局，各栏 `flex: 1`，以竖线分隔。无数据的栏整个隐藏，剩余栏自动撑开。

### Layout — Mobile (<lg)

```
┌──────────────────────────┐
│ 近期笔墨                  │
│ ┌──────────────────────┐ │
│ │ 笔记 · 三月十二日 · ☁️│ │
│ │ 关于春天的碎碎念       │ │
│ │ 摘要文字...           │ │
│ └──────────────────────┘ │
│ TypeScript 类型体操笔记   │
│ 文章 · 三月八日           │
│ ─────────────────────── │
│ 三月读书清单              │
│ 文章 · 三月五日           │
│                          │
│ 此刻                     │  (无折痕，纯间距分隔)
│ 📖 置身事内  ♪ Night...  │  (横排紧凑)
│                          │
│ 来信                     │
│ "类型体操那篇..."        │
│                          │
│ 碎念                     │
│ "终于把那个 bug 修了"     │
└──────────────────────────┘
```

无折痕概念，各区块以统一间距（24px）纵向排列。入场动画统一为 translateY(12px) + opacity fade-in，stagger delay。

## Animation System

### Entry Animation (InView 触发)

使用 Motion library + `react-intersection-observer`，进入视口时触发：

| 阶段 | 元素 | 动画 | delay |
|------|------|------|-------|
| 1 | 上半页整体 | translateY(16px)→0, opacity 0→1 | 0s |
| 2 | 下半页整体 | rotateX(-90deg)→0, opacity 0→1 | 0.5s |
| 3 | 折痕投影 | opacity 0→1→0 | 0.6s→1.6s |

桌面端使用 `perspective: 800px` + `transform-origin: top center` 实现翻转效果。

### Mobile

- 无 rotateX 翻转
- 各区块统一 translateY(12px) + opacity 0→1，stagger 0.15s
- 无折痕投影

### prefers-reduced-motion

- 禁用所有动画
- 所有元素直接 opacity: 1, transform: none

### Return Visit

与 Hero 共享 `sessionStorage.getItem('hero-entered')` 标记：
- 跳过展信动画序列
- 所有元素直接显示（opacity: 1）
- 注意：此标记由 Hero 组件设置。因 SecondScreen 在 layout 中位于 Hero 之后，Hero 必先渲染并设置该标记，故无竞态问题

## Data Sources

### 近期笔墨

从已有 home query data（`useHomeQueryData()` → `AggregateTop`）取 posts + notes，按 created 排序取前 4-5 篇。数据已在 layout.tsx 中 prefetch，无额外请求。

**注意：** 当前 `AggregateTop` 类型中 post/note 仅含 `id | slug | title | created | category | images` 等字段，不含 `summary`、`mood`、`weather`。需在 mx-core 的 `aggregate.service.ts` `findTop` 方法中扩展 select 投影：
- Post 增加 `summary` 字段
- Note 增加 `mood` `weather` 字段
- 同步更新 `@mx-space/api-client` 中的 `AggregateTopPost` / `AggregateTopNote` 类型

首篇取 `summary` 字段作为摘要（若 summary 为空则不显示摘要行）；笔记可附带 `mood`/`weather` 元信息。

**Edge cases：**
- Loading：首篇显示 skeleton 卡片（高度 ~100px），其余显示 3 行 skeleton
- Empty（<1 篇）：隐藏整个近期笔墨区域
- 文章/笔记混排：统一按 created 排序，type 标记区分「文章」/「笔记」
- summary 为空：首篇卡片仅显示标题+元信息，不显示摘要

### 此刻（NowStatus）+ 碎念（Musings）共享数据源

「此刻」和「碎念」共享同一数据源。使用 `apiClient.recently.getList({ size: 20 })` 获取最近 20 条 thinking 条目（游标分页接口，仅取首批，避免 `getAll()` 的全量加载），客户端按 type 过滤分流。

TanStack Query key: `['recently', 'home']`，staleTime: 5min。

**此刻（NowStatus）：**

按 `type` 字段过滤（枚举值为小写）：
- `type === 'book'` → 在读（取 `metadata.title`, `metadata.author`, `metadata.cover`）
- `type === 'music'` → 在听（取 `metadata.title`, `metadata.artist`）
- `type === 'media'` → 在看（取 `metadata.title`, `metadata.rating`）

每种类型取最新一条。

**Edge cases：**
- 无任何 book/music/media 类型条目：隐藏整个「此刻」栏
- 仅有部分类型：显示有数据的类型，隐藏无数据的
- Loading：显示 skeleton

### 来信（RecentLetters）

从 `activity/recent` API 取 `comment` 数组（已有接口，max 3），显示 2-3 条最近评论。字段映射：
- `text` 字段 → 评论文本（斜体引用样式）
- `author` 字段 → 评论者名
- `created` 字段 → 相对时间
- `title` 字段 → 所评文章/笔记标题（可选展示）

复用现有 `useActivity()` query（已在 ActivityRecent 中使用），TanStack Query key 保持不变。

**Edge cases：**
- 无评论：隐藏整个「来信」栏
- 评论过长：截断至 2 行（line-clamp: 2）
- Loading：显示 skeleton

### 碎念（Musings）

从「此刻」共享的 `recently` 数据中过滤 `type === 'text'`（`RecentlyTypeEnum.Text`）条目，取最新 1-2 条。显示 `content` 字段。

**Edge cases：**
- 无纯文本 thinking 条目：隐藏整个「碎念」栏
- 若三栏全部隐藏（无此刻/无来信/无碎念）：折痕以下区域整体不渲染
- Loading：显示 skeleton

## Styling

### Background & Transition

自然过渡，与 Hero 共享背景色渐变。使用语义化 CSS 变量适配 dark mode：
```css
/* Light mode */
background: linear-gradient(180deg, #f3efe8 0%, #f1ede6 50%, #f3efe8 100%);

/* Dark mode — 跟随全局 bg token */
:where(.dark, [data-theme="dark"]) .second-screen {
  background: linear-gradient(180deg,
    theme(colors.neutral.900) 0%,
    theme(colors.neutral.950) 50%,
    theme(colors.neutral.900) 100%);
}
```

Hero 的光斑可延伸至第二屏区域（通过 Hero 光斑 div 的尺寸/定位自然溢出）。

### Fold Crease

```css
.fold-crease {
  position: relative;
  height: 8px;
  margin: 28px 0;
}

.fold-crease::before {
  content: '';
  position: absolute;
  left: 3%;
  right: 3%;
  top: 2px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(0,0,0,0.06) 15%, rgba(0,0,0,0.06) 85%, transparent);
}

.fold-crease::after {
  content: '';
  position: absolute;
  left: 3%;
  right: 3%;
  top: 4px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5) 15%, rgba(255,255,255,0.5) 85%, transparent);
}
```

### Unfold Animation (Desktop)

```css
/* perspective 置于父容器（SecondScreen wrapper），transform 置于子元素 */
.second-screen-wrapper {
  perspective: 800px;
}

.bottom-section {
  transform-origin: top center;
  /* Motion library 控制 transform: rotateX(-90deg) → rotateX(0) */
}
```

翻转时的临时投影：
```css
.unfold-shadow {
  height: 16px;
  background: linear-gradient(180deg, rgba(0,0,0,0.05), transparent);
  /* 翻转展开时显现，展开完成后淡出 */
}
```

### Featured Post Card

```css
.featured-post {
  padding: 20px;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 4px;
  border: 1px solid rgba(200, 180, 160, 0.1);
  transition: box-shadow 0.3s;
  cursor: pointer;
}

.featured-post:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}
```

### Post Row

行列中文章标题 hover 变为 accent color：
```css
.post-row-title {
  transition: color 0.3s;
}

.post-row-title:hover {
  color: theme(colors.accent);
}
```

### Typography

- 区块标题（近期笔墨/此刻/来信/碎念）：text-[9px] uppercase tracking-[4px] text-neutral-4
- 首篇文章标题：text-base serif，letter-spacing 0.5px
- 首篇摘要：text-xs text-neutral-5，line-height 1.8
- 行列标题：text-sm text-neutral-7
- 行列日期：text-[9px] italic text-neutral-3
- 评论引用：text-xs italic text-neutral-5，line-height 1.7
- 碎念内容：text-xs italic text-neutral-4，line-height 1.8，左 border 引用样式

### Dark Mode

跟随现有 dark mode token：
- 背景色：dark mode 下跟随全局背景 token
- 卡片背景：`dark:bg-white/5`
- 文字色：跟随 `text-neutral-*` 自动切换
- 折痕：`dark:` 降低 opacity
- 评论/碎念引用背景：`dark:bg-neutral-800/30`

## Files to Modify

### mx-core (backend)

- `apps/core/src/modules/aggregate/aggregate.service.ts` — `findTop` 方法 select 投影增加 Post 的 `summary` 和 Note 的 `mood` `weather` 字段
- `packages/api-client/models/aggregate.ts` — `AggregateTopPost` 增加 `summary?: string`，`AggregateTopNote` 增加 `mood?: string` `weather?: string`

### Shiroi (frontend)

- `apps/web/src/app/[locale]/(home)/components/SecondScreen.tsx` — **新建**，替代 ActivityScreen 的角色
- `apps/web/src/app/[locale]/(home)/layout.tsx` — 将 `<ActivityScreen />` 替换为 `<SecondScreen />`

### i18n

所有用户可见字符串需使用 `next-intl` 翻译系统（参考现有 `useTranslations('home')`）：
- 区块标题：「近期笔墨」「此刻」「来信」「碎念」
- 类型标记：「文章」「笔记」「在读」「在听」「在看」
- 日期格式：中文用汉字日期（三月十二日），英文用标准格式（Mar 12）

### Error Handling

整个 `SecondScreen` 包裹 `ErrorBoundary`（参考现有 `ActivityScreen` 模式）。各数据区块（此刻/来信/碎念）独立处理 error：query error 时隐藏该区块，不影响其他区块。

### 不改动

- `ActivityScreen.tsx` / `ActivityPostList.tsx` / `ActivityRecent.tsx` / `ActivityCard.tsx` — 保留文件，但首页不再引用。可能其他页面或未来使用
- `TwoColumnLayout.tsx` — 保留，其他地方可能使用
- `HomePageTimeLine.tsx` / `Windsock.tsx` — 不影响

## Out of Scope

- 文章 hover 预览卡片/弹窗
- 「此刻」条目的封面图片展示（首版用 emoji 图标代替）
- 下半页各栏的展开/折叠交互
- 评论点击跳转至原文评论区
- 碎念的点赞/互动功能
- 第三屏（HomePageTimeLine）和第四屏（Windsock）的改动
