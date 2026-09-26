# Header 重设计 — 书页浮片

## Overview

重新设计 Header 导航栏视觉风格，从当前的药丸形（`rounded-full` + 毛玻璃 + 聚光灯）改为「书页浮片」——方角微圆容器 + 竖线分隔 + 实底下拉，承接整站「書写·信纸·光影」视觉语言。仅改外观，不改功能结构和交互逻辑。

## Design Decisions

| 维度 | 决定 |
|------|------|
| 导航容器 | 药丸 → 方角浮片（`rounded-sm`），半透明白底，极细 border |
| 分隔方式 | 各导航项间 1px 渐变竖线（上下 transparent，中段 `rgba(0,0,0,0.06)`） |
| 活跃项指示 | 内浮层（白底 `rgba(255,255,255,0.55)` + 微阴影 `0 1px 3px rgba(0,0,0,0.03)`）+ 文字加深至 neutral-9（非 accent 色） |
| 聚光灯效果 | 移除（鼠标跟随 radial-gradient 不再使用） |
| 下拉菜单 | 实底（非毛玻璃）+ 微圆角（`rounded`）+ 纸质阴影（`0 8px 32px rgba(0,0,0,0.06)`）|
| 滚动行为 | 保持现有逻辑完全不变 |
| 跨语系 | flex 排布 + padding 间距，不依赖字宽一致性 |
| Dark mode | 跟随现有 token，无额外处理 |
| 移动端 | 不改（抽屉式 + DrawerButton 保持现有） |

## Architecture

### 不变的部分

- 组件结构（Header → HeaderDataConfigureProvider → MemoedHeader）
- Grid 三栏布局（`grid-cols-[4.5rem_auto_4.5rem]`）
- HeaderArea 三区域（Left/Logo/Center）
- NavigationMenu 功能（Base UI NavigationMenu，下拉内容、菜单配置）
- 滚动行为（`useHeaderBgOpacity`、`useMenuOpacity`、`useIsScrollUpAndPageIsOver`）
- 移动端抽屉（HeaderDrawerButton + PresentSheet）
- UserAuth 下拉
- AnimatedLogo + Activity

### 改动的部分

仅 CSS/className 变更：

#### 1. 导航容器（HeaderContent.tsx）

**Before:**
```tsx
<NavigationMenu.Root
  className={clsxm(
    'rounded-full',
    'bg-gradient-to-b from-neutral-50/70 to-neutral-50/90',
    'shadow-lg shadow-neutral-800/5 ring-1 ring-neutral-900/5 backdrop-blur-md',
    'dark:from-neutral-900/70 dark:to-neutral-800/90 dark:ring-neutral-100/10',
    'group [--spotlight-color:oklch(from_var(--color-accent)_l_c_h_/_0.12)]',
    // ...
  )}
>
```

**After:**
```tsx
<NavigationMenu.Root
  className={clsxm(
    'rounded-sm',
    'bg-white/[0.38] dark:bg-neutral-900/[0.38]',
    'border border-[rgba(200,180,160,0.08)] dark:border-neutral-700/20',
    // 无 shadow-lg，无 backdrop-blur（顶部透明态不需要）
    // 无 spotlight 相关 CSS 变量
    'pointer-events-auto duration-200',
    shouldHideNavBg && 'bg-none! border-transparent!',
  )}
>
```

#### 2. 聚光灯移除（HeaderContent.tsx）

删除以下代码：
- `useMotionValue` (mouseX, radius)
- `useMotionTemplate` (spotlight background)
- `onMouseMove` / `onMouseEnter` / `onMouseLeave` 事件处理
- spotlight `<m.div>` 元素

#### 3. 竖线分隔

在各 `NavigationMenu.Item` 之间插入分隔元素：

```tsx
const NavSeparator = () => (
  <div className="h-3.5 w-px shrink-0 bg-gradient-to-b from-transparent via-black/[0.06] to-transparent dark:via-white/[0.06]" />
)
```

#### 4. 活跃项样式

**重要变更：活跃项不再使用 accent 色。** 现有代码中 `isActive` 时文字色为 `text-accent`，需改为 neutral 深色。

当前页面对应的导航项添加活跃样式（Tailwind 类）：

```tsx
// 活跃态 className
const activeItemClass = clsxm(
  'text-neutral-9',                        // 文字加深至 neutral-9（非 accent）
  'bg-white/55 dark:bg-white/[0.06]',
  'shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.1)]',
  'rounded-[2px]',
  'm-0.5',                                 // 2px margin
)

// 非活跃态
const inactiveItemClass = 'text-neutral-7 hover:text-neutral-9 dark:hover:text-neutral-9'
```

需在 `HeaderContent.tsx` 中根据当前路由匹配活跃项。现有代码已有 `NavigationMenu.Item` 的路由匹配逻辑（`isActive` 判断），将 `text-accent` 替换为上述 className。

#### 5. 下拉菜单（HeaderContent.tsx）

**Before:**
```tsx
className={clsxm(
  'rounded-2xl bg-neutral-50/60 dark:bg-neutral-900/60',
  'border border-neutral-900/5 shadow-lg shadow-neutral-800/5 backdrop-blur-md',
  'dark:border-neutral-100/10',
)}
```

**After:**
```tsx
className={clsxm(
  'rounded bg-[var(--color-root-bg)] dark:bg-neutral-900',
  'border border-[rgba(200,180,160,0.08)] dark:border-neutral-700/20',
  'shadow-[0_8px_32px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.02)]',
  'dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)]',
  // 无 backdrop-blur（实底）
  // bg-[var(--color-root-bg)] = #fefefb (light) / rgb(28,28,30) (dark)
)}
```

下拉内 hover 态：
```css
/* Before: accent 色底 */
/* After: 中性灰底 */
.dd-item:hover {
  background: rgba(0, 0, 0, 0.02);       /* light */
}
:where(.dark) .dd-item:hover {
  background: rgba(255, 255, 255, 0.04);  /* dark */
}
```

#### 6. nav-menu.css 动画

保持现有进出动画（scale + translateY），仅确保圆角值与新样式一致。无需改动 timing/easing。

#### 7. HeaderActionButton.tsx

移动端菜单按钮和用户头像按钮的 `rounded-full` 保持不变——这些是圆形按钮，与浮片容器风格无关。

## Styling

### 导航容器（Desktop）

```css
/* 顶部态（页面顶部，背景透明） */
.nav-container {
  display: inline-flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.38);
  border: 1px solid rgba(200, 180, 160, 0.08);
  border-radius: 3px;                      /* rounded-sm */
  padding: 0 2px;
}
```

### 滚动态

滚动行为逻辑完全不变（`useHeaderBgOpacity`、`shouldHideNavBg` 等保持现有代码）。视觉上的变化：

- **页面顶部（y < 197px）**：浮片可见，半透明白底（`bg-white/[0.38]`），无 backdrop-blur
- **shouldHideNavBg = true 时**：浮片背景和 border 隐藏（`bg-none! border-transparent!`），与现有药丸逻辑一致
- **向上回滚浮现时**：浮片重新出现，此时加 backdrop-blur 增强可读性

```css
/* 滚动后重新浮现态 */
.nav-container-floating {
  background: rgba(250, 250, 250, 0.78);
  backdrop-filter: blur(16px);
  border-color: rgba(0, 0, 0, 0.05);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
}

/* Dark */
:where(.dark) .nav-container-floating {
  background: rgba(23, 23, 23, 0.78);
  border-color: rgba(255, 255, 255, 0.05);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
}
```

实现方式：现有 `shouldHideNavBg` 条件已控制 `bg-none`。当 `shouldHideNavBg = false` 且 `headerBgOpacity > 0` 时，切换至浮现态样式。这与现有逻辑完全对齐，仅改 class 值。

### 竖线分隔

```css
.nav-separator {
  width: 1px;
  height: 14px;
  flex-shrink: 0;
  background: linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.06), transparent);
}

:where(.dark) .nav-separator {
  background: linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.06), transparent);
}
```

### Dark Mode

跟随现有 token，具体映射：

| 元素 | Light | Dark |
|------|-------|------|
| 容器背景 | `rgba(255,255,255,0.38)` | `rgba(var(--neutral-900),0.38)` |
| 容器 border | `rgba(200,180,160,0.08)` | `neutral-700/20` |
| 活跃项背景 | `rgba(255,255,255,0.55)` | `rgba(255,255,255,0.06)` |
| 活跃项文字 | `neutral-9` (#27272a) | `neutral-9` (#f4f4f5, 已反转) |
| 下拉背景 | `var(--color-root-bg)` (#fefefb) | `neutral-900` |
| 下拉阴影 | `rgba(0,0,0,0.06)` | `rgba(0,0,0,0.3)` |
| 下拉 hover | `rgba(0,0,0,0.02)` | `rgba(255,255,255,0.04)` |

## Files to Modify

### Shiroi (frontend)

- `apps/web/src/components/layout/header/internal/HeaderContent.tsx` — 导航容器样式 + 移除聚光灯 + 插入竖线分隔 + 下拉菜单样式 + 活跃项样式
- `apps/web/src/components/layout/header/internal/nav-menu.css` — 确认圆角值一致（可能无需改动）

### 不改动

- `Header.tsx` — 结构不变
- `HeaderArea.tsx` — 布局不变
- `AnimatedLogo.tsx` — 不变
- `HeaderDrawerButton.tsx` / `HeaderDrawerContent.tsx` — 移动端不变
- `UserAuth.tsx` — 不变
- `HeaderActionButton.tsx` — 圆形按钮保持
- `grid.css` — Grid 布局不变
- `internal/hooks.ts` — 滚动逻辑不变
- `config.ts` — 菜单配置不变

## Out of Scope

- 移动端抽屉样式改动
- 导航菜单项增减
- 下拉菜单内容/结构调整
- Logo 样式改动
- 滚动行为逻辑调整
- 新增动画效果
