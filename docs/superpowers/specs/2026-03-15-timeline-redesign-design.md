# 第三屏重设计 — 横卷·季节书页

## Overview

重新设计首页第三屏（HomePageTimeLine），从当前的 GitHub 贡献图式横向时间轴改为「横卷·季节书页」布局，承接 Hero 与 SecondScreen 的「书写·信纸·光影」视觉语言。按春夏秋冬分栏展示近一年的文章/笔记标题，远季渐淡近季渐浓，形成时间纵深。桌面端以竖线分隔如翻阅书页，移动端纵向堆叠。

## Design Decisions

| 维度 | 决定 |
|------|------|
| 布局 | 桌面端四栏（春夏/秋/冬/春·今），竖线分隔；移动端纵向堆叠 |
| 分栏逻辑 | 按季节分组：3-5月→春，6-8月→夏，9-11月→秋，12-2月→冬。首尾两季若同季则标注「春·夏」「春·今」区分 |
| 远近渐变 | 最远季 opacity 0.5，逐级递增至当季 opacity 1.0，文字色同步从 neutral-4 渐至 neutral-8 |
| 数据源 | 复用 `apiClient.activity.getLastYearPublication()`，无新增 API |
| 入场动画 | 展卷·逆序——从右至左 translateX 滑入，最新季先出现 |
| 移动端 | 全部展开·纵向流，各季节左 border 引导线，fade-in stagger |
| 底部链接 | 不加「查看全部」——Windsock 已有 timeline 入口 |
| 暗色主题 | 跟随现有 dark mode token，无额外处理 |
| 无障碍 | `prefers-reduced-motion` 时禁用展卷动画，直接显示 |

## Architecture

### Component Structure

```
HomePageTimeLine.tsx (重写)
├── SeasonColumn          — 单个季节栏（标题+文章列表）
└── SeasonDivider         — 竖线分隔（桌面端）
```

所有子组件内联于 HomePageTimeLine.tsx 中，除非单组件超 80 行才拆分文件。

### Layout — Desktop (lg+)

```
┌─────────────────────────────────────────────────────────────────┐
│  笔 耕 不 辍                                                     │
│                                                                 │
│  春 · 夏         │  秋              │  冬              │  春 · 今 │
│  (opacity 0.5)   │  (opacity 0.65)  │  (opacity 0.8)   │  (1.0)  │
│                  │                  │                  │         │
│  初夏小记    五月 │  Docker指南  八月 │  年终总结  十二月 │  春天的   │
│  深夜碎语    四月 │  秋日独白    九月 │  冬日将至  十一月 │   碎碎念  │
│  毕业季随想  六月 │  Zustand    十月 │  年度计划  一月   │  TS类型   │
│  Vite踩坑录  五月 │  国庆流水账  十月 │  新年碎碎念 一月  │   体操    │
│                  │                  │                  │  三月读书  │
│                                                                 │
│                                    本年 47 篇                    │
└─────────────────────────────────────────────────────────────────┘
```

各栏 `flex: 1`，竖线以 1px div + accent 色低透明度渐变（上下 transparent，中间 accent/15%→30%）分隔。

### Layout — Mobile (<lg)

```
┌──────────────────────────┐
│ 笔 耕 不 辍               │
│                          │
│ 春 · 今                  │  (opacity 1.0, accent color label)
│ ┃ 关于春天的碎碎念        │  (left border accent/30%)
│ ┃ TS 类型体操笔记         │
│ ┃ 三月读书清单            │
│ ┃ 用 Rust 重写小工具      │
│ ┃ 冬日散步随想            │
│                          │
│ 冬                       │  (opacity 0.8)
│ ┃ 年终总结·与回望         │  (left border accent/20%)
│ ┃ 冬日将至               │
│ ┃ 二〇二六年度计划        │
│ ┃ 新年碎碎念              │
│                          │
│ 秋                       │  (opacity 0.65)
│ ┃ Docker 部署指南         │  (left border accent/12%)
│ ┃ 秋日独白               │
│                          │
│ 春 · 夏                  │  (opacity 0.5)
│ ┃ 初夏小记               │  (left border accent/8%)
│ ┃ 深夜碎语               │
│                          │
│               本年 47 篇  │
└──────────────────────────┘
```

移动端顺序为最新季在上，纵向堆叠，间距 24px。各季左侧 border-left 1px，颜色透明度随远近递减。

### Season Grouping Logic

数据跨度为最近 12 个月的滑动窗口。季节定义：

- 春：3-5月
- 夏：6-8月
- 秋：9-11月
- 冬：12-2月

合并规则：
- 若 12 个月窗口内首季和末季为同一季节（如 2025.4→2026.3，首尾均为春），用标注区分：首段「春·夏」（合并不足一季的碎片），末段「春·今」
- 若某季无文章，该栏整体隐藏，剩余栏自动撑开
- 桌面端最多 4 栏，最少 1 栏

## Animation System

### Entry Animation — Desktop (InView 触发)

使用 Motion library + `react-intersection-observer`，进入视口时触发：

| 阶段 | 元素 | 动画 | delay |
|------|------|------|-------|
| 1 | 标题「笔耕不辍」 | translateY(12px)→0, opacity 0→1 | 0s |
| 2 | 当季栏（最右） | translateX(40px)→0, opacity 0→1 | 0.2s |
| 3 | 冬栏 | translateX(40px)→0, opacity 0→1 | 0.4s |
| 4 | 秋栏 | translateX(40px)→0, opacity 0→1 | 0.6s |
| 5 | 春夏栏（最左） | translateX(40px)→0, opacity 0→1 | 0.8s |
| 6 | 竖线分隔 | opacity 0→1 | 与相邻栏同步 |
| 7 | 底部统计 | opacity 0→1 | 1.0s |

Transition: `cubic-bezier(0.22, 1, 0.36, 1)`，duration 0.6s。

展卷方向：从右至左，最新季先出现，如展开一幅长卷。

### Entry Animation — Mobile

各季节块统一 translateY(12px) + opacity 0→1，stagger 0.15s。无 translateX（纵向流不适用横移）。

### Return Visit

共享 `sessionStorage.getItem('hero-entered')` 标记：
- 跳过展卷动画序列
- 所有元素直接显示（opacity 按远近渐变值）

### prefers-reduced-motion

- 禁用所有动画
- 所有元素直接 opacity 按远近渐变值, transform: none

## Data Sources

### 文章/笔记列表

复用 `apiClient.activity.getLastYearPublication()`（已有接口），返回近 12 个月的 posts 和 notes。

TanStack Query key: `['home-timeline']`（保持不变）。

前端处理：
1. 合并 posts + notes，按 created 排序
2. 按季节分组（月份→季节映射）
3. 每季内按 created 降序排列
4. 计算年度总篇数

字段映射：
- `title` → 文章标题
- `created` → 用于分组和显示月份
- `category.slug` / `slug` → Post 路由
- `nid` → Note 路由
- 类型判断：有 `nid` 字段为笔记，否则为文章

### Edge Cases

- Loading：显示 4 栏 skeleton（各 3 行 shimmer，宽度随机 60-80%）
- Empty（0 篇）：隐藏整个第三屏
- 仅 1 季有数据：仅显示该季栏，桌面端居中
- 某季文章过多（>10）：显示全部，自然撑高（不截断、不折叠）
- Error：隐藏整个第三屏，不影响其他区块

## Styling

### Season Column

```css
.season-col {
  flex: 1;
  min-width: 0;
}

/* 文章标题行 */
.season-item {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 0.8125rem;   /* ~13px */
  line-height: 1.7;
  cursor: pointer;
  transition: color 0.3s;
}

.season-item:hover {
  color: theme(colors.accent);
}

/* 月份标注 */
.season-item-month {
  font-size: 0.5rem;      /* ~8px */
  font-style: italic;
  color: theme(colors.neutral.400);
  flex-shrink: 0;
  margin-left: 8px;
}
```

### Season Divider

```css
.season-divider {
  width: 1px;
  background: linear-gradient(180deg, transparent, rgba(from theme(colors.accent) r g b / 0.15) 30%, rgba(from theme(colors.accent) r g b / 0.15) 70%, transparent);
}
```

### Season Label

```css
.season-label {
  font-size: 0.5625rem;   /* ~9px */
  letter-spacing: 3px;
  color: theme(colors.neutral.400);
  margin-bottom: 10px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
  padding-bottom: 6px;
}

/* 当季高亮 */
.season-label--current {
  color: theme(colors.accent);
  border-bottom-color: rgba(from theme(colors.accent) r g b / 0.15);
}
```

### Opacity Gradation

各季栏整体 opacity 按距当季的距离递减：

| 季节距离 | opacity |
|----------|---------|
| 当季 | 1.0 |
| 上一季 | 0.8 |
| 两季前 | 0.65 |
| 三季前 | 0.5 |

### Bottom Stat

```css
.timeline-stat {
  font-size: 0.5625rem;   /* ~9px */
  font-style: italic;
  color: theme(colors.neutral.400);
  text-align: right;
  margin-top: 16px;
  padding-top: 10px;
  border-top: 1px solid rgba(0, 0, 0, 0.04);
}

.timeline-stat-number {
  color: theme(colors.accent);
  font-size: 0.75rem;     /* ~12px */
  font-weight: 300;
}
```

### Mobile Styles

```css
/* 移动端季节块 */
.season-mobile {
  padding-left: 8px;
  border-left: 1px solid rgba(from theme(colors.accent) r g b / var(--season-border-opacity));
  /* --season-border-opacity: 0.3 (当季) / 0.2 / 0.12 / 0.08 (最远) */
}
```

### Typography

- 区块标题（笔耕不辍）：text-[9px] uppercase tracking-[4px] text-neutral-4，与 SecondScreen 区块标题风格一致
- 季节标签：text-[9px] tracking-[3px] text-neutral-4，当季为 text-accent
- 文章标题：text-sm text-neutral-7（深浅随远近变化），serif font
- 月份标注：text-[8px] italic text-neutral-3
- 底部统计：text-[9px] italic text-neutral-4

### Dark Mode

跟随现有 dark mode token：
- 文字色：跟随 `text-neutral-*` 自动切换
- 竖线分隔：dark mode 下降低 opacity
- 底部边线：`dark:border-neutral-800`
- 季节标签边线：同上

## i18n

所有用户可见字符串使用 `next-intl` 翻译系统（`useTranslations('home')`）：

| Key | zh | en |
|-----|----|----|
| `timeline_title` | 笔耕不辍 | （保留现有值） |
| `timeline_season_spring` | 春 | Spring |
| `timeline_season_summer` | 夏 | Summer |
| `timeline_season_autumn` | 秋 | Autumn |
| `timeline_season_winter` | 冬 | Winter |
| `timeline_season_current` | 今 | Now |
| `timeline_year_total` | 本年 {count} 篇 | {count} posts this year |

月份显示：中文用汉字（三月），英文用缩写（Mar）。复用现有 `timeline_title` key。

## Files to Modify

### Shiroi (frontend)

- `apps/web/src/app/[locale]/(home)/components/HomePageTimeLine.tsx` — **重写**
- `apps/web/src/messages/zh/home.json` — 新增 timeline season keys
- `apps/web/src/messages/en/home.json` — 新增 timeline season keys
- `apps/web/src/messages/ja/home.json` — 新增 timeline season keys（若存在）

### 不改动

- `apps/web/src/app/[locale]/(home)/layout.tsx` — HomePageTimeLine 引用不变
- Windsock — 不影响
- mx-core — 无后端变更，复用现有 API
- Hero / SecondScreen — 不影响

## Out of Scope

- 文章 hover 预览卡片
- 季节背景装饰（如季节性插图/emoji）
- 文章类型标记（文章/笔记区分图标）
- 底部「查看全部」链接（Windsock 已有入口）
- 季节折叠/展开交互（移动端全展开）
