# mobile 图片预览 Quick Look 化

2026-08-11 · 状态：已批准

## 背景

mobile 详情页正文里点击图片，目前 `apps/mobile/src/screens/details/article-body.tsx` 的 `onImagePress` 只是占位实现：`WebBrowser.openBrowserAsync(src)` 在应用内浏览器打开图片 URL。包侧链路已就绪——`@yohaku/rich-content` 的 `openImage` payload 为 `{ images: string[], index, src }`（全文图片列表 + 当前索引），经 Expo DOM async prop 桥抛到原生侧，本次只动原生消费端。

约束：app 为 iOS-only（`app.json` `platforms: ["ios"]`，deployment target 18.0）；`QLPreviewController` 只接受本地文件 URL，远程图必须先落盘。

## 已定决策

- **多图·渐进加载**：先让点击的那张可看，其余后台补齐后刷新，支持左右翻页。
- **下载编排在原生 Swift 侧**：JS 只调一次 `presentQuickLook({ urls, index })`，URLSession 下载、占位、刷新全部在原生闭环，不新增 JS 依赖。
- **扩展本地 `modules/yohaku`**，不用社区 expo-quick-look（其单文件 `previewAsync` API 做不了占位 item + `reloadData` 渐进刷新）。

## JS 侧

- `modules/yohaku/index.ts`：接口新增 `presentQuickLook(payload: { urls: string[]; index: number }): Promise<void>`。
- `article-body.tsx` 的 `onImagePress`：调 `presentQuickLook`，reject 时回落现状 `WebBrowser.openBrowserAsync(src)` 兜底。
- `rich-content` 包、`rich-body.tsx`/`webview-host.ts` 桥、`webview-pool-lab`/`pool-warmer` 的空实现：零改动。

## 原生侧（`modules/yohaku/ios/QuickLook/QuickLookDomain.swift`）

- `YohakuModule` 新增 `AsyncFunction("presentQuickLook").runOnQueue(.main)`，从顶层 VC present `QLPreviewController`，`currentPreviewItemIndex = index`。
- **占位不能用 nil**：iOS 11+ `previewItemURL` 返回 nil 不再显示 loading 态（openradar #21074），会呈现"无法预览"空白。初始 URL 指向程序生成的占位图（`UIGraphicsImageRenderer` 画灰底 loading 图，写入 caches 一次、后续复用）。
- item 为 `NSObject + QLPreviewItem`，`previewItemURL` 可变，`previewItemTitle` = URL lastPathComponent。
- 下载：`URLSession` 并发上限 4；优先当前 index，再从其向两侧扩散；落盘 `caches/QuickLookImages/<sha256(url)>.<ext>`；文件已存在直接复用（缓存天然跨次打开生效，OS 自动清理 caches）。
- 单张完成：item URL 切到本地文件；当前可见项 `refreshCurrentPreviewItem()`，非可见项 `reloadData()`。
- dismiss 时取消未完成下载；单张失败重试 1 次，仍失败保持占位；同一时刻只允许一个 QL 实例（重复调用直接 resolve 忽略）。
- `YohakuKit.podspec` 的 `source_files = '**/*.{h,m,swift}'` glob 已覆盖新目录；需 `pod install` 重建 dev client。

## 风险与实现顺序

QL 渐进刷新在 iOS 版本间行为有反复（论坛有下载中刷新导致 freeze 的案例），因此实现第一步先做 spike：最小数据源验证"占位 → 切 URL → refresh/reload"时序在模拟器上无空白、无卡死，通过后再接完整下载编排。

## 验证

`expo run:ios` 模拟器 + 线上真文章，覆盖：单图文章、多图笔记、断网打开、下载中 dismiss、快速重复点击。原生侧无单测基建，以手动矩阵为准；JS 侧仅 handler 一处改动，不新增测试。
