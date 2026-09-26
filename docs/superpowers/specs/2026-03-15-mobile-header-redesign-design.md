# Mobile Header 重设计 — 融合浮片

## Overview

重新设计移动端 Header 导航交互，从当前的底部抽屉（Vaul Drawer）改为「顶部展开融合浮片」——菜单从 header 下方展开，与 header 融合为一张书页浮片卡片。承接桌面端「書写·信纸·光影」设计语言。

## Design Decisions

| 维度 | 决定 |
|------|------|
| 交互模式 | 底部抽屉 → 顶部展开，header 与面板融合为一张浮片卡片 |
| 菜单布局 | 标签横排（chip-style），flex-wrap 自由换行 |
| 子菜单处理 | 分割标签：文字区点击直达，▾ 按钮展开子项（内联展开） |
| 展开动效 | slideDown translateY(-100%)→0，200ms |
| 图标过渡 | Hamburger ☰ 三线 → × 两线，自然旋转过渡 200ms |
| 背景遮罩 | 展开时页面内容加暗遮罩 bg-black/[0.06] |
| 关闭方式 | 点 × 按钮 / 点遮罩 / 导航跳转后自动关闭 |
| Dark mode | 跟随现有 token |
| 桌面端 | 不改（仅影响 mobile < 1024px，`useIsMobile()` hook） |
| 减弱动效 | `prefers-reduced-motion: reduce` 时禁用所有动画，直接显示/隐藏 |
| Vaul | 仅 header 不再使用，`PresentSheet` 通用组件保留（其他模块仍在用） |

## Architecture

### 不变的部分

- Header 三栏 Grid 布局（`grid-cols-[4.5rem_auto_4.5rem]`）
- HeaderDataConfigureProvider（动态菜单配置）
- 菜单配置结构（`config.ts` 中 `IHeaderMenu`）
- 桌面端 NavigationMenu（`ForDesktop` 组件）
- 滚动行为逻辑（`useMenuOpacity`、`useHeaderBgOpacity`）
- UserAuth 下拉
- AnimatedLogo

### 改动的部分

#### 1. HeaderDrawerButton → HeaderMobileMenu

替换 `PresentSheet`（Vaul 底部抽屉）为自定义顶部展开面板。仅 header 不再使用 PresentSheet，`vaul` 依赖保留（KaomojiPanel、CommentBlockGutter、AsideDonateButton 等仍在用）。

**触发器**：保留圆形按钮，内部图标改为 CSS 三线 hamburger（非 icon font），支持动画过渡。

#### 2. Hamburger ↔ Close 图标动画

三条 CSS 线条（`<span>`），通过 `transform` + `opacity` 过渡：

```
Open 过渡:
  Top line:    translateY(0) rotate(0)    → translateY(center) rotate(45deg)
  Middle line: opacity(1)                 → opacity(0)
  Bottom line: translateY(0) rotate(0)    → translateY(center) rotate(-45deg)

Duration: 200ms
Easing: cubic-bezier(0.22, 1, 0.36, 1)
```

#### 3. 融合浮片面板

展开时，header 区域 + 导航面板合并渲染为一张浮片卡片：

```tsx
// 展开态：header + panel 合为一体
<div className={clsxm(
  'mx-2 rounded-sm',
  'bg-[var(--color-root-bg)] dark:bg-neutral-900',
  'border border-[rgba(200,180,160,0.12)] dark:border-neutral-700/20',
  'shadow-[0_8px_32px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.02)]',
  'dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)]',
)}>
  {/* Header row: close button + logo + avatar */}
  {/* Navigation tags panel */}
</div>
```

#### 4. 导航标签

主导航项以标签/chip 形式横排，`flex-wrap` 自然换行：

```tsx
// 无子菜单的标签：直接链接
<Link href={path} className="px-2.5 py-1.5 text-sm border border-black/[0.04] rounded-[2px]">
  {title}
</Link>

// 有子菜单的分割标签
<div className="flex items-center border border-black/[0.04] rounded-[2px] overflow-hidden">
  <Link href={path} className="px-2.5 py-1.5 text-sm">
    {title}
  </Link>
  <button
    onClick={toggleSubMenu}
    className="px-2 py-1.5 border-l border-black/[0.06] bg-black/[0.015]"
  >
    {isExpanded ? '▴' : '▾'}
  </button>
</div>
```

活跃项样式（与桌面端一致）：
```
text-neutral-9 bg-white/55 dark:bg-white/[0.06]
shadow-[0_1px_3px_rgba(0,0,0,0.03)] rounded-[2px]
```

非活跃项：
```
text-neutral-7 hover:text-neutral-9
```

#### 5. 子菜单内联展开

点击 ▾ 按钮后，在标签行下方展开子项区域：

```tsx
// 展开区域
<div className="border-t border-black/[0.03] pt-2 mt-2">
  <div className="text-[9px] uppercase tracking-[2px] text-neutral-4 mb-1.5">
    {sectionTitle}
  </div>
  <div className="flex flex-wrap gap-1">
    {subItems.map(item => (
      <Link className="text-xs text-neutral-6 px-2 py-1 bg-black/[0.02] rounded-[2px]">
        {item.title}
      </Link>
    ))}
  </div>
</div>
```

子项展开动效：height reveal，150ms，同一 easing。

#### 6. 背景遮罩

面板展开时，在浮片卡片后方添加全屏遮罩：

```
Light: bg-black/[0.06]
Dark:  bg-black/[0.3]
Fade in: opacity 0→1, 150ms
```

点击遮罩关闭菜单。

#### 7. 展开动效（slideDown）

面板从 header 下方滑入：

```
translateY(-100%) → translateY(0)
opacity: 0 → 1
Duration: 200ms
Easing: cubic-bezier(0.22, 1, 0.36, 1)
```

关闭时反向。

#### 8. 无障碍与键盘交互

替换 Vaul 后需自行处理以下 a11y 职责：

- Hamburger 按钮：`aria-expanded={isOpen}`、`aria-controls="mobile-nav-panel"`、`aria-label` 随状态切换（"打开菜单" / "关闭菜单"）
- 面板容器：`id="mobile-nav-panel"`、`role="dialog"`
- **焦点管理**：展开时焦点移入面板第一个可聚焦元素；关闭时焦点回到 hamburger 按钮
- **Escape 键**：按 Escape 关闭面板
- **Body scroll lock**：展开时 `document.body.style.overflow = 'hidden'`，关闭时恢复

#### 9. prefers-reduced-motion

```css
@media (prefers-reduced-motion: reduce) {
  /* 所有动画跳过，直接显示/隐藏 */
  transition: none !important;
  animation: none !important;
}
```

Hamburger 图标、slideDown、overlay fade、子菜单 reveal 均受此约束。

#### 10. 特殊 path 处理

- `path: '#'`（More 菜单项）：文字区不渲染为 `<Link>`，改为 `<button>` 或 `<span>`，点击时直接展开子菜单（等效于点 ▾）
- 外部链接（如 Warp `https://travel.moe/...`）：渲染为 `<a target="_blank" rel="noopener">`
- `section.do` 回调：导航标签 onClick 中调用（与桌面端一致）
- `section.search` 参数：拼接到 href（与现有 HeaderDrawerContent 逻辑一致）

#### 11. 面板关闭机制

替换 `useSheetContext().dismiss()`，新建轻量 context：

```tsx
const MobileMenuContext = createContext({ close: () => {} })

// 导航标签内使用
const { close } = use(MobileMenuContext)
<Link href={path} onClick={close}>
```

路由跳转后自动关闭面板（通过 `usePathname()` 变化检测或 onClick 直接触发 close）。

## Styling

### 融合浮片卡片

| 元素 | Light | Dark |
|------|-------|------|
| 卡片背景 | `var(--color-root-bg)` (#fefefb) | `neutral-900` |
| 卡片 border | `rgba(200,180,160,0.12)` | `neutral-700/20` |
| 卡片阴影 | `0 8px 32px rgba(0,0,0,0.06)` | `0 8px 32px rgba(0,0,0,0.3)` |
| 卡片圆角 | `rounded-sm` (3px) | same |
| 卡片 margin | `mx-2` (8px) | same |
| Header/panel 分隔 | `border-b border-black/[0.03]` | `border-white/[0.03]` |

### 导航标签

| 元素 | Light | Dark |
|------|-------|------|
| 标签 border | `rgba(0,0,0,0.04)` | `rgba(255,255,255,0.06)` |
| 标签圆角 | `rounded-[2px]` | same |
| 分割线（▾ 分隔） | `border-l border-black/[0.06]` | `border-white/[0.06]` |
| ▾ 区域背景 | `bg-black/[0.015]` | `bg-white/[0.03]` |
| 活跃标签背景 | `bg-white/55` | `bg-white/[0.06]` |
| 活跃标签文字 | `neutral-9` | `neutral-9`（自动反转） |
| 展开态标签 | `bg-black/[0.02]` + `border-black/[0.08]` | `bg-white/[0.04]` + `border-white/[0.08]` |

### Hamburger 图标

| 属性 | 值 |
|------|------|
| 容器 | `size-10 rounded-full bg-neutral-1` |
| 线条宽度 | 14px |
| 线条高度 | 1.5px |
| 线条颜色 | `neutral-7`（#777） |
| 线条间距 | 4px（hamburger 态） |
| 线条圆角 | `rounded-full` |

### 遮罩

| 元素 | Light | Dark |
|------|-------|------|
| 遮罩色 | `bg-black/[0.06]` | `bg-black/[0.3]` |
| z-index | 浮片卡片 - 1 | same |

## Files to Modify

### 改动

- `apps/web/src/components/layout/header/internal/HeaderDrawerButton.tsx` — 替换 PresentSheet 为自定义面板，实现 hamburger ↔ × 动画
- `apps/web/src/components/layout/header/internal/HeaderDrawerContent.tsx` — 重写为标签横排布局 + 分割标签 + 内联子菜单
- `apps/web/src/components/layout/header/internal/HeaderActionButton.tsx` — 可能需要调整以支持 hamburger 线条子元素

### 不改动

- `Header.tsx` — 结构不变
- `HeaderContent.tsx` — 桌面端不变
- `HeaderArea.tsx` — 布局不变
- `config.ts` — 菜单配置不变
- `HeaderDataConfigureProvider.tsx` — 不变
- `hooks.ts` — 滚动逻辑不变
- `AnimatedLogo.tsx` — 不变
- `UserAuth.tsx` — 不变
- `nav-menu.css` — 不变
- `grid.css` — 不变

### 可能新增

- 无新文件（所有改动在现有文件中完成）

### 依赖

- `vaul` — 保留，`PresentSheet` 在 8+ 个其他模块中使用
- `motion/react` — 已有依赖，用于 hamburger 图标动画和面板过渡

## Out of Scope

- 桌面端 header 样式（已在前次 redesign 中完成）
- 导航菜单项增减
- Logo 样式改动
- 滚动行为逻辑调整
- 移动端底部 TabBar（不在计划中）
