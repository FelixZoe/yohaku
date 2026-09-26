# WebView 宿主自有化 — 实施计划

设计:`docs/superpowers/specs/2026-08-12-vendor-dom-webview-design.md`(读它拿背景与实测基线;本文件是可执行任务)

## Global Constraints

- 仓库根 `/Users/innei/git/innei-repo/Yohaku`,分支 `feat/rn`,pnpm workspace
- **仅 iOS**。`apps/mobile/AGENTS.md` 规定 Android 永不开发:不写 Android 代码,不保留 Android 源码或预编产物,不为 Android 可移植性做取舍
- **Expo SDK 57**:动手前读 `https://docs.expo.dev/versions/v57.0.0/` 对应文档,不要凭记忆
- **注释规则(根 `CLAUDE.md`,强制)**:默认零注释、零 JSDoc。只有两种情况可写——(a) 意外行为(某个 bug/竞态/库的坑的绕行),(b) 隐藏约束(未来读者会反向改掉的设计意图)。禁止描述"代码在做什么"的注释、禁止分节注释、禁止业务函数的 JSDoc
- **只对你改过的文件**跑 lint / typecheck,不要全项目跑:
  `cd apps/mobile && pnpm exec eslint <files>` / `pnpm exec tsc --noEmit`
- 单测:`cd apps/mobile && pnpm exec vitest run <file>`
- 原生依赖或 patch 变动后**必须 `pod install`**(pnpm store 路径含 hash,不重装会指向旧路径)
- CLI 一律 `pnpm exec expo …`,**不要 `npx expo`**(会被 dlx 劫持到别的版本)
- 模拟器 udid `7346BD6D-0CF6-447F-8FC7-A8A5D1A2F90E`;Metro 已在 8082 且 app 已 pin(`RCT_jsLocation`)。**不要另起 8081 的 Metro**
- 点击用 `axe tap -x <pt> -y <pt> --udid <udid>`(逻辑点,402×874;截图是 @3x)
- 池日志:`xcrun simctl spawn <udid> log stream --level info --predicate 'eventMessage CONTAINS "YohakuPool"'`
- **丢注入的复现窗口是 pop→push 间隔 0.65-0.70s**,0.40-0.60s 复现率为零。任何"验证竞态"的循环必须用这个间隔
- 每个 task 自己 commit;不要提交本任务范围外的改动

## Task 1: vendor `@expo/dom-webview` 到 workspace(纯搬家,行为零变化)

**目标**:去掉 `patches/@expo__dom-webview.patch`,把该包收归 workspace,行为与今天完全一致。

**为什么能这么做**:`expo/src/dom/webview/ExpoDOMWebView.ts` 全文九行,`try { module = require('@expo/dom-webview').WebView } catch {}` —— 按包名 require 且带 try/catch,换包即接管。

**改动**:

1. 建 `packages/dom-webview/`,内容 = 当前**已打好 patch 的**安装副本(`node_modules/.pnpm/@expo+dom-webview@57.0.1_patch_hash=*/node_modules/@expo/dom-webview`),`package.json` 的 `name` 保持 `@expo/dom-webview`
2. **删除** `android/`、`local-maven-repo/`;`expo-module.config.json` 的 `platforms` 改为 `["apple"]`,删掉 `android` 段
3. `pnpm-workspace.yaml`:新增
   ```yaml
   overrides:
     '@expo/dom-webview': link:./packages/dom-webview
   ```
   并从 `patchedDependencies` 中**删除** `'@expo/dom-webview'` 那一行(保留 `@innei/markdown-to-jsx-yet`)
4. 删除 `patches/@expo__dom-webview.patch`
5. **自证(不可省)**:在 `DomWebViewModule.swift` 的 module 定义里加常量 `vendor: "yohaku"`;`apps/mobile` 侧在 `__DEV__` 下启动时读取并断言,不匹配即 `throw`。理由:`@expo/dom-webview` 是 `expo` 的**硬 dependency**,若 overrides 没生效,expo 会解析到自己那份嵌套副本且**不报任何错**
6. `pnpm install` → `cd apps/mobile && pnpm exec expo run:ios --device 7346BD6D-0CF6-447F-8FC7-A8A5D1A2F90E --port 8082`(重编原生,耗时长)
7. 建 `packages/dom-webview/VENDOR.md`:记源版本 `57.0.1`、改动点(实例池、Android 摘除)、以及"上游修复不会自动流入"

**验收**:

- app 启动不报自证断言错(证明跑的是我们的副本)
- 八轮 pop→push(间隔 0.65-0.70s),`YohakuPool` 日志中 adopt/give 成对出现、无 `miss`
- 行为与搬家前一致:看门狗 phase 分布仍约 3/8 `resending`(**这一步不修竞态**)

**不要做**:不要顺手改注入逻辑、不要动池的行为、不要碰 `apps/mobile/src` 里的业务代码(除自证断言外)。

## Task 2: 池自维持(领养后回填)

**目标**:消除深堆栈(文章内链再进文章)第二层的冷启动(~1.5s release / ~2s dev)。

**改动**:在 `packages/dom-webview` 的 `DomWebViewPool` 中,`take()` 成功后若池内实例数低于目标 **1**,在后台启动一个新实例并入池。上限仍为 **2**。新实例的 source URL 取被领养实例的 URL。

**验收**:连续 pop→push 八轮,`YohakuPool` 日志中 `pooled=` 计数不再归零且无 `miss`;从文章内链进入第二篇文章时不出现 ~2s 骨架。

**注意**:回填必须在主线程之外触发 boot 但在主线程建 `WKWebView`;不要在 `take()` 的同步路径里阻塞。

## Task 3: 点击注入(prime)

**目标**:把正文内容的注入从"屏幕挂载"挪到"点击那一刻"。

**改动**:

1. `packages/dom-webview` 原生模块暴露 `prime(url: String, key: String, payload: String)`:池内按 url 找一个**未 prime** 的实例 → 记下 `key` → `evaluateJavaScript("window.__yohakuPrime(<payload>)")`
2. **池自己注册一个消息处理器**,记录该实例回报的 `height` 与 `renderedKey`。pooled 期间 expo 的 handler 不在,没有这层收不到 prime 的完成信号
3. `setupWebView()` 领养时**优先挑 `key` 匹配的实例**;领养后立刻回放**两条**:`$$match_contents_event`(高度)**与 `yohaku:rendered`**
   - **两条必须一起回放**:`settled` 只由 `yohaku:rendered` 触发,只回放高度会让 opacity 停在 0、骨架照出、看门狗照样开火
   - 不允许改为依赖挂载时 expo 的 `$$props` 来触发就绪信号——那条通道 3/8 会丢,正是本设计要绕开的
4. `apps/mobile/src/components/dom/rich-body.tsx`:注册 `window.__yohakuPrime`,写入 module 级 external store,React 订阅后立即渲染
5. 调用点 `apps/mobile/src/screens/lists/posts-list.tsx` 与 `notes-list.tsx` 的 `onPress`:内容已在手(列表查询是 `db.select().from(posts)`,整行含 `content` 与 `enrichments`),`key` 用文章 id
6. `apps/mobile/src/screens/details/article-body.tsx`:高度经回放已知时**不施加 `useReservedBodyHeight` 的 `minHeight` 地板**;地板只在高度未知(冷启动、prime 落空)时生效

**验收**:正文全程不出骨架,`settled` 早于 250ms 骨架阈值,且内容**从不**来自 `$$props`(靠 prime + 领养回放);prime 命中时 body slot 首次布局即真实高度、无地板;prime 落空时退化为今天的行为且不崩。

(原文写的是「`settled` 在挂载后 <30ms」——那条按构造不可达:挂载通常比预渲染快 ~70ms,而挂载更快恰恰是好情况。回放路径本身已用人为延迟挂载验证过 16ms。)

## Task 4: 单次渲染(以 prime 为准)

**目标**:内容经 prime 与 `$$props` 各到达一次,第二份到达时按**值**比对,相等就不重渲染正文。不做的话会渲染两次,白烧 ~45ms 且可能可见重排。

**改动**(均在 `apps/mobile/src/components/dom/rich-body.tsx`):

1. 正文渲染 effect 的依赖从 `[content, renderNonce]` 收窄为 `[content]`
2. `renderNonce` 变化只触发**重报**(`yohaku:rendered` + `$$match_contents_event` + `yohaku:anchors`),**不重渲染**
3. 内容比对按值:`$$props` 的 content 与已渲染的相等 → 不重渲染;不等 → 正常重渲染

**必须仍能重渲染的三种情况**(逐条验证):列表 body 过期后详情页从网络刷回新内容;快速点 A 再点 B;点击到挂载之间切了深浅色。

**验收**:一次进入只观察到一次正文渲染(DOM 侧加**临时**计数探针验证后移除);快速 A→B 不串文。

## Task 5: 注入队列(次要通道兜底)

**目标**:expo 的 `$$props` 退为次要通道后仍需可靠——theme 切换、locale 变化要送达。

**改动**(`packages/dom-webview`):

1. `injectJavaScript`:`webView == nil` 时入队(FIFO,上限 **8**,超限丢最旧并 log);否则维持原样 `evaluateJavaScript`
2. `setupWebView()` 末尾:按入队顺序 flush 后清空
3. `give()` 与 `deinit`:清空队列,避免把上一次挂载的 props 带进下一次领养
4. 队列逻辑抽成可单测的纯逻辑,加 vitest(入队、flush 顺序、清空、上限)

**验收**:八轮 pop→push(间隔 0.65-0.70s)看门狗 phase **全部 `waiting`**;`mount→rendered` 稳定 ~115ms。

**注意**:`body-render-watchdog` 保留不动,它是保险丝。这一步之后它不应再开火——这本身就是验收信号。
