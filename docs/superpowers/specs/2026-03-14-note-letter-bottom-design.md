# Note Letter Bottom — 手帐便笺风「阅读全文」区域设计

## 概要

将 `NoteLatestRender` 组件底部的「阅读全文」链接区域，从单一居中链接改造为手帐便笺风格的装饰性区域，增强信纸/手帐质感。

## 当前状态

`apps/web/src/components/modules/note/NoteLatestRender.tsx` 底部：
- 正文以 `max-h-[calc(100vh-40rem)]` 截断，配渐隐遮罩
- 遮罩下方仅一个居中的 `text-accent` 链接

## 设计方案

### 视觉元素（自上而下）

1. **纸胶带（Washi Tape）**
   - 居中横跨，宽约 65%，微旋转 `-1.2deg`
   - 45° 斜纹条纹图案，使用 `repeating-linear-gradient(45deg, c1 0px, c1 4px, c2 4px, c2 8px)`，动态色值通过 inline `style` 注入（参考 `MobileTopicTag` 的 inline style 模式）
   - 边缘撕裂效果：水平方向左右渐隐，使用 `mask-image: linear-gradient(90deg, transparent 0%, black 5%, black 95%, transparent 100%)`，`-webkit-mask-image` 同值
   - 色彩策略：
     - 有 topic 时：取 `topicStringToHue(topic.name)` 生成 HSL 色，light 模式 `hsla(hue, 35%, 50%, 0.18/0.10)`，dark 模式 `hsla(hue, 35%, 50%, 0.14/0.07)`
     - 无 topic 时：回退暖灰 `rgba(170,160,140, 0.2)` / `rgba(170,160,140, 0.12)`

2. **手写体链接（居中）**
   - 字体：`Georgia, 'Noto Serif SC', serif`，`font-style: italic`
   - 字号 14px，`letter-spacing: 0.5px`
   - 色彩：light `#b07a4a`，dark `#d4a574`
   - Hover：`opacity: 0.7`，`transition: opacity 0.2s`
   - i18n 文案复用 `t('read_full_note')`，末尾 ` →`（Unicode `\u2192`）
   - `margin-top: 16px`（距纸胶带）

3. **圆形邮戳（右下角）**
   - 相对于 `LetterBottom` 容器绝对定位：`position: absolute`，`bottom: 10px`，`right: 20px`
   - 48×48px 圆形，1.5px 边框
   - 内文固定 "Letter Post"（Courier New, 7.5px, uppercase）
   - 微旋转 `-18deg`
   - 色彩：light 边框 `rgba(160,80,70, 0.22)` 文字 `rgba(160,80,70, 0.3)`，dark 边框 `rgba(180,110,100, 0.25)` 文字 `rgba(180,110,100, 0.3)`

4. **胶带碎片装饰（右下角）**
   - 52×14px 矩形，`rotate(4deg)`
   - 半透明：light `rgba(200,185,150, 0.25)`，dark `rgba(200,185,150, 0.1)`
   - 绝对定位于 `LetterBottom` 容器内：`bottom: 52px`，`right: 12px`

### 主题适配

| 元素 | Light | Dark |
|------|-------|------|
| 纸胶带条纹 | topic HSL, α 0.18/0.10 | topic HSL, α 0.14/0.07 |
| 手写链接色 | `#b07a4a` | `#d4a574` |
| 邮戳边框 | `rgba(160,80,70,0.22)` | `rgba(180,110,100,0.25)` |
| 邮戳文字 | `rgba(160,80,70,0.3)` | `rgba(180,110,100,0.3)` |
| 胶带碎片 | `rgba(200,185,150,0.25)` | `rgba(200,185,150,0.1)` |

### 无 topic 回退

纸胶带条纹色回退为暖灰中性色：`rgba(170,160,140, 0.2)` / `rgba(170,160,140, 0.12)`。其余元素不变。

### LetterBottom 容器

- `position: relative`（作为邮戳、胶带碎片的定位上下文）
- `padding-bottom: 48px`（为绝对定位的装饰元素留出空间）
- `margin-top: 4px`

## 修改范围

仅修改一个文件：

- `apps/web/src/components/modules/note/NoteLatestRender.tsx`
  - 替换底部 `<div className="mt-1 text-center">...</div>` 区块
  - 新增 `LetterBottom` 子组件（同文件内，或提取为独立文件视复杂度而定）
  - 利用已有 `topicStringToHue` 工具函数计算纸胶带色
  - `LetterBottom` 接收 `topicName?: string` 和 `href: string` 两个 props

## 实现约束

- 纯 CSS/Tailwind 实现，无额外依赖
- 所有装饰元素 `pointer-events-none`（除链接本身）
- 邮戳、胶带碎片为纯装饰，`aria-hidden="true"`
- 保持 Server Component（无 `'use client'`），topic 数据由 props 传入
- 响应式：`< sm`（640px）时隐藏邮戳与胶带碎片（`hidden sm:block`），纸胶带与手写链接保留
- Hover/focus：链接 hover 时 `opacity: 0.7`，保留 `transition`
