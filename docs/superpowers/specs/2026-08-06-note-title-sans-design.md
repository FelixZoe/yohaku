# Note title 改用通用 sans

日期:2026-08-06
状态:已批准(方案 A)

## 背景

Note 的标题目前用 `font-serif`,与 post 详情页标题(默认 sans,`text-display-36 font-bold leading-tight`)不一致。决定将所有渲染 note title 的地方统一为默认 sans。

## 范围

全站排查后,note title 用 serif 的只有两个文件;其余位置(NoteTimeline、NoteListItemPaper、移动端底部导航、搜索结果)本来就是 sans,不动。首页 SectionHeading、skills 页等 serif 是栏目标题,不属于 note title,不在范围内。

## 改动

### 1. `apps/web/src/app/[locale]/notes/(note-detail)/[id]/pageExtra.tsx`

`NoteTitle` 组件的 h1(line 97),详情页、`/preview` 页、peek 预览三处复用,改一处全覆盖:

- 移除 `font-serif`
- 移除 `tracking-wider`(宽字距是配 serif 的排印处理,sans 粗体下显松散;去掉后与 post 详情页 h1 字距一致)
- 其余类(`mt-8 mb-3 text-balance text-left text-display-36 font-bold leading-tight text-neutral-9/95`)不变

### 2. `apps/web/src/components/modules/note/NoteLatestRender.tsx`

两个 h1 变体(line 81 封面 hero 版、line 92 信纸版):

- 各自移除 `font-serif`
- 保留 `tracking-tight`(sans 粗体标题下成立)
- 其余类不变

Meta 行、eyebrow、斜体链接等 serif 小字属于信纸氛围,不动。

## 验证

- 改动文件跑 ESLint
- 浏览器目测:note 详情页、/notes 最新一篇(有封面/无封面两种)、peek 预览标题为 sans,post 标题排版对齐
