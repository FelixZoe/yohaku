export const longFormMarkdown = `# 余白之上：Markdown 渲染管线散记

写作系统之要，不在堆砌功能，而在**节奏**与*留白*。本文穿插 Yohaku Markdown 渲染器支持之全部语法，作长文场景之 ==整体校验==。

## 行内排版

粗体 **emphasis**、斜体 *italic*、删除线 ~~deprecated~~、插入 ++inserted++、行内代码 \`apiClient.get()\`，及行内公式 $e^{i\\pi} + 1 = 0$，皆应与正文基线相安。链接如 [innei.in](https://innei.in)，autolink 如 https://github.com/Innei/Yohaku，提及如 [Innei]{GH@Innei}。

> 引用块之内，文气稍敛；行间之空，亦是文章。

## 结构块

### 列表与任务

- 渲染管线
  - markdown-to-jsx compiler
  - overrides 与 extendsRules
- 样式契约
  - prose + .markdown 双层

1. 解析
2. 渲染
3. 校验

- [x] 表格样式对齐 lexical
- [ ] 长文回归校验

### 表格

| 渲染器 | 表头样式 | 单元格 |
| :--- | :---: | ---: |
| MTable | neutral-7 小字 | border-b 细线 |
| LexicalTableOverride | neutral-7 小字 | border-b 细线 |

### 代码

\`\`\`ts
const compile = (source: string) =>
  compiler(source, { wrapper: null, overrides })
\`\`\`

## 提示与横幅

> [!NOTE]
> GFM alert 之 note 形态。

::: warning
容器横幅之 warning 形态，内容亦走 Markdown。
:::

## 媒体

![山](https://picsum.photos/seed/sea/1200/600 "山间余白")

<LinkCard url="https://github.com/Innei/Yohaku" />

## 块级公式

$$
\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}
$$

## 折叠与剧透

<details>
<summary>实现细节</summary>

折叠内之 **Markdown** 同样生效。

</details>

剧透：||长文之末，仍是余白||。

---

文末脚注[^fin]。

[^fin]: 长文 showcase 至此而止。
`
