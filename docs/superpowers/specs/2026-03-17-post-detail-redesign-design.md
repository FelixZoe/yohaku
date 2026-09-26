# Post Detail 页视觉风格重设计

## Overview

更新 `/posts/[category]/[slug]` 文章详情页的外围组件视觉风格，匹配「書写·信纸·光影」设计语言。保持现有居中布局与数据排布方向不变，正文 prose 和 PostActionAside 不改。

## Design Decisions

| 组件 | 决定 | 理由 |
|------|------|------|
| 布局 | 保持居中排布 | 不改变数据方向 |
| PostMetaBar | 纯文字 · 分隔，去掉所有图标 | 与 posts 列表页风格统一，克制 |
| 通知卡 | 合并淡白卡片（过期+翻译+AI摘要） | 减少视觉碎片，信纸附注感 |
| AI 摘要段 | 渐变底色（accent→暖色）+ 光斑铺满整段 | 与状态行形成层次，呼应光影主题 |
| PostCopyright | 极简落款 | 最小视觉存在感 |
| PostRelated | 淡卡片 + → 箭头 | 与通知卡视觉家族统一 |
| PostActionAside | 不改 | 保持现状 |
| 正文 prose | 不改 | 仅调外围 |
| 移动端 | 自然响应式 | 无特殊处理 |

## Component Changes

### 1. NoticeCard — 新建通用容器

**路径：** `apps/web/src/components/modules/shared/NoticeCard.tsx`

合并 PostOutdate、TranslationBanner、SummarySwitcher 为一个统一的淡白卡片。

**使用场景：**
- Post detail：过期 + 翻译 + AI 摘要（最多三段）
- Note detail：翻译 + AI 摘要（最多两段）
- 任意单段组合

**结构：**

```
┌─────────────────────────────────────────────────┐
│ ⚠ 此文章修改于 72 天前，信息可能已过时            │ ← 过期行（仅 post）
│─────────────────────────────────────────────────│
│ 🌐 AI 翻译  [中文 → EN]          查看原文        │ ← 翻译行
│─────────────────────────────────────────────────│
│ ░░░░░░░░░░ 渐变底色 + 光斑 ░░░░░░░░░░░░░░░░░░░░│
│ ✦ AI 摘要                              GEN      │ ← AI 摘要段
│ 本文系统梳理了 TypeScript 类型体操...             │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
└─────────────────────────────────────────────────┘
```

**视觉规格：**

外层卡片：
- `overflow: hidden; border-radius: 4px`
- Light: `bg-white/40 border border-black/[0.03]`
- Dark: `dark:bg-white/5 dark:border-white/5`

状态行（过期/翻译）：
- padding: `px-[18px] py-3`
- font-size: `text-[11px]`, color: `text-neutral-4`, dark 自动切换
- 图标 emoji（⚠/🌐）`opacity-60`
- 分隔线: `h-px bg-black/[0.03] dark:bg-white/[0.03]`

AI 摘要段：
- padding: `px-[18px] py-3.5`（与卡片齐平，无额外内层圆角）
- 背景: `background: linear-gradient(135deg, rgb(from var(--color-accent) r g b / 0.04) 0%, rgba(255,228,180,0.06) 50%, rgb(from var(--color-accent) r g b / 0.02) 100%)`
- Dark: `background: linear-gradient(135deg, rgb(from var(--color-accent) r g b / 0.06) 0%, rgba(255,228,180,0.04) 50%, rgb(from var(--color-accent) r g b / 0.03) 100%)`
- 右上光斑: `radial-gradient(circle, rgba(255,228,180,0.12), transparent 70%)`，120x120px absolute，dark 时 opacity 降为 0.06
- 标题行: 左 `✦ AI 摘要`（`text-[11px] text-neutral-5`），右 `GEN`（`text-[8px] font-mono text-neutral-3 tracking-[2px]`）
- 内容: `text-xs text-neutral-6 leading-[1.9]`

**Props 接口：**

```tsx
// NoticeCard: 外层卡片容器，过滤 falsy children，自动插入分隔线
interface NoticeCardProps {
  children: React.ReactNode
  className?: string
}

// NoticeCardItem: 单段内容
interface NoticeCardItemProps {
  children: React.ReactNode
  variant?: 'default' | 'summary'  // summary = 渐变底色
}
```

**渲染逻辑：**
- `NoticeCard` 通过 `React.Children.toArray(children).filter(Boolean)` 过滤 falsy children
- 有效 children 数为 0 时返回 null（不渲染卡片）
- 有效 children 数为 1 时无分隔线
- 有效 children 数 >= 2 时，相邻 children 间插入 `<div className="h-px bg-black/[0.03] dark:bg-white/[0.03]" />`

**使用方式：**

```tsx
<NoticeCard>
  {isOutdated && (
    <NoticeCardItem>
      <OutdateContent time={modified} />
    </NoticeCardItem>
  )}
  {isTranslated && translationMeta && (
    <NoticeCardItem>
      <TranslationContent translationMeta={translationMeta} />
    </NoticeCardItem>
  )}
  <NoticeCardItem variant="summary">
    <SummaryContent articleId={id} summary={summary} />
  </NoticeCardItem>
</NoticeCard>
```

### 2. PostMetaBar — 重写为纯文字

**变更范围：** 两处需改动：
1. `apps/web/src/components/modules/post/PostMetaBar.tsx` — 组件本身去掉图标
2. `apps/web/src/app/[locale]/posts/(post-detail)/[category]/[slug]/pageExtra.tsx` — PostMetaBarInternal 可能需适配

**方案：** 直接修改 PostMetaBar.tsx，去掉所有图标 import 和渲染，改为纯文字 + · 分隔。PostMetaBarInternal 无需改动（它只是调用 PostMetaBar 并传 children）。

当前 PostMetaBar 结构：`[🕐 时间 (已编辑)] [# 分类 / 标签] [👁 阅读] [👍 点赞] {children}`

改后结构：`时间 · (已编辑) · 分类 / 标签 · 阅读数 阅读 · 点赞数 喜欢 {children}`

具体变更：
- 移除 import: `MdiClockOutline`, `FeHash`, `ThumbsupIcon`, `i-mingcute-eye-2-line`
- 外层 className: `text-sm text-neutral-6` → `text-xs text-neutral-4`
- 时间：去掉 `MdiClockOutline` 图标，保留 `<RelativeTime />`
- 已编辑：保留 `FloatPopover` tooltip 行为不变
- 分类：去掉 `FeHash` 图标，保留 `MotionButtonBase` + `shiro-link--underline`
- 标签：行为不变（点击弹 TagDetailModal）
- 阅读/点赞：去掉图标，改为 `{count} 阅读` / `{count} 喜欢` 纯文字
- 各项之间用 `<span className="text-neutral-3">·</span>` 分隔

**i18n：** 阅读/点赞文案需 i18n key。检查现有 key：
- 若已有 `read_count` / `like_count` 等 key 则复用
- 若无则新增：zh `"{count} 阅读"` / `"{count} 喜欢"`，en `"{count} reads"` / `"{count} likes"`，ja `"{count} 閲覧"` / `"{count} いいね"`

### 3. PostCopyright — 重写为极简落款

**路径：** `apps/web/src/components/modules/post/PostCopyright.tsx`

**布局：** 改为 `flex flex-col`（非 grid）

```
标题 · 作者 · 2026.03.14
innei.in/posts/.../typescript-type-gymnastics  [copy icon]
CC BY-NC-SA 4.0 · 转载请注明出处

                                        Signature
```

- 第一行: `{title} · {name} · {date}`，`text-[11px] text-neutral-4`
- 第二行: 链接文字 + copy 按钮（保留 `IconScaleTransition` 的 init/done 双态）
- 第三行: CC 许可链接（保留 `FloatPopover` tooltip）+ 说明文字
- 签名: `flex justify-end`，保留 `<Signature />`
- 顶部分隔线: `h-px` + `bg-gradient-to-r from-transparent via-black/[0.04] to-transparent`
- Dark mode: 分隔线 `dark:via-white/[0.04]`，文字色跟随 `text-neutral-*` 自动切换

### 4. PostRelated — 重写为淡卡片 + 箭头

**路径：** `apps/web/src/components/modules/post/PostRelated.tsx`

```
┌──────────────────────────────────────┐
│ RELATED / 相关阅读                    │  ← i18n: type="before" 用 related_before, type="after" 用 related_after
│ → React Server Components 深度解析    │
│ → 用 Rust 重写一个小工具              │
│ → 三月读书清单                        │
└──────────────────────────────────────┘
```

- 淡白卡片: 与 NoticeCard 同风格（`bg-white/40 border border-black/[0.03] rounded dark:bg-white/5 dark:border-white/5`）
- 标题: `text-[10px] tracking-[3px] uppercase text-neutral-3`，文案用现有 i18n key `t('related_before')` / `t('related_after')`
- 每项: `→`（`text-neutral-3`）+ PeekLink 标题（`text-sm text-neutral-7 hover:text-accent transition-colors`）
- 项间间距: `space-y-2`
- 去掉 `<h3>` 和 `i-mingcute-question-line` 图标
- 去掉 `prose` 和 `<ul>` disc 列表

### 5. AI Summary 提取

**路径：** `apps/web/src/components/modules/ai/Summary.tsx`

**方案：** 新增 `variant` prop 控制布局模式：

```tsx
interface AiSummaryProps {
  articleId: string
  className?: string
  hydrateText?: string
  variant?: 'standalone' | 'inline'  // standalone = 现有斜角丝带, inline = 纯内容输出
}
```

- `variant="standalone"`（默认）: 保持现有斜角丝带样式（向后兼容，若其他地方使用）
- `variant="inline"`: 仅输出标题行 + 内容，无外层装饰/transform/mask，供 NoticeCard 消费

实际上现有只在 `SummarySwitcher` 中使用，可直接改为 inline 输出。但为安全起见，先加 variant prop，NoticeCard 中传 `variant="inline"`。

### 6. page.tsx（Post）— 整合通知卡

**路径：** `apps/web/src/app/[locale]/posts/(post-detail)/[category]/[slug]/page.tsx`

将 PostOutdate、TranslationBanner、Summary 三个独立组件替换为一个 `PostNoticeCard` 组件（页面级组合组件，非通用组件）。

**PostNoticeCard** 放在 `pageExtra.tsx` 中，内部：
1. 读取 `useCurrentPostDataSelector` 获取 modified/isTranslated/translationMeta/id/summary
2. 根据条件组装 `<NoticeCard>` + `<NoticeCardItem>`

### 7. detail-page.tsx（Note）— 同步使用

**路径：** `apps/web/src/app/[locale]/notes/(note-detail)/detail-page.tsx`

将 TranslationBanner（variant="borderless"）+ Summary 替换为类似的 `NoteNoticeCard` 组件（无过期段）。

## i18n

需新增的 key（若不存在）：

| key | zh | en | ja |
|-----|-----|-----|-----|
| `meta_reads` | `{count} 阅读` | `{count} reads` | `{count} 閲覧` |
| `meta_likes` | `{count} 喜欢` | `{count} likes` | `{count} いいね` |

现有复用的 key：`edited`, `edited_at`, `related_before`, `related_after`, `copyright_*`, `ai_key_insights`, `summary_label`

## Files to Modify

### 新建
1. `apps/web/src/components/modules/shared/NoticeCard.tsx` — 通用通知卡容器（NoticeCard + NoticeCardItem）

### 重写
2. `apps/web/src/components/modules/post/PostCopyright.tsx` — 极简落款（grid → flex col）
3. `apps/web/src/components/modules/post/PostRelated.tsx` — 淡卡片 + 箭头（去 prose/ul）
4. `apps/web/src/components/modules/post/PostMetaBar.tsx` — 纯文字 · 分隔（去图标，text-xs text-neutral-4）

### 修改
5. `apps/web/src/app/[locale]/posts/(post-detail)/[category]/[slug]/page.tsx` — 用 PostNoticeCard 替换三个独立组件
6. `apps/web/src/app/[locale]/posts/(post-detail)/[category]/[slug]/pageExtra.tsx` — 新增 PostNoticeCard 组合组件
7. `apps/web/src/app/[locale]/notes/(note-detail)/detail-page.tsx` — 用 NoteNoticeCard 替换 TranslationBanner + Summary
8. `apps/web/src/components/modules/ai/Summary.tsx` — 新增 `variant="inline"` 模式，去除斜角丝带装饰
9. `apps/web/src/components/modules/shared/SummarySwitcher.tsx` — 适配 NoticeCard（传 variant="inline"）
10. `apps/web/src/messages/{zh,en,ja}/common.json` — 新增 `meta_reads` / `meta_likes` key（若不存在）

### 不改
- `apps/web/src/components/modules/post/PostActionAside.tsx`
- 正文 prose 样式
- PostTitle / PostMetaBarInternal（仅调用 PostMetaBar，无需改）
- PageColorGradient
- CommentArea / TocFAB

## Dark Mode

所有组件跟随现有 dark mode token：
- 卡片背景: `dark:bg-white/5`，border: `dark:border-white/5`
- 分隔线: `dark:bg-white/[0.03]`
- 文字色: `text-neutral-*` 自动切换（Pure 1-10 体系 auto-invert）
- AI 摘要渐变: accent opacity 从 4%/2% 提升至 6%/3%，暖色光斑 opacity 从 0.12 降至 0.06
- 分隔线（PostCopyright 顶部）: `dark:via-white/[0.04]`

## Out of Scope

- PostActionAside 交互重设计
- 正文排版（prose 主题色/code block/blockquote 等）
- 入场动画
- 评论区样式
- 移动端底部操作栏
