# WebView 宿主自有化:预热、点击注入、单次渲染

2026-08-12 · 状态:设计已确认,待实现

## 目标

**把正文内容的注入从挂载路径挪到点击那一刻**,并让这条链路完全自有可控。手段是把 `@expo/dom-webview` 收归 workspace(去掉 patch),在自己的包里做四件事:池自维持、点击 prime、领养即报高度、正文只渲染一次。

`use dom` 的 babel 改写、web bundle、props marshal、native action RPC 仍全部由 expo 负责——**不接手 web bundler**。

## 实测基线

2026-08-12,dev,iPhone 17 Pro 模拟器,同一篇文章八轮 pop→push:

| 指标 | 值 |
|---|---|
| tap→mount | 32-36ms(八次,几乎不动) |
| mount→rendered(健康) | 114-134ms |
| mount→rendered(丢注入被看门狗救) | 219-253ms,**3/8** |
| 池未命中(冷启动)props 首达 | ~1993ms |
| push 转场 | ~350ms |

**明确预期:本设计不会带来肉眼可见的提速。** 健康路径 tap→rendered 从 ~150ms 压到 ~70ms,而转场有 350ms,模拟器上看不出差别。收益是三条:①确定性(消除 3/8 的 250ms 抖动);②高度在挂载时已知(去掉预留高度的启发式);③深堆栈不再 1.5s。真机若整体慢一倍,①会显性化。

## 机制依据(expo SDK 57 源码事实)

1. `expo/src/dom/webview/ExpoDOMWebView.ts` 全文九行:`try { module = require('@expo/dom-webview').WebView } catch {}`。按**包名** require 且带 try/catch —— 换包即接管,无需 patch。
2. `webview-wrapper.tsx` 的 `resolveWebView()` 只在 `@expo/dom-webview` / `react-native-webview` 之间二选一,**没有自定义实现的注入点** —— 只能换包,不能挂钩。
3. `@expo/dom-webview` 是 `expo` 的**硬 `dependency`(`~57.0.1`)**,同时才是 optional peer。**同名 workspace 包遮蔽不住**,必须走 overrides。
4. 包 `main` 指向 `src/index.ts`(TS 源码),Metro 直接消费,**无构建产物** → vendor 等于拷文件。
5. expo 下发 props 走 `webviewRef.current.injectJavaScript(...)`,该方法属于本包 → 队列与重放都能在本包内实现。

## 架构

```
babel use-dom 代理
  └─ expo RawWebView(marshal / $$props / $$native_action)      ← expo 所有
       └─ @expo/dom-webview WebView                            ← 本仓所有
            ├─ 实例池(预热 / 回填 / 按 prime key 优选)
            ├─ prime 通道(点击注入,内容主路径)
            └─ 注入队列(expo props 兜底,次要通道)
```

三条通道的分工——**关键变化是 expo 的 `$$props` 不再位于正文的关键路径上**:

| 通道 | 送什么 | 时机 | 丢了会怎样 |
|---|---|---|---|
| prime(我们的) | content / enrichments | 点击 | 退化成今天:挂载后由 `$$props` 渲染 |
| `$$props`(expo) | theme / locale / labels / 回调名 | 挂载 | 队列重放兜底 |
| `initialProps`(expo) | 冷启动全量 | 随页面加载 | 不适用 |

## 组件设计

### A. `packages/dom-webview`(前提)

- vendor `@expo/dom-webview@57.0.1` 加现有 patch 的产物,包名保持 `@expo/dom-webview`
- **删除 `android/` 与 `local-maven-repo/`**,`expo-module.config.json` 的 `platforms` 收为 `["apple"]`。依据 `apps/mobile/AGENTS.md`:Android 永不开发
- `pnpm-workspace.yaml`:增 `overrides: { '@expo/dom-webview': link:./packages/dom-webview }`,删除 `patchedDependencies` 中的该条
- **自证不可省**:原生 module 暴露 `vendor: "yohaku"` 常量,`__DEV__` 启动断言,不匹配即抛错。理由见机制依据 3——解析失败是静默的,没有断言就会以为改动生效而实际跑着上游副本

### B. 池自维持

`take()` 成功后,若池内实例数低于目标(1),在后台启动一个新实例回池。目标是消除深堆栈(文章内链再进文章)第二层的冷启动。上限仍为 2。

### C. 点击注入(本次主目标)

- 原生模块暴露 `prime(url, key, payload)`:池内按 url 找一个未 prime 的实例 → 记下 `key` → `evaluateJavaScript("window.__yohakuPrime(<payload>)")`
- DOM 侧 `rich-body.tsx` 注册 `window.__yohakuPrime`,写入 module 级 external store,React 订阅后立即渲染
- **池在自己这层注册消息处理器**,记录该实例上报的 `height` 与 `renderedKey`——pooled 期间 expo 的 handler 不在,没有这层就收不到 prime 的完成信号
- `setupWebView()` 领养时**优先挑 `key` 匹配的实例**,领养后立刻回放两条记录:`$$match_contents_event`(高度)**与 `yohaku:rendered`**
- **两条必须一起回放。** `settled` 只由 `yohaku:rendered` 触发,只回放高度的话 opacity 停在 0、骨架照出、看门狗照样开火,C 等于白做。若改为依赖挂载时 expo 的 `$$props` 触发 D 的"重报",正文就绪信号就又绕回那条 3/8 会丢的通道,与"把 `$$props` 移出关键路径"直接冲突
- 高度经回放已知时,`ArticleBody` **不施加 `useReservedBodyHeight` 的 `minHeight` 地板**;地板只在高度未知(冷启动、prime 落空)时生效。否则真实高度小于地板时首屏仍是地板值
- 调用点:`posts-list.tsx` / `notes-list.tsx` 的 `onPress`。内容已在手——列表查询是 `db.select().from(posts)`,整行含 `content` 与 `enrichments`

### D. 单次渲染(以 prime 为准)

内容会经两条路各到达一次,第二份到达时按**值**比对,相等就不重渲染正文:

- 正文渲染 effect 的依赖从 `[content, renderNonce]` 收窄为 `[content]`
- `renderNonce` 变化只触发**重报**(`rendered` + 高度 + anchors),不重渲染。它今天兼着"重渲染"与"重报"两个职责,拆开后前者交给 content 比对
- 覆盖必须重渲染的三种情况:列表 body 过期后详情页刷回新内容、快速点 A 再点 B、点击到挂载之间切了深浅色

不这么做的话,prime 渲染一次、挂载再渲染一次,白烧 ~45ms 且可能看见重排。

### E. 注入队列(兜底)

- `injectJavaScript`:`webView == nil` 时入队(FIFO,上限 8,超限丢最旧并 log);`setupWebView()` 末尾按序 flush
- `give()` 与 `deinit`:清空队列,避免把上一次挂载的 props 带进下一次领养

## 落地顺序与各自验收

A → B → C → D → E,每步单独验收,失败时能定位到是哪一步引入的。

| 步 | 验收标准 |
|---|---|
| A 纯搬家 | 行为零变化:八轮 pop→push 的看门狗 phase 分布与今天一致(~3/8 `resending`),`YohakuPool` adopt/give 时序不变 |
| B 回填 | 深堆栈第二篇不再出现 ~1.5s 骨架;池日志无 `miss` |
| C 注入 | `settled` 在挂载后 <30ms 达成(靠领养回放,不靠 `$$props`);prime 命中时 body slot 首次布局即真实高度、无地板 |
| D 单次 | 一次进入只观察到一次正文渲染(DOM 侧临时计数探针);快速 A→B 不串文 |
| E 队列 | 八轮循环 phase 全部 `waiting` |

## 错误处理

| 场景 | 行为 |
|---|---|
| overrides 未生效,实际跑上游副本 | dev 启动断言抛错 |
| 点击时池空,prime 无处可去 | prime 静默失败,退化成今天的挂载注入 |
| prime 过的实例被别的屏幕领养 | key 不匹配 → 当作未 prime,走 `$$props` |
| 点 A 又快速点 B | content 值比对保证不串文 |
| body 过期,详情页刷回新内容 | content 值不等 → 正常重渲染 |
| 池内 content process 被杀 | 沿用现有 `navigationDelegate` 丢弃逻辑 |
| 注入队列超限 | 丢最旧 + log;正常路径队列长度 ≤2 |

## 测试

- vitest:注入队列纯逻辑(入队、flush 顺序、清空、上限)、prime key 匹配逻辑、契约快照(从 `webview-wrapper.tsx` 抽出传给底层 WebView 的 prop 名单与 ref 方法,对齐 `DomWebView.types.ts`;expo 升级后名单变动即失败)
- 模拟器:八轮 pop→push,**间隔 0.65-0.70s** —— 这是丢注入的复现窗口,0.40-0.60s 复现率为零;配 `log stream --level info` 过滤 `YohakuPool` 断言时序
- 回归:冷启动首篇、深堆栈、深浅色切换、切后台唤回、快速 A→B

## 不做

- 不接管 web bundle、dev HMR、`expo export:embed`
- 不改 `use dom` 的 marshal 与 RPC 协议
- 不做 Android
- 不动 `body-render-watchdog`:保留为保险丝。C+E 之后它不应再开火,这本身就是验收信号
- `useReservedBodyHeight` **不删除**:C 之后它从常规路径退为兜底(仅高度未知时施加地板),仍覆盖冷启动与 prime 落空

## Known issues / 后续

- `EXPO_NO_BUNDLE_SPLITTING=1` 仍然需要——那是 `@expo/cli` 的 export md5 重命名 bug,不在本次范围
- 上游若修复 `injectJavaScript` 静默丢弃,我们不会自动获得;可在 vendor 后把该修复提 PR 回上游
- 内存:池自维持后常驻 1-2 个热 WKWebView(约 30-60MB/实例)
