# mobile modal 类节点原生化（nested-doc sheet + mermaid Quick Look）

2026-08-11 · 状态：已批准 · 前置：同日 mobile-quicklook-image-preview spec（已落地）

## 背景与盘点

lexical 正文中会唤出浮层的节点共三类：

- **nested-doc**：唯一真 modal。web 走 `nestedDocPresentation: 'modal'`（`nestedDocExpandHolder` 弹站内 modal），mobile 现为 `'inline'` 降级——长嵌套文档展开时 `matchContents` 高度暴涨、整个 WebView reflow。
- **mermaid**：medium-zoom 页内放大。mobile 的 WebView 是 `scrollEnabled: false` + 全文高度,medium-zoom 的 fixed overlay 相对整个 WebView 定位，放大结果大概率跑出视口（疑似本来就坏）。
- **excalidraw**：内嵌 pan/zoom 控件，非 modal。但画布横向拖动会被 navigation controller 的返回手势抢走（用户实测 fallback 到 dismiss），本轮一并修。

## 已定决策

- nested-doc → **原生 formSheet**，内用池化 WebView 挂 `RichBody` 渲染嵌套内容。
- mermaid → 放大**并入 Quick Look 通道**（SVG data URL 走 `openImage`，原生解码落盘）。

## mermaid → Quick Look

- `HostCapabilities` 新增可选 `diagramPreview?: 'zoom' | 'openImage'`，缺省 `'zoom'`（web 行为零变化）。
- `portable/mermaid.tsx`：`'openImage'` 时不 attach medium-zoom，点击改调 `host.openImage({ images: [svgDataUrl], index: 0, src: svgDataUrl })`。
- mobile `createWebviewHost` 设 `diagramPreview: 'openImage'`。
- 原生 `QuickLookDomain`：item 构建时识别 `data:` scheme——base64/percent 解码同步落盘 caches（ext 取 data URL 的 mime），无需网络下载；QL 原生预览 SVG。若模拟器验证发现 QL 渲不动该 SVG，回退方案为 JS 侧 canvas 转 PNG data URL。
- JS 兜底调整：`src` 为 `data:` 时失败不再回落 in-app browser（吞掉错误），避免把 data URL 塞给 Safari VC。

## nested-doc → 原生 formSheet

- `createWebviewHost` 增加 `nestedDocPresentation` 参数；mobile 详情页传 `'modal'`。
- `rich-body.tsx` 新增可选 props：`onNestedDocExpand({ contentState, title }): Promise<void>`（Expo DOM async prop，contentState 为可序列化 SerializedEditorState，React content 字段不过桥）与 `nestedDocPresentation`（sheet 内实例传 `'inline'` 防止 sheet 套 sheet）。effect 里给包导出的 `nestedDocExpandHolder` 赋值，卸载时清空——与 web `LexicalContent` 同一机制、不同 runtime，无冲突。
- `ArticleBody` 持有 sheet 状态：RN `<Modal presentationStyle="pageSheet">`，头部 title + 关闭按钮（palette 配色），内容为第二个 `RichBody` 实例（`format: 'lexical'`、`content = JSON.stringify(contentState)`、`dom: { scrollEnabled: true }` 不用 matchContents，滚动交给 WebView 自身；池化领养保证挂载速度）。
- sheet 内 `onLinkPress`/`onImagePress` 复用外层 handler（QL 会从顶层 VC——即 sheet——present，正常）；`onScrollToAnchor` no-op。
- enrichments / fontFaces / theme / apiBase / webUrl 原样透传。

## excalidraw 手势锁（实现中追加）

- `rich-body.tsx`：容器 `pointerdown` 命中 `.group/excalidraw` 时经桥发 `{type:'yohaku:gesture-lock', locked:true}`，window `pointerup`/`pointercancel` 发 `locked:false`。
- `ArticleBody.handleMessage`：收到后 `navigation.setOptions({ gestureEnabled: !locked })`；组件卸载时恢复 `true` 兜底。
- 已知边界：锁经桥异步生效，触点若起于画布与系统边缘手势区的重叠窄条（画布左缘 ~15pt 内），边缘返回手势可能先行认领——画布主体内起手已验证不再触发返回。

## 验证

`tech/skill-first-blog-second-my-session-to-asset-pipeline` 同时含 mermaid 与 nested-doc 节点。矩阵：mermaid 点击 → QL 显示矢量图；nested-doc 点击 → sheet 弹出并渲染、下拉关闭；sheet 内点图 → QL；sheet 内嵌套 nested-doc 保持 inline 展开。web 侧跑 `rich-content` 既有测试 + `pnpm --filter @yohaku/rich-content check`（dist/rich.css 防漂移）。
