# Category & Tag Detail 页重设计

**Date:** 2026-04-30
**Scope:** `/categories/[slug]` 与 `/posts/tag/[name]`，含 mx-core 后端配套改动
**Status:** spec, not implemented

## 1. 背景与目标

当前两个页面共用 `TimelineSpineLayout`，渲染却不对称：category 页有标题前缀、描述句、底部"回顶"按钮；tag 页只有 `标签：name (count)` 单行，无描述、无空态、无底部交互。两页都是扁平 timeline + 单行 row（仅 title + 日期），缺乏发现性与人格。

本次重做的核心方向：**编辑式聚合页**——抛弃 `TimelineSpineLayout`，借鉴 `/timeline` 与 `/posts` 已建立的余白排版语言（小号 uppercase label → 大号 extralight 数字 → 标题 → accent-rule → 列表），并通过两条结构差异承认 category 与 tag 的本质不同：

- **Category 是有人格的目的地**：可置顶（PinnedFeatureBlock）、可见子标签聚合（SubTagChips）
- **Tag 是查询结果**：无 featured、无主动策展，每行露出来源分类，底部展示该 tag 的"出现于"分布

两页共享 hero 骨架、accent gradient、按年分组的 row 列表、stagger 入场动画。

## 2. Non-goals

- 不新增 `/categories` 或 `/posts/tag` 索引页（用户从其他入口进入 detail 即可）
- 不为 `CategoryModel` 增加 `description` / `cover` / `icon` 字段，不做 schema migration
- 不删除 `TimelineSpineLayout` / `TimelineList` / `TimelineListItem` / `TimelineYearGroup`（`/notes/series` 仍在使用）
- 不引入虚拟列表
- 不写组件级单元测试或视觉回归测试

## 3. Architecture & 跨仓库改动

涉及 **mx-core**（后端）、**@mx-space/api-client**（类型）、**Yohaku/apps/web**（前端）。

| 仓库 | 改动 |
| --- | --- |
| mx-core | `category.service` 扩 select、加 `getCategoryTagsSum`；`category.controller` 在 `getCategoryById` 响应中附 `tagsSum`；`findArticleWithTag` 返回 mapping 增加 summary/tags/pin/count |
| api-client | `getCategoryByIdOrSlug` / `getTagByName` 类型扩展，纯增量、无 breaking |
| apps/web | 新增 `components/modules/category/*`；重写两个 page.tsx；抽出 `BackToTop` 共用；重排 i18n 文案 |

部署顺序：mx-core 先发 → api-client bump → web 升级。中间窗口 web 端 `tagsSum ?? []` 守卫保证不崩。

## 4. 数据层改动

### 4.1 mx-core

`apps/core/src/modules/category/category.service.ts`：

```ts
// 扩展 select 范围；保持 pin: -1 排序使首项即 pinned
async findCategoryPost(categoryId: string, condition: any = {}) {
  return this.postService.model
    .find({ categoryId, ...condition })
    .select('title slug created modified summary tags pin count categoryId images')
    .sort({ pin: -1, created: -1 })
    .lean()
}

// findArticleWithTag 调整 mapping
return posts.map(({ _id, title, slug, category, created, modified, summary, tags, pin, count }) => ({
  _id, title, slug, category, created, modified, summary, tags, pin,
  count: count ? { read: count.read, like: count.like } : undefined,
}))

// 新方法
async getCategoryTagsSum(categoryId: string) {
  return this.postService.model.aggregate([
    { $match: { categoryId: new Types.ObjectId(categoryId) } },
    { $project: { tags: 1 } },
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    { $project: { _id: 0, name: '$_id', count: 1 } },
    { $sort: { count: -1, name: 1 } },
  ])
}
```

`apps/core/src/modules/category/category.controller.ts → getCategoryById`：在原 `{ data: { ...res, children } }` 基础上附 `tagsSum`：

```ts
const tagsSum = await this.categoryService.getCategoryTagsSum(res._id.toHexString())
return { data: { ...res, children, tagsSum } }
```

不动 `category.model.ts`（无 schema 字段新增）。

### 4.2 api-client 类型

升级 `getCategoryByIdOrSlug` 返回类型中的 `children` Pick，增加 `summary | tags | pin | count | images`；并在响应根添加 `tagsSum: Array<{ name: string; count: number }>`。`getTagByName` 的 `data` Pick 同步扩展。所有变更纯增量。

### 4.3 apps/web 数据消费

- `categories/[slug]/api.tsx`：保持调用 `getCategoryByIdOrSlug` 不变；类型升级后 `data` 自动带 children + tagsSum
- `posts/tag/[name]/page.tsx`：保持调用 `getTagByName`；`crossCategoryCount` 在前端计算：`new Set(data.map(p => p.category.slug)).size`
- 缓存：mx-core 已有的 `BusinessEvents.CATEGORY_*` / `POST_*` 触发 `CleanAggregateCache`，tagsSum 自动跟随，无需新缓存层

## 5. 组件结构

新增 `apps/web/src/components/modules/category/`：

```
category/
├── HeroFrame.tsx              # 私有：CAP label + 大数字 + 标题 + accent-rule 共骨架
├── CategoryHero.tsx           # 包 HeroFrame，传 category 专用文案与 subtitle 公式
├── TagHero.tsx                # 包 HeroFrame，title 前缀渲染 #，subtitle 用 cross-category 公式
├── PinnedFeatureBlock.tsx     # PINNED 子标 + featured title + summary + meta + 分隔线
├── YearAnchor.tsx             # 大号 extralight 年份 + entries_count 副本
├── CategoryRowList.tsx        # 按年分组 + stagger 入场；接受 items + showCategorySource
├── CategoryRow.tsx            # 单 row：title + meta（月日 · #tag 或 月日 · 分类）
├── SubTagChips.tsx            # category 页底：pill chips 链接到 /posts/tag/<name>
├── CategoryCrossChips.tsx     # tag 页底：pill chips 链接到 /categories/<slug>
└── EmptyCategoryState.tsx     # 空 category 时的视觉
```

新增 `apps/web/src/components/ui/back-to-top/BackToTop.tsx`：从 `timeline/page.tsx` 的 `TimelineFooterBackToTop` 抽出，含 `springScrollToTop` 调用与 `back_to_top` i18n。同步替换 `/timeline` 中的内联实现。

复用（不新建）：`PageColorGradient`、`BottomToUpSoftSpringTransitionView`、`Link`、`routeBuilder` / `Routes`、`NormalContainer`。

保留不动：`TimelineSpineLayout` / `TimelineList` / `TimelineListItem` / `TimelineYearGroup`（仍服务 `/notes/series`）。

## 6. 页面组合

### 6.1 Category detail (`/categories/[slug]`)

```tsx
fetcher: getData({ slug })  // returns CategoryWithChildren + tagsSum
Component:
  const { name, slug, count, children, tagsSum } = data
  const pinnedPost = children[0]?.pin ? children[0] : null  // 依赖 backend pin: -1 排序
  const rest = pinnedPost ? children.slice(1) : children
  const earliestYear = Math.min(...children.map(c => new Date(c.created).getFullYear()))
  const multiYear = new Set(children.map(c => new Date(c.created).getFullYear())).size >= 2

  <PageColorGradient seed={`category|${slug}`} />
  <NormalContainer>
    <BottomToUpSoftSpringTransitionView>
      <CategoryHero count={count} name={name} earliestYear={earliestYear} />
    </BottomToUpSoftSpringTransitionView>

    {pinnedPost && <PinnedFeatureBlock post={pinnedPost} categorySlug={slug} />}

    {rest.length > 0 ? (
      <CategoryRowList
        items={rest}
        groupByYear={multiYear}
        showCategorySource={false}
        categorySlug={slug}
      />
    ) : !pinnedPost ? (
      <EmptyCategoryState />
    ) : null}

    {tagsSum.length > 0 && <SubTagChips tags={tagsSum} />}
    {(rest.length > 0 || pinnedPost) && <BackToTop />}
  </NormalContainer>
```

### 6.2 Tag detail (`/posts/tag/[name]`)

```tsx
fetcher: apiClient.category.getTagByName(name)
Component:
  const sorted = data.sort((a, b) => +new Date(b.created) - +new Date(a.created))
  const M = new Set(data.map(p => p.category.slug)).size
  const categoryCounts = aggregateBy(p => p.category, sorted)  // [{slug, name, count}]
  const multiYear = new Set(sorted.map(p => new Date(p.created).getFullYear())).size >= 2

  <PageColorGradient seed={`tag|${name}`} />
  <NormalContainer>
    <BottomToUpSoftSpringTransitionView>
      <TagHero count={data.length} name={name} crossCategoryCount={M} />
    </BottomToUpSoftSpringTransitionView>

    <CategoryRowList
      items={sorted}
      groupByYear={multiYear}
      showCategorySource={true}
    />

    {M >= 2 && <CategoryCrossChips counts={categoryCounts} />}
    <BackToTop />
  </NormalContainer>
```

### 6.3 派生逻辑细则

- **Subtitle 公式**：
  - `CategoryHero`：`count <= 1 || earliestYear === currentYear` → `category_subtitle_count_only`，否则 `category_subtitle_with_year`
  - `TagHero`：`crossCategoryCount <= 1` → `tag_subtitle_count_only`，否则 `tag_subtitle_with_cross`
- **Year 分组触发**：`groupByYear={multiYear}`，单年时 row 平铺、不渲染 YearAnchor
- **Row meta 文案**：
  - `showCategorySource=false` → `{月}月 {日}日 · #tag1, #tag2[+N]`（最多 2 个 tag）
  - `showCategorySource=true` → `{月}月 {日}日 · {category.name}`（来源分类用 `text-accent`）
  - 单年时 row meta 为完整 `MM-DD`（年份未呈现于 anchor）；多年时 row meta 为 `M月 D日`（年份在 anchor）
- **日期本地化**：使用 `useLocale()` 通过 `Intl.DateTimeFormat` 渲染，与 `/timeline` 一致
- **Pinned 选取**：`children[0]?.pin ? children[0] : null`（mx-core 已 `pin: -1` 排序使 pinned 必在首位；若多个 pinned，仅首位升级为 featured，其余以普通 row 出现，不做特殊标记）

## 7. 视觉规范

复用 `@yohaku/design-system` token，**不引入新 CSS 变量**。

### 7.1 Typography

| 元素 | 类 | 备注 |
| --- | --- | --- |
| header-cap | `text-[10px] tracking-[4px] uppercase text-neutral-10/55` | 与 /timeline 同源 |
| 大数字 | `text-[3.5rem] font-extralight tracking-tight leading-none text-neutral-10/85`；移动端 `text-[2.5rem]` | |
| num-suffix | `text-sm text-neutral-10/55` | "篇 · 始于 2021" |
| h1 title | `text-3xl font-medium text-neutral-10` | tag 页前缀 `#` 用 `font-extralight text-accent` |
| accent-rule | `mt-6 mb-7 h-px w-8 bg-accent/70` | 32×1px |
| pinned label | `text-[9px] tracking-[2px] uppercase text-accent` | |
| featured title | `text-[19px] font-normal text-neutral-10 leading-snug` | |
| featured summary | `text-xs text-neutral-10/55 leading-relaxed line-clamp-2` | |
| year anchor 数字 | `text-3xl font-extralight tracking-tight text-neutral-10/30 leading-none` | |
| year anchor count | `text-[10px] text-neutral-10/35 tracking-wider` | |
| row title | `text-sm font-normal text-neutral-10/85` hover→`text-neutral-10` | |
| row meta | `text-[10px] text-neutral-10/40 tabular-nums`；来源分类 `text-accent` | |
| chip pill | `text-[10px] px-2.5 py-0.5 rounded-full bg-neutral-2 text-neutral-10/65 hover:bg-accent/8 hover:text-accent`；count 数字 `ml-1 text-neutral-10/40` | |

### 7.2 Hover & motion

- **Row hover**：`bg-accent/3` (light) / `bg-accent/4` (dark)，`transition-colors duration-200`，标题色升级到 `text-neutral-10`
- **Chip hover**：bg→`accent/8`，text→`accent`
- **Featured hover**：title color 微变到 `text-accent`
- **入场动画**：
  - Hero：`BottomToUpSoftSpringTransitionView`
  - Featured：与 Hero 同 transition view，delay 60ms
  - Row & YearAnchor：复用 `timeline-fade-up` keyframe（0.4s ease-out）；`useEffect` 写 `--li-index` 到每个 li，`animation-delay: calc(min(var(--li-index), 20) * 50ms)`，cap 在 20 避免末尾入场拖沓

### 7.3 Container

- `NormalContainer`（`max-w-3xl`，~768px），单列，与 /timeline 一致
- 不使用 `WiderContainer`
- 移动端 viewport（≤640px）：hero 大数字降为 `text-[2.5rem]`；row meta 用 `flex-col sm:flex-row` 避免挤压

### 7.4 Accent gradient

`PageColorGradient` 在 page.tsx 顶层调用：

- Category：`<PageColorGradient seed={`category|${slug}`} />`
- Tag：`<PageColorGradient seed={`tag|${name}`} />`

带前缀避免 category 与 tag 同名 collision。`resolveAccentHue` 的 hash 算法既有，无需扩展。

## 8. i18n

5 locale：`en` / `zh` / `zh-TW` / `ja` / `ko`。文件位于 `apps/web/src/messages/<locale>/post.json` 与 `common.json`。

### 8.1 删除（在 `post.json`）

- `category_prefix`
- `category_count_prefix`
- `category_count_suffix`
- `tag_title`

`category_empty` 保留键名，文案重写。

### 8.2 新增（在 `post.json`）

| Key | en | zh | zh-TW | ja | ko |
| --- | --- | --- | --- | --- | --- |
| `category_label` | Category | 分类 | 分類 | カテゴリー | 분류 |
| `tag_label` | Tag | 标签 | 標籤 | タグ | 태그 |
| `category_subtitle_count_only` | `{count, plural, one {1 article} other {# articles}}` | `{count} 篇` | `{count} 篇` | `{count} 件` | `{count}편` |
| `category_subtitle_with_year` | `{count, plural, one {1 article} other {# articles}} · from {year}` | `{count} 篇 · 始于 {year} 年` | `{count} 篇 · 始於 {year} 年` | `{count} 件 · {year} 年から` | `{count}편 · {year}년부터` |
| `tag_subtitle_count_only` | `{count, plural, one {1 article} other {# articles}}` | `{count} 篇` | `{count} 篇` | `{count} 件` | `{count}편` |
| `tag_subtitle_with_cross` | `{count, plural, one {1 article} other {# articles}} · across {crossCategoryCount, plural, one {1 category} other {# categories}}` | `{count} 篇 · 散落在 {crossCategoryCount} 个分类` | `{count} 篇 · 散落在 {crossCategoryCount} 個分類` | `{count} 件 · {crossCategoryCount} つのカテゴリーから` | `{count}편 · {crossCategoryCount}개 분류에 걸쳐` |
| `category_pinned_label` | Pinned | 置顶 | 置頂 | ピン留め | 고정 |
| `category_sub_tags_label` | Tags in this category | 此分类下的标签 | 此分類下的標籤 | このカテゴリーのタグ | 이 분류의 태그 |
| `tag_cross_categories_label` | Appears in | 散见于 | 散見於 | 登場するカテゴリー | 등장하는 분류 |
| `category_empty` | Nothing here yet. | 尚无篇章。 | 尚無篇章。 | まだ記事はありません。 | 아직 글이 없어요. |

### 8.3 新增（在 `common.json`）

| Key | en | zh | zh-TW | ja | ko |
| --- | --- | --- | --- | --- | --- |
| `entries_count` | `{count, plural, one {1 entry} other {# entries}}` | `{count} 篇` | `{count} 篇` | `{count} 件` | `{count}편` |

`back_to_top` 已存在于 `common.json`，复用。

### 8.4 metadata title

`apps/web/src/app/[locale]/categories/[slug]/layout.tsx` 的 `generateMetadata` 改用：

```ts
title: `${data.name} · ${t('category_label')}`
```

`apps/web/src/app/[locale]/posts/tag/[name]/` 当前没有独立 layout 生成 metadata，新增 `generateMetadata` 输出 `${name} · ${t('tag_label')}`。

### 8.5 测试同步

`apps/web/src/messages/message-usage.test.ts` 当前包含 `category_prefix` / `tag_title` 等引用，需更新为新 key 集合。

## 9. Edge cases

| 场景 | 行为 |
| --- | --- |
| Category 0 children | Hero 显示 `0 篇`；不渲染 PinnedFeatureBlock / RowList / SubTagChips；居中渲染 `EmptyCategoryState`（`category_empty` + EmptyIcon + 微弱 accent-rule 装饰）；BackToTop 不显示 |
| Category 1 child & 无 pin | Hero `1 篇`（无 year 后缀）；无 featured；row 单条；无 YearAnchor；SubTagChips 仍按 tagsSum 渲染（>0 才显示）；BackToTop 显示 |
| Category 全部文章在同一年 | Hero subtitle 退化为 `category_subtitle_count_only`；YearAnchor 不渲染；rows 平铺 |
| Category 多个 pinned post | 取首位升级为 featured；其余以普通 row 出现（不做特殊标记） |
| Tag 路由不存在 | `findArticleWithTag` throw `CannotFindException` → Next.js 404 |
| Tag 1 篇 / 单 category | Hero 显示 `tag_subtitle_count_only`；无 YearAnchor；row 单条；不渲染 CategoryCrossChips（`M < 2`） |
| Tag 多年但仅一个 category | YearAnchor 渲染；row meta 仍展示来源分类；不渲染 CategoryCrossChips |
| Post `tags` 数组为空 | category row meta 退化为 `{月}月 {日}日`，不渲染 ` · #tag` 后缀 |
| Pinned post 无 summary | featured 渲染 title + meta，不渲染 summary 段（隐藏，不留空高度） |
| 移动端 row 极窄 | meta 用 `min-w-0` + `text-overflow: ellipsis`；title `line-clamp-2` |
| 暗色模式 | `PageColorGradient` 与 neutral tier 自动切；无单独 dark 分支 |
| `pin` 字段在老数据上不存在 | mx-core 返回 `undefined` → falsy → 不进入 PinnedFeatureBlock 分支 |
| `tagsSum` 字段缺失（mx-core 老版本） | 前端 `tagsSum ?? []`，SubTagChips 因 `>0` 守卫不渲染——优雅降级 |

## 10. 测试与验证

### 10.1 Type-level

- `pnpm --filter @yohaku/web type-check`
- `pnpm --filter @yohaku/design-system check`

### 10.2 Lint

- `pnpm --filter @yohaku/web lint`
- mx-core 仓内 `pnpm lint`

### 10.3 i18n 校验

- `apps/web/src/messages/message-usage.test.ts` 更新到新 key 集合后跑 `pnpm test`，确保 5 locale 全部对齐

### 10.4 手动 smoke

`pnpm --filter @yohaku/web dev`，浏览器实测：

1. 富 category（>10 文章 / 跨多年 / 含 pinned / 含多种 tags）
2. 瘦 category（1-2 文章 / 单年 / 无 pinned）
3. 空 category（0 children）
4. 富 tag（多年 / 跨多 category）
5. 单条 tag

每页验证：

- 顶部 accent gradient 注入（不同 slug 不同色）
- 大数字、subtitle、title 三段对齐
- YearAnchor 仅多年时出现
- PinnedFeatureBlock 仅有 pin 时出现
- SubTagChips / CategoryCrossChips 仅 ≥1 项时出现
- Row stagger 入场（前 20 条递进）
- Row hover 高亮 + accent 化
- 暗色模式整体观感
- 移动端 viewport（375px）布局不破

### 10.5 Backend smoke

mx-core 改完后 curl 验证：

- `GET /categories/<slug>` → children 含 summary/tags/pin/count，附 tagsSum
- `GET /categories/<tagname>?tag=true` → data 项含 summary/tags/pin/count
- `GET /categories/` → 不影响

跑 mx-core 现有 `category.service.spec` / `category.controller.spec` 确保不挂。

### 10.6 Cross-package version（api-client 发版）

`@mx-space/api-client` 位于 `mx-core/packages/api-client`，从 mx-core 仓发布到 npm；Yohaku 通过 npm 版本 pin（`apps/web/package.json` 当前 `^3.6.0`）消费。

实施流程：

1. 在 mx-core 仓内同步修改 backend 与 `packages/api-client` 类型
2. mx-core 仓内执行 `pnpm --filter @mx-space/api-client build`，跑相关 tests
3. 发布新版本到 npm（按 mx-core 既有 release 流程）
4. 回到 Yohaku，bump `apps/web/package.json` 的 `@mx-space/api-client` 版本到新 release
5. `pnpm install` → type-check 验证类型扩展可用

### 10.7 不做的事

- 不引入 e2e（playwright，项目无设施）
- 不写组件级单元测试
- 不做 visual regression（项目无 snapshot 设施）

## 11. 实施顺序

1. mx-core：扩 select、新增 `getCategoryTagsSum`、controller 附 tagsSum、修 `findArticleWithTag` mapping；跑现有 spec
2. api-client 类型升级；build/publish 或 workspace bump
3. apps/web：
   1. 抽 `BackToTop`；替换 `/timeline` 中的内联用法
   2. 新增 `components/modules/category/*`
   3. 重写两个 page.tsx
   4. 更新 5 locale 的 `post.json` / `common.json`，更新 `message-usage.test.ts`
4. 全量 type-check / lint / i18n test
5. dev server 跑五个手动用例

## 12. Open questions

无。所有视觉、数据、文案、降级策略已在本 spec 中固化。
