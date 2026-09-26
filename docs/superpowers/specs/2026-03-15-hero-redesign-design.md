# Hero Redesign — 散文式自由布局 + 书写呼吸动效

## Overview

重新设计首页 Hero 组件，从当前的二栏左文右图布局改为「散文式自由布局」，以「书写 · 信纸 · 光影」为视觉核心。元素如手帐般散落于画布，配合 SVG 手写入场动画与微幅呼吸浮动。

## Design Decisions

| 维度 | 决定 |
|------|------|
| 高度 | 桌面 65vh (min 560px)，移动端 auto（内容撑开） |
| 布局 | 桌面 absolute 自由定位；移动端 flex-col 纵向流 |
| 背景 | 纯光影渐变，1-2 个缓慢移动的暖色 radial-gradient 光斑 |
| 标题动画 | CSS `background-clip: text` + gradient sweep 模拟手写描绘感（~2s），不依赖 SVG path data |
| 社交图标 | 单色线条，hover 显 accent color |
| 一言 | 手写体/斜体 P.S. 风格，右下角 |
| 头像 | 桌面 48px 右上角弱化；移动端 36px 顶部行 |
| 新增 | 写作统计（文章数/字数/天数）+ 「最近在写」动态区 |
| 暗色主题 | 光斑改为冷色调低透明度，文字色跟随现有 dark mode token |
| 无障碍 | `prefers-reduced-motion` 时禁用所有浮动/入场动画 |

## Architecture

### Component Structure

```
Hero.tsx (重写)
├── HeroBackground        — 光影渐变背景层（1-2 个 div radial-gradient）
├── HeroTitle             — 标题 + gradient sweep 动画
├── HeroDescription       — 描述文字
├── HeroAvatar            — 缩小头像
├── HeroWritingStats      — 写作统计边注（文章数/字数/天数）
├── HeroRecentWriting     — 「最近在写」最近 3 篇文章/笔记标题（可点击）
├── HeroSocialIcons       — 单色线条社交图标（复用 SocialIcon，新增 variant="mono" prop）
└── HeroHitokoto          — P.S. 一言（复用现有 Hitokoto 逻辑，改样式）
```

所有子组件内联于 Hero.tsx 中，除非单组件超 80 行才拆分文件。

### Layout — Desktop (lg+)

```
┌─────────────────────────────────────────────────────┐
│                                              [avatar]│  top: 12%, right: 5%
│  标题 (gradient sweep)                               │  top: 15%, left: 5%
│  描述文字...                                         │  top: 28%, left: 5%
│                                                      │
│                                           287 篇     │  top: 45%, right: 5%
│  最近在写                                 102 万字    │
│  · 关于春天的碎碎念                       2190 天     │  top: 48%, left: 5%
│  · TypeScript 类型体操笔记                            │
│  · 三月读书清单                                       │
│                                                      │
│  [gh] [x] [tg] [mail]         P.S. 一言引语...       │  bottom: 12%/10%
└─────────────────────────────────────────────────────┘
```

### Layout — Mobile (<lg)

```
┌──────────────────────────┐
│ [avatar 36px]  二〇二六·春 │  头像 + 季节日期（从 new Date() 推算）
│                           │
│ 标题 (gradient sweep)     │  左对齐
│ 描述文字...               │
│                           │
│ 287篇 · 102万字 · 2190天  │  统计横排紧凑
│                           │
│ 最近在写                  │
│ · 文章标题1               │  flex:1 撑开
│ · 文章标题2               │
│ · 文章标题3               │
│                           │
│ [icons]       P.S. 一言   │  底部两端对齐
└──────────────────────────┘
```

季节日期逻辑：月份 3-5→春，6-8→夏，9-11→秋，12-2→冬。中文年份用汉字数字。需 i18n：英文 "2026 · Spring"。

## Animation System

### Entry Animation (首次访问)

总时长约 2.5-3s，使用 Motion library（已有依赖）：

| 阶段 | 元素 | 动画 | delay |
|------|------|------|-------|
| 1 | 背景光斑 | opacity 0→1 | 0s |
| 2 | 头像 | translateX(20px)→0, opacity 0→1 | 0.5s |
| 3 | 标题 | gradient sweep 从左到右（CSS animation） | 0.3s-2.3s |
| 4 | 描述 | translateY(12px)→0, opacity 0→1 | 2.0s |
| 5 | 统计 | translateY(12px)→0, opacity 0→1 + 数字 counting | 2.1s |
| 6 | 最近在写 | translateY(12px)→0, opacity 0→1 | 2.2s |
| 7 | 社交图标 | translateY(12px)→0, opacity 0→1 | 2.4s |
| 8 | P.S. 一言 | translateY(12px)→0, opacity 0→1 | 2.6s |

使用 `softBouncePreset` 或 `Spring.presets.snappy` 作为 transition。

### Breathing State (入场后，仅桌面)

入场完成后，各元素进入 CSS idle animation：
- 不同元素不同周期（12-18s）和方向
- 幅度极小：translate(±2px, ±3px)
- 纯 CSS `@keyframes`，不用 JS 驱动
- `prefers-reduced-motion: reduce` 时完全禁用

### Return Visit

通过 `sessionStorage.setItem('hero-entered', '1')` 标记：
- 跳过入场序列，所有元素 opacity: 1 直接显示
- 标题做简单 opacity 0→1 过渡（0.3s）
- 直接进入呼吸态（桌面）

### Mobile

- 保留入场动画序列（同桌面时序）
- 无呼吸浮动（节省性能）
- `prefers-reduced-motion` 同样适用

## Data Sources

### 写作统计 — 新建聚合接口

**mx-core 新增公开 API：**

```
GET /aggregate/site_info   (无 @Auth())

Response: {
  postCount: number,
  noteCount: number,
  totalWordCount: number,
  firstPublishDate: string   // ISO date
}
```

实现：聚合 `postModel.countDocuments()` + `noteModel.countDocuments()` + `getAllSiteWordsCount()` + `postModel.findOne({}, 'created', { sort: { created: 1 } })`。

前端：
- 文章数 = postCount + noteCount
- 字数 = totalWordCount（以「万」为单位显示）
- 天数 = `Math.floor((Date.now() - new Date(firstPublishDate).getTime()) / 86400000)`
- 数字使用 `NumberSmoothTransition` 组件做 counting animation

TanStack Query key: `['site-info']`，staleTime 较长（5min+）。

### 最近在写

从已有 home query data（`useHomeQueryData()` → `AggregateTop`）取 posts + notes，按 created 排序取前 3 篇。数据已在 layout.tsx 中 prefetch，无额外请求。

**Edge cases：**
- Loading：显示 3 行 skeleton（高度 16px，宽度随机 60-80%）
- Empty（<3 篇）：有几篇显示几篇，0 篇则隐藏整个区域
- Error：隐藏此区域，不影响其他元素

### 一言

保留现有 `FootHitokoto` / `RemoteHitokoto` 逻辑，仅改呈现样式为 P.S. 斜体。

## Styling

### Background Light

```css
/* 主光斑 — 暖色，缓慢飘移 */
.hero-light-primary {
  position: absolute;
  width: 350px; height: 350px;
  background: radial-gradient(ellipse, rgba(255, 228, 180, 0.35) 0%, transparent 65%);
  animation: hero-light-drift 8s ease-in-out infinite alternate;
}

/* 副光斑 — accent 色极淡，反向运动 */
.hero-light-secondary {
  position: absolute;
  width: 200px; height: 200px;
  background: radial-gradient(ellipse, oklch(from var(--color-accent) l c h / 0.06) 0%, transparent 65%);
  animation: hero-light-drift 12s ease-in-out infinite alternate-reverse;
}

@keyframes hero-light-drift {
  from { transform: translate(0, 0) scale(1); }
  to   { transform: translate(15px, 8px) scale(1.05); }
}

/* Dark mode: 降低透明度，主光斑改冷色 (class-based, 匹配项目 @custom-variant dark) */
:where(.dark, [data-theme="dark"]) .hero-light-primary {
  background: radial-gradient(ellipse, rgba(180, 200, 255, 0.15) 0%, transparent 65%);
}
```

### Title Animation (替代 SVG stroke)

使用 CSS gradient sweep 模拟书写感：
```css
.hero-title {
  background: linear-gradient(90deg, currentColor 50%, transparent 50%);
  background-size: 200% 100%;
  background-position: 100% 0;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: title-reveal 2s ease forwards 0.3s;
}

@keyframes title-reveal {
  to { background-position: 0 0; }
}
```

回访时跳过此动画，直接 `background-position: 0 0`。

### Social Icons

- 新增 `variant` prop 到 `SocialIcon`：`"default" | "mono"`
- `mono`：去掉平台背景色，28px 圆形 border，icon 为 neutral gray
- Hover：border-color + fill 过渡至 accent color，transition 0.3s
- 不影响其他使用 SocialIcon 的地方

### Typography

- 标题：serif font（继承 `--font-serif`），letter-spacing 5-6px
- 统计边注：serif italic，text-xs，text-neutral-4
- P.S. 一言：serif italic，text-xs，前缀 "P.S." 稍浅（text-neutral-3）
- 「最近在写」标题：text-[10px] uppercase tracking-widest text-neutral-4
- 「最近在写」条目：text-xs text-neutral-6，hover → text-accent

### Dark Mode

不作为 out-of-scope。使用现有 dark mode token：
- 文字色：跟随 `text-neutral-*` 自动切换
- 光斑：降低透明度 + 冷色调
- 社交图标：border 和 fill 使用 `dark:border-neutral-700` / `dark:text-neutral-400`
- 一言/统计：同样跟随 neutral token

## Files to Modify

### mx-core (backend)
- `apps/core/src/modules/aggregate/aggregate.controller.ts` — 新增 `GET /aggregate/site_info` 公开路由
- `apps/core/src/modules/aggregate/aggregate.service.ts` — 新增 `getSiteInfo()` 方法

### Shiroi (frontend)
- `apps/web/src/app/[locale]/(home)/components/Hero.tsx` — 完全重写
- `apps/web/src/components/modules/home/SocialIcon.tsx` — 新增 `variant="mono"` prop
- `apps/web/src/queries/keys/` — 新增 `site-info` query key（如有集中管理）

### 不改动
- `TwoColumnLayout.tsx` — Hero 不再使用，但 ActivityScreen 仍用，保留
- `apps/web/src/app/[locale]/(home)/layout.tsx` — Hero 引用不变
- 其他首页区块（ActivityScreen, HomePageTimeLine, Windsock）

## Out of Scope

- 「最近在写」hover 预览卡片
- 头像点击交互
- 其他首页区块改动
- 背景纹理/噪点（已决定纯光影）
