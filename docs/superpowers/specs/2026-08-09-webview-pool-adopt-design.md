# WebView 池化领养:详情页正文零白屏

2026-08-09 · 状态:MVP 已验证,待生产化

## 目标

详情页(post/note)正文由 `RichBody`('use dom' → WebView)渲染。现状:WebView 在页面挂载时才开始 boot,正文出现晚于 native 元素 1-3 秒。目标:**push 转场落定前正文已就位**(绝对零白屏)。

实测基线(dev,iPhone 17 Pro sim):冷启动 2689ms;池化领养后 **16-69ms**(19 次循环,含池闲置 330s、app 切后台 120s 场景),远小于 push 转场 ~350ms。

## 机制依据(expo SDK 57 源码事实)

1. `expo/src/dom/webview-wrapper.tsx`:props 更新通过 `injectJavaScript` 发 `$$props` 消息,**不 reload WebView**;`initialProps` 引用刻意保持稳定,防止 `injectedJavaScriptObject` 变化触发 reload。
2. `expo/src/dom/dom-entry.tsx`:webview 内根组件监听 `$$props` 并 `setProps` 重渲染。
3. `@expo/dom-webview/ios/DomWebView.swift`:`setupWebView()` 是唯一创建 `WKWebView` 的位置;`reload()` 先 `setupWebView()`(内部置 `needsResetupScripts=false`)再取 `scriptsChanged`,领养路径天然不触发二次 load(source URL 与已加载 URL 相等时跳过)。
4. `ExpoFabricView.shouldBeRecycled() == false`:unmount 必走 `deinit`,归还钩子安全。

已知缺陷(判别实验暴露):**`$$props` 注入一次性、无 ack、无重发**。共享 sim 上曾出现一次不可复现的注入丢失 → 永久白屏。生产设计必须加握手看门狗(见下)。

## 架构

```
启动: 补池器隐藏挂载 RichBody(空) → ready 信号 → 卸载 → deinit 归还池 [pool=1]
push: setupWebView() 查池命中 → 领养(attach+resetupScripts) → JS mount 发 $$props
      → 已启动 React 树重渲染新文章(<100ms) → 转场结束前正文就位
pop:  deinit 不销毁 → 注入 __yohakuReset 隐藏旧内容 → 归还池 [pool 回 1]
miss: (深堆栈/池空)走 stock 创建路径 = 现状行为 + 骨架渐显
```

## 组件设计

### 1. 原生 patch(`patches/@expo__dom-webview.patch`,已落地)

仅改 `ios/DomWebView.swift`,iOS only:

- `DomWebViewPool`(内嵌类):按 source URL 匹配,cap 2;持有期间自任 `navigationDelegate`,content process 终止即丢弃该实例
- `deinit`:webView 交池(main queue async),不再手动清 delegates(weak 自动置 nil,handler 由 give 清)
- `give()`:removeFromSuperview、清 delegates/handlers、注入 `window.__yohakuReset?.()`、offset 归零、入池
- `setupWebView()`:开头按 `source` 请求 URL 查池,命中则领养并跳过创建;共享尾段(delegates、scrollView 配置、`resetupScripts()`)对两条路径生效

维护约定:`@expo/dom-webview` 被 expo 锁 57.0.1;版本变动时 pnpm patch 显式报错,不会静默失效。patch 变更后必须 `pod install`(store 路径含 patch_hash)。

### 2. `rich-body.tsx`(webview 内,'use dom')

- `yohaku:rendered` 信号:effect 依赖 `[content, renderNonce]`,postMessage `{type, length, nonce}`(已落地 content 版;需补 nonce)
- `window.__yohakuReset` 注册:置 `document.body.style.visibility='hidden'`;`renderNonce` 变化的 effect 恢复可见 —— 覆盖「pop 后重进同一篇,content 字符串相同」的边角
- lexical 空串 guard:`content=''` 时不落到「网页中打开」兜底,渲染空白
- mount 时 postMessage `yohaku:ready`(补池器据此卸载)

### 3. `article-body.tsx`(native 侧)+ 注入看门狗

- 每次挂载生成唯一 `renderNonce` 透传
- **看门狗**:挂载起 600ms 内未收到匹配 nonce 的 `rendered` → bump `renderNonce`(marshalProps 变化触发 wrapper 重发 `$$props`,这就是重发机制);再 800ms 未收到 → 通过 DOM ref 调 `reload()` 兜底;仍失败 → 显示现有 openInWeb 兜底
- 骨架:`rendered` 到达前显示占位(pool miss 时可见 ~1-3s,命中时几乎无感),到达后正文淡入(动效走 `src/theme/motion.ts`,近临界阻尼,禁回弹)

### 4. 补池器 `webview-pool-warmer.tsx`(新,挂 app 根布局)

- splash 序列完成后延迟 ~2s,隐藏挂载 `<RichBody content="" …>`,dom 参数与真实用法完全一致(`matchContents`/`scrollEnabled` 同参,user scripts 在 boot 时烘焙)
- 收到 `yohaku:ready` 后延迟 ~500ms 卸载 → 实例入池
- v1 仅启动时补一次;pop/push 循环自持。深堆栈(文章内链推文章)第二层 miss 属可接受降级

## 数据前提

sync 引擎已预取最近 20 篇 post + 20 篇 note 正文入 SQLite(`prefetchBodies`),详情页数据同步可得;首次打开未预取文章仍有网络延迟,不在本设计范围。

## 错误处理

| 场景 | 行为 |
|---|---|
| 池 miss | stock 创建路径,与现状一致 + 骨架 |
| 池内进程被杀 | 池(delegate)收到回调即丢弃,下次 miss |
| `$$props` 注入丢失 | 看门狗:600ms 重发 → 800ms reload → openInWeb |
| 领养后旧内容残影 | give 时 `__yohakuReset` 隐藏 body,nonce 恢复 |
| 重进同一篇正文不显示 | 同内容重渲染不触发 body ResizeObserver,matchContents 高度停在 0;RichBody 在 rendered effect 里主动补发 `$$match_contents_event`,且 nonce 以时间戳起始保证每次挂载必触发 effect |
| 不支持的 lexical 节点 | 现有 sanitize 占位逻辑不变 |

## 测试

- vitest:lexical 空串 guard、看门狗状态机(纯逻辑抽出)
- dev-demos「WEBVIEW POOL」判别序列保留为手动回归台(自动多轮 + TIMEOUT 探针)
- 模拟器验收:冷启动首篇、pop 重进同篇(nonce 边角)、文章内链深堆栈、深浅色切换、切后台 2min 唤回后打开文章
- 原生日志:`log stream --level info` 过滤 `YohakuPool` 断言领养/归还/丢弃时序

## Known issues / 后续

- **首推屏顶部偏移(已修复,与本设计无关)**:真因是 Fabric 对 ScrollView 的 `contentInset` prop 首挂载生效、re-push 静默丢弃——`EdgeEffectScrollView` 的 -44 透明头补偿因此让屏幕按导航历史停在相差 44pt 的两个位置(原生实测:首推 inset=-44/adjusted=72/offset=-72,重推 inset=0/adjusted=116/offset=-116)。修复 = 删除补偿,统一静止在全头部净空。教训:Fabric `scrollTo` 绝对坐标且 clamp 于 0,负 offset JS 不可达;此类问题用原生 NSLog 探针拿真值,勿从截图倒推。

- dev HMR:池内休眠实例持有旧代码,dev-only,不处理
- **prod `www.bundle` 相对 URL 的池匹配等值性未验证**——生产化第一步必须用 release build 验证,不等值则 take() 按 URL 尾段匹配
- Android:无 android/ 目标,暂不做;patch 结构预留(池按 URL 泛化)
- 内存:常驻 +1 热 WKWebView(~30-60MB),可接受;上限 cap 2
