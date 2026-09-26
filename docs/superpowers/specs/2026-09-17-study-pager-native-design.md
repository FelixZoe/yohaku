# mobile 书房 pager — 原生分页与两页灵动岛头像

2026-09-17 · 状态：已批准（brainstorming）

## 背景

`feat(mobile): page Study between owner and account` 把书房和账户做成横向两页。RN `ScrollView` 横向分页按最高子页定高度，账户列表把第一页撑高，底下全是空白。站长登录时 `showReaderHero` 不画第二页身份区，所以没有头像。

本 spec 取代 [2026-08-25-mobile-study-tab-design.md](2026-08-25-mobile-study-tab-design.md) 里「两层路由 / 站长跳过肖像」的形态：仍是同一格书房，改成原生横向两页；第二页站长也用与第一页相同的灵动岛头像。登录、活动、合规行仍以 [2026-08-15-mobile-me-tab-design.md](2026-08-15-mobile-me-tab-design.md) 为准。

## 已定决策

- **分页**：`@modules/yohaku` 新增 `YohakuPager`。系统 `UIScrollView` + `isPagingEnabled`。不加 `react-native-pager-view`，不用 `UIPageViewController`。
- **高度**：pager 的 `contentSize.height` 永远等于自身 `bounds.height`。每一页 frame 等于 pager bounds。第一页不再被第二页内容撑高。
- **第一页视觉**：不改 hero 层次、书桌、统计。只修被撑高。
- **第二页身份**：站长也画 ProfileHero。大头像 + 同一套滚进灵动岛。无「账户」大标题——肖像就是标题。
- **图源**：第二页 `session.image`，没有就用 `owner.avatarUrl`。都没有则现有 `person.crop.circle` 占位，不挂 `SettingsAvatar`。
- **两颗头像**：只有当前页的 `SettingsAvatar` 把 compositor 挂到窗口。换页在 `onPageSelected` 交接，滑动中途不抢岛。

## YohakuPager

ExpoView，孩子是两页 RN 视图（书房、账户）。

```ts
type YohakuPagerProps = ViewProps & {
  page?: number
  onPageScroll?: (event: NativeSyntheticEvent<{ progress: number }>) => void
  onPageSelected?: (event: NativeSyntheticEvent<{ page: number }>) => void
}
```

- `progress`：`contentOffset.x / bounds.width`，夹在 `0 … n-1`。现有点指示器继续跟手。
- `page`：受控。指示器无障碍 increment/decrement 仍走 `selectPage` → 设 `page`。
- `bounces = false`，`showsHorizontalScrollIndicator = false`。
- Fabric：`mountChildComponentView` 把孩子放进 pager 的 scroll，而不是叠在 ExpoView 上。`layoutSubviews` 按当前 bounds 重排每一页。
- 宽度为 0 时不排版。`page` 越界夹到合法页。
- 不引入新 npm 依赖。JS 从 `@modules/yohaku` 导出，登记在 `YohakuModule`。

`StudyScreen` 用 `YohakuPager` 替换横向 `Animated.ScrollView`。每一页根视图 `flex: 1`，内部仍是各自的 `EdgeEffectScrollView`。`accessibilityElementsHidden` 仍按当前页。

## SettingsAvatar `active`

```ts
type SettingsAvatarProps = ViewProps & {
  active?: boolean
  collapseDistance?: number
  imageUri: string
  ringColor?: string
}
```

- `active` 默认 `true`（单头像页面行为不变）。
- `active === false`：卸掉窗口 compositor 和灵动岛 cover，头像只留在格子里，不跟滚动缩岛。
- `active` 变为 `true`：挂 compositor，按当前竖向 offset 更新。
- 认竖向滚动：跳过 pager 那条 `isPagingEnabled` 的横向 `UIScrollView`，跟最近的非 paging 祖先（页内 `EdgeEffectScrollView`）。

`StudyScreen` 把 `active={activePage === 0|1}` 传到两页头像。

## 第二页 hero

删除「站长跳过肖像」。去掉 `showReaderHero`，第二页一律渲染 `ProfileHero`（站长、读者、未登录）。

- 有图：`SettingsAvatar`，`collapseDistance` 与第一页相同（120），`active` 仅当前页为 true。
- 无图：现有环形占位。
- 未登录：占位 + 登录按钮，行为不变。
- 点指示器仍在 hero 下方。

抽出 `accountAvatarUri(session, owner)`：`session?.image` → `owner?.avatarUrl` → `null`。第一页继续只用 `owner.avatarUrl`。

## 测试

- `accountAvatarUri`：session 图、回落到 owner、都没有。
- 去掉 `showReaderHero` 及其「owner 藏肖像」测试；`guest-card.ts` 只留 tab 读屏 helper。
- 不在本 spec 加 UI 快照。Swift pager 的高度锁在实现里用 frame 断言或手工真机：第一页滚到底不应出现「被第二页列表撑出的空白」。

## 明确不做

- 不改第一页信息层次（名字 / 统计 / 社交）。
- 不把第二页收成紧凑身份条。
- 不把会员、票根、设置行挪页。
- 不改 Tab 图标（永远站长头像）。
