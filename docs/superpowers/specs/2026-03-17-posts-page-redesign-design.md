# Posts 页重设计 — 書写·信纸·光影

## Overview

重新设计 `/posts` 文章列表页，从当前的双模式（loose/compact）列表改为整页重构：展示性页头（置顶/最新文章突出）+ 单一 compact 列表 + 纯分页 + 内联排序。视觉语言遵循「書写·信纸·光影」，字体采用 sans-serif。

## Design Decisions

| 维度 | 决定 | 理由 |
|------|------|------|
| 字体 | Sans-serif（系统字体栈） | 现代感，与信纸光影风格的留白感相配 |
| 页头 | 展示性——置顶/最新文章卡片突出 | 给予重点内容视觉权重，类似 notes 页 hero latest |
| 列表模式 | 仅 compact，移除 loose 和模式切换 | 简化交互，统一视觉节奏 |
| 分页 | 纯分页，简约页码（← 第 X 页，共 Y 页 →） | 清晰导航，避免无限滚动的性能和 UX 问题 |
| 分类筛选 | 保持独立页面，posts 页不含筛选 | 职责分离，posts 页保持纯粹 |
| 排序 | 页头内联纯文字链接（最新/最早/最近更新） | 最轻量存在感，选中态 accent + 下划线 |
| 列表项密度 | 标题+翻译标记 → summary → 底行左时间·分类、右阅读·点赞 | 信息层次清晰，视觉平衡 |
| Hover 效果 | 卡片浮起（translateY(-1px) + 投影 + 白色背景） | 信纸从桌面轻抬的触感，契合信纸主题 |
| 移动端 | 自然响应式，无特殊简化 | Featured card 全宽、列表堆叠、分页居中 |

## Page Structure

### Desktop (lg+)

```
┌─────────────────────────────────────────────────────┐
│  BLOG                                                │
│  文章                                                │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │ 置顶                                          │   │
│  │ TypeScript 类型体操笔记          [封面缩略图]  │   │
│  │ 摘要文字...                                    │   │
│  │ 3 天前 · 编程 / typescript    👁 1.2k  ♡ 36  │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  共 287 篇                     最新  最早  最近更新   │
│  ─────────────────────────────────────────────────── │
│                                                      │
│  用 Rust 重写一个小工具                              │
│  一个周末的冲动之作...                               │
│  1 周前 · 编程                        👁 856  ♡ 22  │
│                                                      │
│  三月读书清单                    [中文 → EN]         │
│  三月读了三本书...                                    │
│  2 周前 · 生活                        👁 432  ♡ 18  │
│                                                      │
│  ...                                                 │
│                                                      │
│         ← 上一页   第 1 页，共 29 页   下一页 →      │
└─────────────────────────────────────────────────────┘
```

### Mobile (<lg)

```
┌──────────────────────────┐
│  BLOG                     │
│  文章                     │
│  ┌──────────────────────┐│
│  │ 置顶                  ││
│  │ TypeScript 类型体操... ││
│  │ 摘要文字...           ││
│  │ 3 天前·编程  👁1.2k ♡36││
│  └──────────────────────┘│
│  共 287 篇    最新 最早...│
│  ─────────────────────── │
│  用 Rust 重写一个小工具   │
│  一个周末的冲动之作...    │
│  1 周前·编程    👁856 ♡22│
│  ─────────────────────── │
│  三月读书清单 [中文→EN]  │
│  三月读了三本书...        │
│  2 周前·生活    👁432 ♡18│
│                          │
│  ←上一页 第1页/共29页 下一页→│
└──────────────────────────┘
```

移动端 featured card 去掉封面缩略图，全宽展示。其余自然堆叠。

## Data Fields

### Featured Card (置顶/最新)

优先显示 `pin` 标记的文章；若无置顶则取列表第一篇。

- `title` — 文章标题
- `summary` 或 `text`（截断）— 摘要
- `images[0]` — 封面缩略图（桌面端，右侧 100x76px）
- `created` — 相对时间
- `category.name` + `tags` — 分类/标签
- `count.read` / `count.like` — 阅读/点赞
- `isTranslated` + `translationMeta` — AI 翻译标记
- `pin` — 是否置顶（显示"置顶"标签）

### List Item

- `title` — 文章标题
- `isTranslated` + `translationMeta` — AI 翻译标记（蓝色药丸，跟标题同行）
- `summary` 或 `text`（截断至约 80 字）— 摘要（单行）
- `created` — 相对时间
- `category.name` — 分类（可点击跳转 `/categories/[slug]`）
- `count.read` / `count.like` — 阅读/点赞

## Component Architecture

```
apps/web/src/app/[locale]/posts/
├── page.tsx              # 重写：Server Component，获取分页数据
└── (保留) (post-detail)/ # 文章详情页，不变

apps/web/src/components/modules/post/
├── PostFeaturedCard.tsx  # 新建：置顶/最新文章突出卡片
├── PostListItem.tsx      # 新建：compact 列表项（替代 PostItem.tsx 的双模式）
├── PostSortBar.tsx       # 新建：文章计数 + 排序文字链接
├── PostMetaBar.tsx       # 保留：meta 信息复用
├── PostPagination.tsx    # 重写：简约页码样式
├── PostPinIcon.tsx       # 保留
└── (删除以下文件)
    ├── PostItem.tsx          # 被 PostListItem 替代
    ├── PostItemComposer.tsx  # 不再需要（无双模式切换）
    ├── PostItemHoverOverlay.tsx # 不再需要
    ├── atom.ts               # 移除 viewMode atom（仅保留其他 atom 如有）
    ├── fab/PostsSettingsFab.tsx # 不再需要（排序内联，视图模式移除）
    └── index.ts              # 更新导出

apps/web/src/app/[locale]/posts/
├── loader.tsx            # 删除（无无限滚动）
├── data-revalidate.tsx   # 保留
├── action.ts             # 保留
└── loading.tsx           # 保留
```

## Styling

### Featured Card

```css
.featured-card {
  padding: 20px;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(0, 0, 0, 0.05);
  border-radius: 6px;
  transition: box-shadow 0.25s, transform 0.25s;
}
.featured-card:hover {
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.05);
  transform: translateY(-1px);
}
```

桌面端内部 flex 布局：左侧文字区 flex:1，右侧封面缩略图 100x76px rounded。移动端去掉封面图。

### List Item Hover（卡片浮起）

```css
.post-list-item {
  padding: 14px 16px;
  margin: 4px -16px;
  border-radius: 8px;
  transition: box-shadow 0.25s ease, transform 0.25s ease, background 0.25s ease;
}
.post-list-item:hover {
  background: rgba(255, 255, 255, 0.7);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.03);
  transform: translateY(-1px);
}
```

### Sort Links

非活跃态使用 `text-neutral-4`（Tailwind class），活跃态 `text-accent font-medium underline underline-offset-[3px]`。排序链接需 `aria-current="page"` 标记当前选中项。

### Pagination Accessibility

分页箭头需 `aria-label`（如 "上一页" / "下一页"），disabled 状态需 `aria-disabled="true"`。

### Pagination

```css
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 24px;
  padding: 28px 0;
}
/* 箭头为 accent 色文字，disabled 时灰色 */
```

### Typography

- 页面 label（BLOG）：10px, letter-spacing 4px, uppercase, text-neutral-4
- 页面标题（文章）：24px, font-weight 400, text-neutral-9
- Featured 置顶标签：10px, accent color, letter-spacing 1px
- Featured 标题：17px, font-weight 500
- Featured 摘要：12px, text-neutral-5, line-height 1.7
- 列表项标题：14px, font-weight 500
- 列表项摘要：12px, text-neutral-5, line-height 1.5
- Meta 时间/分类：11px, text-neutral-4 / accent
- 阅读/点赞：10px, text-neutral-3
- 翻译标记：9px, sky-600 on sky-100 pill
- 分页文字：11px, text-neutral-4；箭头 accent

### Dark Mode

跟随现有 dark mode token：
- Featured card 背景：`dark:bg-white/5`，border `dark:border-white/5`
- List item hover 背景：`dark:bg-white/5`
- 文字色：`text-neutral-*` 自动切换
- 翻译标记：`dark:bg-sky-500/10 dark:text-sky-400`（已有样式）

## Routing & API

### 路由

- `/posts` — 文章列表第 1 页
- `/posts?page=2&sortBy=created&orderBy=desc` — 分页 + 排序 query params
- 移除 `view_mode` query param

### API

使用现有 `apiClient.post.getList(page, size, options)`，参数不变：
- `page`: 当前页码
- `size`: 每页条数（10）
- `sortBy`: `'created' | 'modified'`
- `sortOrder`: `1 | -1`
- `truncate`: 150（featured card 需较长摘要，列表项截断至约 80 字由前端处理）
- `lang`: locale

### Featured 文章逻辑

从列表数据中提取：
1. 若列表中有 `pin === true` 的文章，取第一篇作为 featured
2. 若无置顶，取列表第一篇作为 featured
3. Featured 文章从列表中移除，避免重复显示
4. 仅第一页（page=1）显示 featured card
5. 非第一页无 featured card

## FAB Changes

- **移除** `PostsSettingFab`（排序已内联，视图模式已移除）
- **保留** `PostTagsFAB`（标签云弹窗）
- **保留** `SearchFAB`
- **保留** `BackToTopFAB`（桌面端）

## Edge Cases

- 无文章数据：保持现有 `NothingFound` 组件
- 置顶文章无封面图：featured card 无右侧图片区域，文字区全宽
- "置顶"标签需 i18n key（如 `pinned_label`），若不存在需新增
- 无置顶文章时 featured card 不显示 pin label，仅突出展示第一篇
- 翻译标记：仅在 `isTranslated && translationMeta` 时显示
- 第一页无置顶：取第一篇作为 featured（无"置顶"标签，不显示 pin label）
- Summary 为空：显示 `text` 截断内容
- 分页边界：上一页第一页 disabled，下一页最后一页 disabled
- 排序切换：通过 router.push 更新 URL query params，触发服务端重新获取

## Files to Modify

### 新建
1. `apps/web/src/components/modules/post/PostFeaturedCard.tsx`
2. `apps/web/src/components/modules/post/PostListItem.tsx`
3. `apps/web/src/components/modules/post/PostSortBar.tsx`

### 重写
4. `apps/web/src/app/[locale]/posts/page.tsx` — 整页重写
5. `apps/web/src/components/modules/post/PostPagination.tsx` — 简约页码样式

### 删除
6. `apps/web/src/app/[locale]/posts/loader.tsx` — 无限滚动逻辑
7. `apps/web/src/components/modules/post/PostItem.tsx` — 被 PostListItem 替代
8. `apps/web/src/components/modules/post/PostItemComposer.tsx` — 无双模式
9. `apps/web/src/components/modules/post/PostItemHoverOverlay.tsx` — 不再使用
10. `apps/web/src/components/modules/post/fab/PostsSettingsFab.tsx` — 排序内联化

### 更新
11. `apps/web/src/components/modules/post/atom.ts` — 移除 `postsViewModeAtom` 和 `usePostViewMode`
12. `apps/web/src/components/modules/post/index.ts` — 更新导出

## Out of Scope

- `/categories/[slug]`、`/posts/tag/[name]` 页面改动（已有独立 timeline redesign）
- 文章详情页改动
- 搜索功能改动
- 标签云弹窗改动
- 入场动画（首版不加，后续可增）
- Featured card 的封面图裁剪/懒加载优化
