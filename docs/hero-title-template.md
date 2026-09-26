# Hero Title Template 配置参考

`apps/web/src/app.config.d.ts` 中定义了 Hero 标题的模板类型。

## `TemplateItem`

```typescript
interface TemplateItem {
  type: string      // 渲染标签，如 'span' | 'code' | 'br' | 'h1' 等
  text?: string     // 文本内容（可选，用于装饰元素或换行）
  class?: string    // Tailwind CSS 类名（可选）
  style?: React.CSSProperties  // 内联样式（可选）
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `type` | `string` | 渲染时使用的 HTML 标签。特殊值 `br` 表示显式换行。 |
| `text` | `string` | 显示的文本内容。如果为空且提供了 `class` 或 `style`，则渲染为一个空标签（可用于装饰性光标等）。 |
| `class` | `string` | Tailwind CSS 类名。注意：JIT 模式下不安全的类名可能无法被扫描到，推荐使用 `style` 写关键样式。 |
| `style` | `React.CSSProperties` | 纯内联样式，无需依赖 Tailwind 扫描，且能自动跟随 CSS 变量（如 `var(--color-accent)`）适配暗色主题。 |

### 特殊 `type`

- **`br`**：插入一个 `<br />`，用于精确控制换行位置。
- **block 标签**（如 `h1`、`div`、`p`）：由于 Hero 标题外层已包裹在 `<h1>` 中，这些 block 标签在渲染时会被强制加上 `display: inline`，避免堆叠断行。

## 配置示例

```yaml
hero:
  title:
    template:
      - type: span
        text: "Hi, I'm "
        style:
          fontWeight: 300
          opacity: 0.85
      - type: span
        text: Innei
        style:
          fontWeight: 500
          color: var(--color-accent)
          letterSpacing: -0.02em
      - type: span
        text: ' 👋'
        style:
          display: inline-block
          transform: rotate(-8deg)
      - type: br
      - type: span
        text: 'A NodeJS Full Stack '
        style:
          fontWeight: 300
          opacity: 0.8
      - type: code
        text: '<Developer />'
        style:
          display: inline-block
          fontFamily: var(--font-mono)
          fontSize: 0.72em
          fontWeight: 500
          padding: 0.25em 0.55em
          borderRadius: 0.35em
          backgroundColor: 'color-mix(in srgb, var(--color-accent) 10%, transparent)'
          color: var(--color-accent)
          border: '1px solid color-mix(in srgb, var(--color-accent) 22%, transparent)'
      - type: span
        style:
          display: inline-block
          width: 2px
          height: 0.9em
          backgroundColor: var(--color-accent)
          marginLeft: 2px
          animation: 'blink 1.2s linear infinite'
  description: 'An independent developer coding with love.'
```

## 样式建议

- **颜色**：优先使用项目 CSS 变量，如 `var(--color-accent)`、`var(--color-neutral-5)`，以确保暗色主题自动适配。
- **字体**：等宽字体可用 `var(--font-mono)`，衬线字体可用 `var(--font-serif)`。
- **动画**：项目内置了 `blink` keyframe（1.2s 线性无限闪烁），可直接在 `style.animation` 中使用。
