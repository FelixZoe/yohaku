export interface SyntaxCase {
  category: 'builtin' | 'media' | 'callout' | 'rich-block' | 'interactive'
  description: string
  key: string
  label: string
  source: string
}

export const syntaxCases: SyntaxCase[] = [
  {
    category: 'builtin',
    description: '行内排版：粗 / 斜 / 删 / 插入 ++ / 标记 == / inline code',
    key: 'inline-format',
    label: 'Inline 格式',
    source: `**粗** · *斜* · ~~删~~ · ++插入++ · ==标记== · \`inline-code\``,
  },
  {
    category: 'builtin',
    description: '普通链接 / autolink / mention（{GH@name}）',
    key: 'link',
    label: 'Link & Mention',
    source: `普通链接：[innei.in](https://innei.in)；autolink：https://github.com/Innei/Yohaku

提及：[Innei]{GH@Innei}`,
  },
  {
    category: 'builtin',
    description: 'h1 至 h3',
    key: 'headings',
    label: 'Headings',
    source: `# 一级标题

## 二级标题

### 三级标题`,
  },
  {
    category: 'builtin',
    description: '普通 blockquote（GFM alert 见 Callouts）',
    key: 'quote',
    label: 'Quote',
    source: `> 余白者，纸上未着墨处也。
> 行间之空，亦是文章。`,
  },
  {
    category: 'builtin',
    description: '无序 / 有序 / 嵌套 / task list',
    key: 'list',
    label: 'List',
    source: `- 无序项一
- 无序项二
  - 嵌套子项

1. 有序项一
2. 有序项二

- [x] 已完成任务
- [ ] 未完成任务`,
  },
  {
    category: 'builtin',
    description: '对齐列 GFM 表格，校 MTable 与 lexical TableRenderer 同式',
    key: 'table',
    label: 'Table',
    source: `| 键 | 作用 |
| :--- | :--- |
| \`NSZoomButtonMenuOption\` | 总开关, 置0禁用悬停菜单 |
| \`NSZoomButtonMenuHoverTimeout\` | 悬停多久弹出 |
| \`NSZoomButtonDragHandoffTimeout\` | 按住拖离按钮的交接延时 |
| \`NSZoomButtonMenuOutOfProcess\` | 切换进程外与进程内渲染 |
| \`NSZoomButtonServiceWarmUpDelay\` | XPC 服务预热时机 |`,
  },
  {
    category: 'builtin',
    description: 'details / summary 折叠块',
    key: 'details',
    label: 'Details',
    source: `<details>
<summary>展开查看</summary>

折叠之内容，亦走 Markdown 渲染：**粗体**与 \`code\` 皆可。

</details>`,
  },
  {
    category: 'builtin',
    description: 'hr / 脚注 / 行内 KaTeX',
    key: 'misc-builtin',
    label: 'Misc',
    source: `分割线之上，行内公式 $E = mc^2$，并一脚注[^1]。

---

分割线之下。

[^1]: 此乃脚注内容。`,
  },
  {
    category: 'media',
    description: 'MarkdownImage 单图渲染',
    key: 'image',
    label: 'Image',
    source: `![海](https://picsum.photos/seed/sea/1200/600 "海上余白")`,
  },
  {
    category: 'media',
    description: '::: gallery 容器，聚多图为画廊',
    key: 'gallery',
    label: 'Gallery',
    source: `::: gallery
![一](https://picsum.photos/seed/grid-1/600/400)
![二](https://picsum.photos/seed/grid-2/600/400)
![三](https://picsum.photos/seed/grid-3/600/400)
![四](https://picsum.photos/seed/grid-4/600/400)
:::
`,
  },
  {
    category: 'media',
    description: '::: grid {cols=3,type=images} 网格图阵',
    key: 'grid-images',
    label: 'Grid images',
    source: `::: grid {cols=3,gap=8,type=images}
![一](https://picsum.photos/seed/carousel-1/800/400)
![二](https://picsum.photos/seed/carousel-2/800/400)
![三](https://picsum.photos/seed/carousel-3/800/400)
:::
`,
  },
  {
    category: 'media',
    description: '<video> 经 VideoPlayer 渲染',
    key: 'video',
    label: 'Video',
    source: `<video src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" />`,
  },
  {
    category: 'media',
    description: '<LinkCard> 走 enrichment map（dev 页注入 mock）',
    key: 'link-card',
    label: 'Link card',
    source: `<LinkCard url="https://github.com/Innei/Shiro" />

<LinkCard url="https://github.com/Innei/haklex" />`,
  },
  {
    category: 'callout',
    description:
      'GFM alert 语法（> [!NOTE] 等），rich-alert UI 与 lexical 同式',
    key: 'gfm-alerts',
    label: 'GFM alerts',
    source: `> [!NOTE]
> 此乃 note 提示。

> [!TIP]
> 此乃 tip 提示。

> [!IMPORTANT]
> 此乃 important 提示。

> [!WARNING]
> 此乃 warning 提示。

> [!CAUTION]
> 此乃 caution 提示。`,
  },
  {
    category: 'callout',
    description:
      '::: 容器横幅（warning / error / info / success），rich-banner UI 与 lexical 同式',
    key: 'container-banners',
    label: 'Container banners',
    source: `::: info
info 横幅，内容亦走 Markdown：**强调**可也。
:::

::: warning
warning 横幅。
:::

::: error
error 横幅。
:::

::: success
success 横幅。
:::
`,
  },
  {
    category: 'rich-block',
    description: 'Shiki 高亮代码块',
    key: 'code-block',
    label: 'Code block',
    source: `\`\`\`ts
interface SyntaxCase {
  key: string
  label: string
}

const greet = (name: string) => \`Hello, \${name}\`
\`\`\``,
  },
  {
    category: 'rich-block',
    description: '$$ 块级 KaTeX',
    key: 'katex-block',
    label: 'KaTeX block',
    source: `$$
\\int_0^1 x^2 \\, dx = \\frac{1}{3}
$$
`,
  },
  {
    category: 'rich-block',
    description: 'mermaid 代码块渲染为流程图',
    key: 'mermaid',
    label: 'Mermaid',
    source: `\`\`\`mermaid
flowchart LR
  Markdown --> Compiler --> React
  React --> Page
\`\`\``,
  },
  {
    category: 'interactive',
    description: '<Tabs> / <tab label> 选项卡，面板内容走 Markdown',
    key: 'tabs',
    label: 'Tabs',
    source: `<Tabs>
<tab label="其一">

第一面板，**Markdown** 内容。

</tab>
<tab label="其二">

第二面板，亦有 \`code\`。

</tab>
</Tabs>`,
  },
  {
    category: 'interactive',
    description: '||spoiler|| 遮罩，hover 显形',
    key: 'spoiler',
    label: 'Spoiler',
    source: `剧透在此：||凶手即叙述者本人||。`,
  },
]
