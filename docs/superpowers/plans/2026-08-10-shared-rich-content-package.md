# 共享富文本渲染包 `@yohaku/rich-content` 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 web 的 Yohaku Lexical 渲染层抽成 workspace 包，让 mobile WebView 的正文渲染力对齐 web。

**Architecture:** 新建源码包 `packages/rich-content`，用 `HostCapabilities` 接口把宿主差异（图片查看器、弹窗、锚点滚动、取数、组件替换）收敛成显式注入点。web 与 mobile 各自构造 host 后调用同一个 `createYohakuLexicalRenderer(host)`。样式分三个入口：`@haklex` 精选清单、Yohaku 语义层纯 CSS、Tailwind utility 层（仅 mobile 消费预编译产物）。

**Tech Stack:** React 19 · lexical 0.49 · `@haklex/rich-compose` 0.34 · Tailwind v4 · Expo DOM components (`'use dom'`) · Metro · vitest

**Spec:** `docs/superpowers/specs/2026-08-10-shared-rich-content-package-design.md`

## Global Constraints

- 包是**源码包 + 一个 checked-in 构建产物**（`dist/rich.css`）。除 `build:css` 外无构建步骤，两端各自 transpile `src/`。
- **`lightweight-charts` 与任何地图库不得进包。** stock 的 K 线与 map 的真实地图走 `slots.StockKLine` / `slots.MapBlock`，由 web 注入；mobile 不传，落到包内的静态降级实现。
- **包内禁止依赖 `@tanstack/react-query`。** 所有 biz 取数一律走 `host.fetchJSON` + 包内 `useResource`。
- **降级策略写死在包内**，不通过 host 开关暴露给宿主，否则会长出双份逻辑。
- **Tailwind v4 有自动内容检测**，`@source` 是追加而非替代。每处新增 `@source` 之后必须跟一个「构建产物 grep 独特 class」的验证步骤，不得靠路径推理认定生效。
- 遵循仓库 `CLAUDE.md`：**默认零注释、零 JSDoc**；仅在「非预期行为」或「隐藏不变量」处写注释。单文件 ≤ 500 行，React 组件 ≤ 300 行。
- lint / typecheck **只跑本任务改动的文件**，不跑全量。
- 本计划的 commit 步骤已获用户授权，按步骤执行即可；不要额外 push。
- 迁移全程用 `git mv` 而非「新建 + 删除」，保住文件历史。

## File Structure

```
packages/rich-content/
├── package.json                              包定义 + exports + build:css / check / test
├── tsconfig.json                             jsx: react-jsx
├── vitest.config.ts                          测试配置
├── tailwind.config.ts                        仅 icons plugin（复刻 apps/web 的）
├── styles/build.css                          Tailwind CLI 输入
├── dist/rich.css                             构建产物（checked in）
└── src/
    ├── host.tsx                              HostCapabilities 接口 + Provider + useHost
    ├── lib/use-resource.ts                   取数原语（内存缓存 + in-flight 去重）
    ├── lexical/
    │   ├── create-renderer.tsx               createYohakuLexicalRenderer(host)
    │   ├── sanitize.ts                       未注册 node type → 占位段落
    │   ├── block-boundary.tsx                块级 ErrorBoundary
    │   ├── overrides/{alert,banner,details,list-item,blockquote,table,heading}.tsx
    │   ├── portable/{image,exif-overlay,mermaid,chat,nested-doc,ink}.tsx
    │   ├── portable/excalidraw/              从 web 整目录迁入
    │   └── biz/{poll,stock,afilmory,map}/
    └── styles/
        ├── module-imports.ts                 @haklex 精选 CSS 清单
        └── yohaku-block-styles.css           389 行 Yohaku 语义层（纯 CSS）
```

web 侧 `apps/web/src/components/ui/rich-content/LexicalContent.tsx` 逐步退化为「构造 webHost + 调用包」的薄壳；mobile 侧 `apps/mobile/src/components/dom/rich-body.tsx` 同理。

---

### Task 0: 体积与时延基线

先立基线，后面每次加重依赖才有对照。

**Files:**
- Modify: `docs/superpowers/specs/2026-08-10-shared-rich-content-package-design.md`（填基线表）

**Interfaces:**
- Consumes: 无
- Produces: spec 末尾「基线」表的「迁移前」行填入真实数字，供 Task 4、Task 6 对照

- [ ] **Step 1: 导出 mobile 生产产物**

```bash
cd apps/mobile
EXPO_NO_BUNDLE_SPLITTING=1 npx expo export --platform ios --output-dir /tmp/yohaku-baseline
```

`EXPO_NO_BUNDLE_SPLITTING=1` 是必需的，不是可选优化：默认分包路径会撞 Expo CLI 的 `serializeHtml.js` bug（`Error: Asset not found: _expo/static/js/web/__common-*.js`，退出码 1，产物目录为空）。所有复测必须沿用同一 env var，否则口径不一致。

- [ ] **Step 2: 量 DOM bundle 体积**

`'use dom'` 组件会被打成独立的 web bundle。找出它并量 gzip 体积：

```bash
find /tmp/yohaku-baseline -name '*.js' -path '*dom*' -o -name 'www.bundle*' | head
# 对找到的每个候选：
for f in $(find /tmp/yohaku-baseline -name '*.js'); do
  echo "$(gzip -c "$f" | wc -c) $f"
done | sort -rn | head -5
```

记下最大的那个 JS 产物（即 DOM bundle）的 gzip 字节数。若 `expo export` 未产出可辨识的 DOM bundle，改用 dev server 量：启动 `npx expo start`，打开详情页，从 Metro 日志读 bundle 大小。

- [ ] **Step 3: 量渲染时延（人工，不由 subagent 执行）**

这一步需要在模拟器里交互操作，agent 无法完成。执行者应**跳过**它，并在报告里注明「时延测量待人工补充」。

人工做法：在模拟器打开 `src/screens/dev-demos/webview-pool-lab.tsx` 对应的 dev demo 路由，跑一次冷启动与一次池化领养，读它已有的计时输出（挂载 → `yohaku:rendered`，`appendLog` 打印 `${label}: ${result}ms`）。各跑 3 次取中位数。

- [ ] **Step 4: 填基线表**

编辑 spec 末尾的基线表，把「迁移前」行的「待测」换成 Step 2 的字节数。时延两列**保持现有记录值不变**（2689ms / 16-27ms），等人工测量后再更新。

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-08-10-shared-rich-content-package-design.md
git commit -m "docs: record pre-migration rich-content bundle baseline"
```

---

### Task 1: 建包骨架 + CSS 管道 + 四个纯语义 override

这四个 override（Alert / Banner / Details / ListItem）只用 `yohaku-block-styles.css` 的语义 class，零 Tailwind、零宿主依赖，是验证整条管道的最小闭环。

**Files:**
- Create: `packages/rich-content/package.json`
- Create: `packages/rich-content/tsconfig.json`
- Create: `packages/rich-content/vitest.config.ts`
- Create: `packages/rich-content/tailwind.config.ts`
- Create: `packages/rich-content/styles/build.css`
- Move: `apps/web/src/components/ui/rich-content/yohaku-block-styles.css` → `packages/rich-content/src/styles/yohaku-block-styles.css`
- Move: `apps/web/src/components/ui/rich-content/lexical-content-styles.ts` → `packages/rich-content/src/styles/module-imports.ts`
- Move: `apps/web/src/components/ui/rich-content/LexicalAlertOverride.tsx` → `packages/rich-content/src/lexical/overrides/alert.tsx`
- Move: `apps/web/src/components/ui/rich-content/LexicalBannerOverride.tsx` → `packages/rich-content/src/lexical/overrides/banner.tsx`
- Move: `apps/web/src/components/ui/rich-content/LexicalDetailsOverride.tsx` → `packages/rich-content/src/lexical/overrides/details.tsx`
- Move: `apps/web/src/components/ui/rich-content/LexicalListItemOverride.tsx` → `packages/rich-content/src/lexical/overrides/list-item.tsx`
- Test: `packages/rich-content/src/lexical/overrides/alert.test.tsx`
- Test: `packages/rich-content/src/lexical/overrides/list-item.test.tsx`
- Modify: `apps/web/src/components/ui/rich-content/LexicalContent.tsx`（改 import 来源）
- Modify: `apps/web/src/styles/tailwindcss.css`（加 `@source`）
- Modify: `apps/web/package.json`（加依赖）

**Interfaces:**
- Consumes: 无
- Produces:
  - `@yohaku/rich-content/module-imports` — 副作用 CSS 模块，无导出
  - `packages/rich-content/src/lexical/overrides/alert.tsx` → `export function LexicalAlertOverride(props: AlertRendererProps): ReactNode`
  - `.../banner.tsx` → `export function LexicalBannerOverride(props: BannerRendererProps): ReactNode`
  - `.../details.tsx` → `export const LexicalDetailsOverride: BuiltinNodeRenderer`
  - `.../list-item.tsx` → `export const LexicalListItemOverride: BuiltinNodeRenderer`

- [ ] **Step 1: 建包定义**

创建 `packages/rich-content/package.json`：

```json
{
  "name": "@yohaku/rich-content",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "exports": {
    "./host": "./src/host.tsx",
    "./lexical": "./src/lexical/create-renderer.tsx",
    "./module-imports": "./src/styles/module-imports.ts",
    "./block-styles.css": "./src/styles/yohaku-block-styles.css",
    "./rich.css": "./dist/rich.css",
    "./src/*": "./src/*"
  },
  "files": ["src", "dist"],
  "scripts": {
    "build:css": "tailwindcss -i styles/build.css -o dist/rich.css",
    "check": "pnpm build:css && git diff --exit-code -- dist/rich.css",
    "test": "vitest run"
  },
  "peerDependencies": {
    "@haklex/rich-compose": "*",
    "@haklex/rich-editor": "*",
    "lexical": "*",
    "react": "*"
  }
}
```

`check` 用 package script 实现 CSS drift 检查，比 spec 里设想的 `scripts/check.ts` 少一个文件。

创建 `packages/rich-content/tsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["vitest/globals"]
  },
  "include": ["src", "scripts", "*.ts"]
}
```

创建 `packages/rich-content/vitest.config.ts`：

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
```

- [ ] **Step 2: 装依赖**

```bash
cd packages/rich-content
pnpm add -D tailwindcss @tailwindcss/cli @egoist/tailwindcss-icons \
  @iconify-json/material-symbols @iconify-json/mingcute @iconify-json/octicon \
  vitest typescript react react-dom @types/react @types/react-dom
pnpm add @yohaku/design-system@workspace:*
cd ../..
pnpm --filter @yohaku/web add @yohaku/rich-content@workspace:*
```

- [ ] **Step 3: 建 Tailwind 配置与构建入口**

创建 `packages/rich-content/tailwind.config.ts`（复刻 `apps/web/tailwind.config.ts`）：

```ts
import { getIconCollections, iconsPlugin } from '@egoist/tailwindcss-icons'
import type { Config } from 'tailwindcss'

export default {
  plugins: [
    iconsPlugin({
      collections: getIconCollections([
        'material-symbols',
        'mingcute',
        'octicon',
      ]),
    }),
  ],
} satisfies Config
```

创建 `packages/rich-content/styles/build.css`：

```css
@import 'tailwindcss';
@config "../tailwind.config.ts";
@import '@yohaku/design-system/tokens.css';
@source "./src/**/*.{ts,tsx}";
```

不 import `yohaku-block-styles.css` —— 它由两端各自单独引，`rich.css` 只承担 utility 层。

- [ ] **Step 4: 迁移样式文件**

```bash
mkdir -p packages/rich-content/src/styles packages/rich-content/src/lexical/overrides
git mv apps/web/src/components/ui/rich-content/yohaku-block-styles.css \
       packages/rich-content/src/styles/yohaku-block-styles.css
git mv apps/web/src/components/ui/rich-content/lexical-content-styles.ts \
       packages/rich-content/src/styles/module-imports.ts
```

编辑 `packages/rich-content/src/styles/module-imports.ts`，把末行的相对 import 从 `'./yohaku-block-styles.css'` 保持不变（同目录，路径仍正确），其余 `@haklex/*` 与 `react-tweet/theme.css` 的 import 原样保留。

- [ ] **Step 5: 迁移四个纯语义 override**

```bash
git mv apps/web/src/components/ui/rich-content/LexicalAlertOverride.tsx \
       packages/rich-content/src/lexical/overrides/alert.tsx
git mv apps/web/src/components/ui/rich-content/LexicalBannerOverride.tsx \
       packages/rich-content/src/lexical/overrides/banner.tsx
git mv apps/web/src/components/ui/rich-content/LexicalDetailsOverride.tsx \
       packages/rich-content/src/lexical/overrides/details.tsx
git mv apps/web/src/components/ui/rich-content/LexicalListItemOverride.tsx \
       packages/rich-content/src/lexical/overrides/list-item.tsx
```

四个文件内容**不改一个字符** —— 它们的 import 全部来自 `@haklex/*`，迁位后依然解析得到。`'use client'` 指令保留（Next.js 需要，Metro 会忽略）。

- [ ] **Step 6: 写失败的测试**

创建 `packages/rich-content/src/lexical/overrides/alert.test.tsx`：

```tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'

import { LexicalAlertOverride } from './alert'

it('renders the yohaku label for a known alert type', () => {
  const html = renderToStaticMarkup(<LexicalAlertOverride type="warning" />)
  expect(html).toContain('rich-alert-yohaku-label')
  expect(html).toContain('data-type="warning"')
  expect(html).toContain('Warning')
})

it('falls back to note for an unknown alert type', () => {
  const html = renderToStaticMarkup(
    <LexicalAlertOverride type={'bogus' as never} />,
  )
  expect(html).toContain('data-type="note"')
  expect(html).toContain('Note')
})
```

创建 `packages/rich-content/src/lexical/overrides/list-item.test.tsx`：

```tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'

import { LexicalListItemOverride } from './list-item'

it('renders a checklist item when checked is a boolean', () => {
  const fallback = vi.fn(() => <li>fallback</li>)
  const html = renderToStaticMarkup(
    <>{LexicalListItemOverride({ checked: true }, 'k', 'body', fallback)}</>,
  )
  expect(html).toContain('yohaku-checklist-item')
  expect(html).toContain('data-checked="true"')
  expect(fallback).not.toHaveBeenCalled()
})

it('delegates to the default renderer for a plain list item', () => {
  const fallback = vi.fn(() => <li>fallback</li>)
  renderToStaticMarkup(
    <>{LexicalListItemOverride({}, 'k', 'body', fallback)}</>,
  )
  expect(fallback).toHaveBeenCalledOnce()
})
```

- [ ] **Step 7: 跑测试确认通过**

```bash
pnpm --filter @yohaku/rich-content test
```

Expected: 4 passed。若报 `Cannot find module 'react-dom/server'`，回到 Step 2 补装 `react-dom`。

- [ ] **Step 8: 构建 CSS 并验证 utility 真的进了产物**

```bash
pnpm --filter @yohaku/rich-content build:css
grep -c 'rich-alert-yohaku-label' packages/rich-content/dist/rich.css
```

Expected: `0` —— 此刻包内还没有任何 Tailwind utility 用法（四个 override 只用语义 class），产物应只含 preflight + tokens。这一步的目的是确认构建能跑通、产物生成。

再做一次**扫描生效**的实证：临时在 `packages/rich-content/src/lexical/overrides/alert.tsx` 的根 div 上加 `className="rich-alert-yohaku-label my-[13.7px]"`，重跑 `build:css`，然后：

```bash
grep -c '13.7px' packages/rich-content/dist/rich.css
```

Expected: `1`。确认后**把临时 class 改回原样**并重跑 `build:css`。若结果是 `0`，说明 `@source "./src/**"` 的基准不对，改成 `@source "../src/**"` 后重试（Tailwind v4 的自动内容检测可能掩盖问题，务必以这个独特 class 的 grep 结果为准）。

- [ ] **Step 9: web 侧改 import 并加扫描源**

编辑 `apps/web/src/components/ui/rich-content/LexicalContent.tsx`，把这五行：

```tsx
import './lexical-content-styles'
...
import { LexicalAlertOverride } from './LexicalAlertOverride'
import { LexicalBannerOverride } from './LexicalBannerOverride'
import { LexicalDetailsOverride } from './LexicalDetailsOverride'
import { LexicalListItemOverride } from './LexicalListItemOverride'
```

替换为：

```tsx
import '@yohaku/rich-content/module-imports'
...
import { LexicalAlertOverride } from '@yohaku/rich-content/src/lexical/overrides/alert'
import { LexicalBannerOverride } from '@yohaku/rich-content/src/lexical/overrides/banner'
import { LexicalDetailsOverride } from '@yohaku/rich-content/src/lexical/overrides/details'
import { LexicalListItemOverride } from '@yohaku/rich-content/src/lexical/overrides/list-item'
```

深路径 import 由 `exports` 的 `"./src/*"` 条目支持（已在 Step 1 的 package.json 里）—— 这是有意决定：包是 private workspace 包，不发布，不追求封装边界。

在 `apps/web/src/styles/tailwindcss.css` 的 `@source` 段落后追加：

```css
@source "../../../../packages/rich-content/src/**/*.{ts,tsx}";
```

**路径基准已实测确定**：`@source` 相对 **CSS 文件所在目录**解析，不是相对 cwd。从 `apps/web/src/styles/` 上溯四级才到仓库根。（同文件里既有的 `@source "./src/**"` 之所以看着有效，是被 Tailwind v4 的自动内容检测兜住了，并非该路径本身正确 —— 这正是必须用独特类名 grep 验证的原因。）

- [ ] **Step 10: 验证 web 的 Tailwind 扫描覆盖到包**

临时在 `packages/rich-content/src/lexical/overrides/banner.tsx` 的 header div 上加 `my-[13.9px]`，然后：

```bash
pnpm --filter @yohaku/web build 2>&1 | tail -20
grep -rl '13.9px' apps/web/.next/static/ --include=*.css | head
```

Expected: 至少一个 CSS 文件命中。确认后把临时 class 改回原样。若未命中，先用 `ls -d` 逐级试出正确的相对基准再改，不要凭推理定路径。

- [ ] **Step 11: 跑 lint 与 typecheck（仅改动文件）**

```bash
pnpm --filter @yohaku/web exec eslint --fix \
  src/components/ui/rich-content/LexicalContent.tsx
pnpm --filter @yohaku/web exec tsc --noEmit
```

- [ ] **Step 12: 人工验证 web 无回归**

`pnpm --filter @yohaku/web dev`，打开任意含 alert / banner / 折叠块 / 待办清单的文章，确认四种块的观感与迁移前一致。

- [ ] **Step 13: Commit**

```bash
git add packages/rich-content apps/web/src/components/ui/rich-content/LexicalContent.tsx \
        apps/web/src/styles/tailwindcss.css apps/web/package.json pnpm-lock.yaml
git commit -m "feat(rich-content): scaffold shared package with pure-semantic lexical overrides"
```

---

### Task 2: HostCapabilities + useResource + 三个 Tailwind override

这一步落地承重墙接口，并迁入依赖 Tailwind 的 Blockquote / Table / Heading。Heading 顺带把锚点滚动改成 host 注入 —— 这是 mobile 能用的前提。

**Files:**
- Create: `packages/rich-content/src/host.tsx`
- Create: `packages/rich-content/src/lib/use-resource.ts`
- Create: `packages/rich-content/src/lib/use-resource.test.ts`
- Move: `apps/web/src/components/ui/rich-content/LexicalBlockquoteOverride.tsx` → `packages/rich-content/src/lexical/overrides/blockquote.tsx`
- Move: `apps/web/src/components/ui/rich-content/LexicalTableOverride.tsx` → `packages/rich-content/src/lexical/overrides/table.tsx`
- Move: `apps/web/src/components/ui/rich-content/LexicalHeadingOverride.tsx` → `packages/rich-content/src/lexical/overrides/heading.tsx`
- Test: `packages/rich-content/src/lexical/overrides/heading.test.tsx`
- Modify: `apps/web/src/components/ui/rich-content/LexicalContent.tsx`
- Modify: `packages/rich-content/vitest.config.ts`（加 happy-dom）

**Interfaces:**
- Consumes: Task 1 的包骨架与 `exports`
- Produces:
  - `export interface HostCapabilities` — 字段见 Step 1
  - `export interface InlineLinkProps { children: ReactNode; className?: string; href: string; rel?: string; target?: string }`
  - `export function HostProvider({ host, children }: { host: HostCapabilities; children: ReactNode }): ReactNode`
  - `export function useHost(): HostCapabilities` — 无 Provider 时抛错
  - `export function useResource<T>(key: string | null, fetcher: () => Promise<T>): { data?: T; error?: unknown; isLoading: boolean }`
  - `export function fetchResource<T>(key: string, fetcher: () => Promise<T>): Promise<T>` — 命令式取数，带 in-flight 去重
  - `export function invalidateResource(key: string): void` — 删缓存并通知订阅者（Task 4 的投票提交后用）
  - `export function __resetResourceCache(): void` — 仅供测试
  - `export const LexicalBlockquoteOverride: BuiltinNodeRenderer`
  - `export const lexicalTableOverrides: Record<'table' | 'tablerow' | 'tablecell', BuiltinNodeRenderer>`
  - `export function lexicalHeadingOverride(node: unknown, key: string, children: ReactNode): ReactNode` — 内部改用 `useHost().scrollToAnchor`

- [ ] **Step 1: 写 host.tsx**

创建 `packages/rich-content/src/host.tsx`：

```tsx
'use client'

import { createContext, useContext, type ComponentType, type ReactNode } from 'react'

export interface InlineLinkProps {
  children: ReactNode
  className?: string
  href: string
  rel?: string
  target?: string
}

export interface StockKLineProps {
  code: string
  market?: string
}

export interface MapSlotProps {
  locale?: string
  pois?: unknown[]
  title?: string
  track?: { url?: string }
  view?: unknown
}

export interface HostCapabilities {
  apiBase: string
  fetchJSON<T>(url: string, init?: RequestInit): Promise<T>
  labels: { nestedDocExpand: string; nestedDocLabel: string }
  nestedDocPresentation: 'inline' | 'modal'
  openImage(payload: { images: string[]; index: number; src: string }): void | Promise<void>
  openLink(url: string): void | Promise<void>
  scrollToAnchor(id: string): void | Promise<void>
  slots?: {
    BlockLinkCard?: ComponentType<{ url: string }>
    CodeBlock?: ComponentType<{ code: string; language?: string }>
    InlineLink?: ComponentType<InlineLinkProps>
    MapBlock?: ComponentType<MapSlotProps>
    StockKLine?: ComponentType<StockKLineProps>
  }
  theme: 'dark' | 'light'
  webOrigin: string
}

const HostContext = createContext<HostCapabilities | null>(null)

export function HostProvider({
  children,
  host,
}: {
  children: ReactNode
  host: HostCapabilities
}) {
  return <HostContext.Provider value={host}>{children}</HostContext.Provider>
}

export function useHost(): HostCapabilities {
  const host = useContext(HostContext)
  if (!host) {
    throw new Error('useHost must be called inside <HostProvider>')
  }
  return host
}
```

`StockKLineProps` 与 `MapSlotProps` 先给宽松形状，Task 4 迁入真实模块时按 `stock-augment.ts` / `map-augment.ts` 的实际类型收紧。

- [ ] **Step 2: 写 useResource 的失败测试**

创建 `packages/rich-content/src/lib/use-resource.test.ts`：

```ts
import { expect, it, vi } from 'vitest'

import { __resetResourceCache, fetchResource } from './use-resource'

it('dedupes concurrent fetches for the same key', async () => {
  __resetResourceCache()
  const fetcher = vi.fn(async () => 'value')
  const [a, b] = await Promise.all([
    fetchResource('k', fetcher),
    fetchResource('k', fetcher),
  ])
  expect(a).toBe('value')
  expect(b).toBe('value')
  expect(fetcher).toHaveBeenCalledOnce()
})

it('serves a resolved key from cache without refetching', async () => {
  __resetResourceCache()
  const fetcher = vi.fn(async () => 'value')
  await fetchResource('k', fetcher)
  await fetchResource('k', fetcher)
  expect(fetcher).toHaveBeenCalledOnce()
})

it('does not cache a rejected fetch', async () => {
  __resetResourceCache()
  const fetcher = vi
    .fn()
    .mockRejectedValueOnce(new Error('boom'))
    .mockResolvedValueOnce('value')
  await expect(fetchResource('k', fetcher)).rejects.toThrow('boom')
  await expect(fetchResource('k', fetcher)).resolves.toBe('value')
  expect(fetcher).toHaveBeenCalledTimes(2)
})
```

- [ ] **Step 3: 跑测试确认失败**

```bash
pnpm --filter @yohaku/rich-content test src/lib/use-resource.test.ts
```

Expected: FAIL，`Failed to resolve import "./use-resource"`。

- [ ] **Step 4: 实现 use-resource.ts**

创建 `packages/rich-content/src/lib/use-resource.ts`：

```ts
'use client'

import { useEffect, useState } from 'react'

interface Entry<T> {
  error?: unknown
  promise?: Promise<T>
  status: 'error' | 'loading' | 'success'
  value?: T
}

const cache = new Map<string, Entry<unknown>>()
const listeners = new Map<string, Set<() => void>>()

export function __resetResourceCache() {
  cache.clear()
  listeners.clear()
}

function notify(key: string) {
  for (const listener of listeners.get(key) ?? []) listener()
}

export function invalidateResource(key: string) {
  cache.delete(key)
  notify(key)
}

export function fetchResource<T>(
  key: string,
  fetcher: () => Promise<T>,
): Promise<T> {
  const existing = cache.get(key) as Entry<T> | undefined
  if (existing?.status === 'success') return Promise.resolve(existing.value as T)
  if (existing?.status === 'loading' && existing.promise) return existing.promise

  const promise = fetcher()
    .then((value) => {
      cache.set(key, { status: 'success', value } as Entry<unknown>)
      notify(key)
      return value
    })
    .catch((error: unknown) => {
      cache.delete(key)
      cache.set(key, { error, status: 'error' } as Entry<unknown>)
      notify(key)
      throw error
    })

  cache.set(key, { promise, status: 'loading' } as Entry<unknown>)
  return promise
}

export interface ResourceState<T> {
  data?: T
  error?: unknown
  isLoading: boolean
}

export function useResource<T>(
  key: string | null,
  fetcher: () => Promise<T>,
): ResourceState<T> {
  const [, bump] = useState(0)

  useEffect(() => {
    if (!key) return
    const listener = () => bump((n) => n + 1)
    const set = listeners.get(key) ?? new Set<() => void>()
    listeners.set(key, set)
    set.add(listener)
    return () => {
      set.delete(listener)
      if (set.size === 0) listeners.delete(key)
    }
  }, [key])

  useEffect(() => {
    if (!key) return
    const entry = cache.get(key)
    if (entry?.status === 'error') return
    // fetcher 有意不入依赖：缓存身份由 key 决定，内联箭头函数每渲染都变，
    // 入依赖会导致无限重取。
    void fetchResource(key, fetcher).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  if (!key) return { isLoading: false }
  const entry = cache.get(key) as Entry<T> | undefined
  return {
    data: entry?.value,
    error: entry?.error,
    isLoading: !entry || entry.status === 'loading',
  }
}
```

- [ ] **Step 5: 跑测试确认通过**

```bash
pnpm --filter @yohaku/rich-content test src/lib/use-resource.test.ts
```

Expected: 3 passed。

- [ ] **Step 6: 迁移三个 Tailwind override**

```bash
git mv apps/web/src/components/ui/rich-content/LexicalBlockquoteOverride.tsx \
       packages/rich-content/src/lexical/overrides/blockquote.tsx
git mv apps/web/src/components/ui/rich-content/LexicalTableOverride.tsx \
       packages/rich-content/src/lexical/overrides/table.tsx
git mv apps/web/src/components/ui/rich-content/LexicalHeadingOverride.tsx \
       packages/rich-content/src/lexical/overrides/heading.tsx
```

`blockquote.tsx` 与 `table.tsx` 内容不改（import 全来自 `@haklex/*`）。

- [ ] **Step 7: 写 heading 的失败测试**

heading 要从「直接调 `springScrollToElement`」改成「调 `host.scrollToAnchor`」。先写测试锁住行为。

`heading.tsx` 当前是普通函数而非组件，无法用 `useHost()`。改造为渲染一个内部组件。

创建 `packages/rich-content/src/lexical/overrides/heading.test.tsx`：

```tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'

import { HostProvider, type HostCapabilities } from '../../host'
import { lexicalHeadingOverride } from './heading'

const host: HostCapabilities = {
  apiBase: '',
  fetchJSON: async () => ({}) as never,
  labels: { nestedDocExpand: 'Expand', nestedDocLabel: 'Nested document' },
  nestedDocPresentation: 'modal',
  openImage: () => {},
  openLink: () => {},
  scrollToAnchor: () => {},
  theme: 'light',
  webOrigin: 'https://example.com',
}

it('renders the tag with a slug id and an anchor', () => {
  const html = renderToStaticMarkup(
    <HostProvider host={host}>
      {lexicalHeadingOverride({ tag: 'h3' }, 'k', 'Hello World')}
    </HostProvider>,
  )
  expect(html).toContain('<h3')
  expect(html).toContain('id="hello-world"')
  expect(html).toContain('rich-heading-anchor')
  expect(html).toContain('href="#hello-world"')
})

it('omits the anchor when the heading has no text', () => {
  const html = renderToStaticMarkup(
    <HostProvider host={host}>
      {lexicalHeadingOverride({ tag: 'h2' }, 'k', '')}
    </HostProvider>,
  )
  expect(html).not.toContain('rich-heading-anchor')
})
```

- [ ] **Step 8: 跑测试确认失败**

```bash
pnpm --filter @yohaku/rich-content test src/lexical/overrides/heading.test.tsx
```

Expected: FAIL —— 现有实现 import `~/lib/scroller`，在包内解析不到。

- [ ] **Step 9: 改造 heading.tsx**

把文件里这两处改掉。删除顶部的 `import { springScrollToElement } from '~/lib/scroller'`，并把返回的 `<a>` 抽成使用 `useHost()` 的内部组件：

```tsx
function HeadingAnchor({ slug }: { slug: string }) {
  const { scrollToAnchor } = useHost()
  return (
    <a
      aria-hidden
      className="rich-heading-anchor scale-90 ml-2 relative -bottom-1 inline-flex cursor-pointer select-none text-accent opacity-0 transition-opacity duration-200 group-hover:opacity-100"
      href={`#${slug}`}
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.preventDefault()
        void scrollToAnchor(slug)
      }}
    >
      <i className="i-mingcute-hashtag-line" />
    </a>
  )
}
```

并把 `createElement` 的第三个子节点从内联 `<a>` 换成 `slug ? <HeadingAnchor key="anchor" slug={slug} /> : null`。顶部补 `import { useHost } from '../../host'`。

`history.replaceState` 与 `document.getElementById` 一并移除 —— 两者都归 host 实现负责（web 的 host 里重建，mobile 的 host 不需要）。

- [ ] **Step 10: 跑测试确认通过**

```bash
pnpm --filter @yohaku/rich-content test
```

Expected: 全部 passed。

- [ ] **Step 11: web 侧接上 host**

编辑 `apps/web/src/components/ui/rich-content/LexicalContent.tsx`：

改 import 来源：

```tsx
import { HostProvider, type HostCapabilities } from '@yohaku/rich-content/host'
import { LexicalBlockquoteOverride } from '@yohaku/rich-content/src/lexical/overrides/blockquote'
import { lexicalHeadingOverride } from '@yohaku/rich-content/src/lexical/overrides/heading'
import { lexicalTableOverrides } from '@yohaku/rich-content/src/lexical/overrides/table'
```

在 `LexicalContent` 组件里构造 host 并包裹：

```tsx
const t = useTranslations('common')
const webHost = useMemo<HostCapabilities>(
  () => ({
    apiBase: '',
    fetchJSON: async (url, init) => {
      const res = await fetch(url, init)
      if (!res.ok) throw new Error(`fetchJSON failed (${res.status}): ${url}`)
      return res.json()
    },
    labels: {
      nestedDocExpand: t('nested_doc_expand'),
      nestedDocLabel: t('nested_doc_label'),
    },
    nestedDocPresentation: 'modal',
    openImage: () => {},
    openLink: (url) => {
      window.open(url, '_blank', 'noopener')
    },
    scrollToAnchor: (id) => {
      history.replaceState(history.state, '', `#${id}`)
      const target = document.getElementById(id)
      if (target) springScrollToElement(target, -100)
    },
    theme: isDark ? 'dark' : 'light',
    webOrigin: window.location.origin,
  }),
  [isDark, t],
)
```

顶部补 `import { useTranslations } from 'next-intl'` 与 `import { springScrollToElement } from '~/lib/scroller'`。

把返回值最外层从 `<PollDataProvider …>` 改为：

```tsx
<HostProvider host={webHost}>
  <PollDataProvider adapter={pollAdapter}>
    …
  </PollDataProvider>
</HostProvider>
```

`openImage` 此刻留空实现 —— 图片走的还是 web 现有的 `onLexicalImageClick`，Task 3 迁入 Image override 时才接上。

- [ ] **Step 12: lint + typecheck + 人工验证**

```bash
pnpm --filter @yohaku/web exec eslint --fix \
  src/components/ui/rich-content/LexicalContent.tsx
pnpm --filter @yohaku/web exec tsc --noEmit
pnpm --filter @yohaku/web dev
```

打开一篇含引用块、表格、多级标题的文章：引用块的开引号字形与 attribution、表格的表头分隔线、标题的 hover 井号锚点点击后平滑滚动 —— 三项均需与迁移前一致。

- [ ] **Step 13: Commit**

```bash
git add packages/rich-content apps/web/src/components/ui/rich-content/LexicalContent.tsx
git commit -m "feat(rich-content): add host capabilities and migrate tailwind-coupled overrides"
```

---

### Task 3: 可移植层迁入

Image + Exif、Mermaid、excalidraw-static、chat、nested-doc、ink。这批的共同点是逻辑本身与平台无关，只需把 `useIsDark` 换成 `host.theme`、把 `~/constants/env` 换成 `host.apiBase`、把 react-query 换成 `useResource`。

**Files:**
- Move: `apps/web/src/components/ui/image/ImageExifOverlay.tsx` → `packages/rich-content/src/lexical/portable/exif-overlay.tsx`
- Move: `apps/web/src/components/ui/rich-content/LexicalImageOverride.tsx` → `packages/rich-content/src/lexical/portable/image.tsx`
- Move: `apps/web/src/components/modules/shared/Mermaid.tsx` → `packages/rich-content/src/lexical/portable/mermaid.tsx`
- Move: `apps/web/src/components/ui/rich-content/LexicalChatOverride.tsx` → `packages/rich-content/src/lexical/portable/chat.tsx`
- Move: `apps/web/src/components/ui/rich-content/yohaku-chat-module.ts` → `packages/rich-content/src/lexical/portable/chat-module.ts`
- Move: `apps/web/src/components/ui/rich-content/LexicalNestedDocOverride.tsx` → `packages/rich-content/src/lexical/portable/nested-doc.tsx`
- Move: `apps/web/src/components/ui/rich-content/use-mark-ink.ts` → `packages/rich-content/src/lexical/portable/ink.ts`
- Move: `apps/web/src/components/ui/excalidraw-static/` → `packages/rich-content/src/lexical/portable/excalidraw/`
- Modify: `packages/rich-content/vitest.config.ts`（DOM 测试改用 happy-dom）
- Modify: `apps/web/src/components/ui/rich-content/LexicalContent.tsx`
- Modify: 所有引用被移动文件的 web 侧模块（用 grep 找全）
- Test: `packages/rich-content/src/lexical/portable/nested-doc.test.tsx`

**Interfaces:**
- Consumes: Task 2 的 `useHost()`、`useResource()`、`HostCapabilities`
- Produces:
  - `export function LexicalImageOverride(props: ImageRendererProps): ReactNode`
  - `export function Mermaid({ content }: { content: string }): ReactNode`
  - `export const yohakuChatModule: RichRendererModule`
  - `export function LexicalNestedDocOverride({ contentState }: { contentState: SerializedEditorState }): ReactNode`
  - `export function useMarkInk(containerRef: RefObject<HTMLElement | null>, contentKey: string): void`
  - `export const staticExcalidrawModule: RichRendererModule`

- [ ] **Step 1: 先摸清引用面**

```bash
rg -n "ImageExifOverlay|excalidraw-static|modules/shared/Mermaid|use-mark-ink" apps/web/src
```

把命中列表记下来 —— Step 8 要逐个改 import。

- [ ] **Step 2: 迁移文件**

```bash
mkdir -p packages/rich-content/src/lexical/portable
git mv apps/web/src/components/ui/image/ImageExifOverlay.tsx \
       packages/rich-content/src/lexical/portable/exif-overlay.tsx
git mv apps/web/src/components/ui/rich-content/LexicalImageOverride.tsx \
       packages/rich-content/src/lexical/portable/image.tsx
git mv apps/web/src/components/modules/shared/Mermaid.tsx \
       packages/rich-content/src/lexical/portable/mermaid.tsx
git mv apps/web/src/components/ui/rich-content/LexicalChatOverride.tsx \
       packages/rich-content/src/lexical/portable/chat.tsx
git mv apps/web/src/components/ui/rich-content/yohaku-chat-module.ts \
       packages/rich-content/src/lexical/portable/chat-module.ts
git mv apps/web/src/components/ui/rich-content/LexicalNestedDocOverride.tsx \
       packages/rich-content/src/lexical/portable/nested-doc.tsx
git mv apps/web/src/components/ui/rich-content/use-mark-ink.ts \
       packages/rich-content/src/lexical/portable/ink.ts
git mv apps/web/src/components/ui/excalidraw-static \
       packages/rich-content/src/lexical/portable/excalidraw
```

- [ ] **Step 3: 装可移植层的依赖**

```bash
pnpm --filter @yohaku/rich-content add exif-js lumeo clsx markdown-to-jsx
pnpm --filter @yohaku/rich-content add -D happy-dom
```

`markdown-to-jsx` 在 web 与 mobile 已各自安装，包内声明为直接依赖以保证独立可测。

- [ ] **Step 4: 解耦 mermaid.tsx**

删除 `import { useIsDark } from '~/hooks/common/use-is-dark'`，改为：

```tsx
import { useHost } from '../../host'
```

并把 `const isDark = useIsDark()` 换成 `const isDark = useHost().theme === 'dark'`。文件其余部分不动（`lumeo`、`ColorSchemeProvider`、`MutationObserver` 逻辑全部平台无关）。

- [ ] **Step 5: 解耦 ink.ts**

`use-mark-ink.ts` 依赖 `~/lib/highlighter-ink` 的 `attachMarkInk` 与 `~/hooks/common/use-is-dark`。

`highlighter-ink.ts` 只 import `@highlighters/core`（已核实，无 web 专有依赖），整体迁入：

```bash
git mv apps/web/src/lib/highlighter-ink.ts \
       packages/rich-content/src/lib/highlighter-ink.ts
pnpm --filter @yohaku/rich-content add @highlighters/core
rg -n "lib/highlighter-ink" apps/web/src
```

按最后一条 grep 的结果，把 web 侧所有引用改到 `@yohaku/rich-content/src/lib/highlighter-ink`（`useSelectionInk` 也在其中）。

`ink.ts` 里的 `useIsDark` 换成 `useHost().theme === 'dark'`。

- [ ] **Step 6: 解耦 excalidraw**

`StaticExcalidraw.tsx` 依赖 `@tanstack/react-query`、`~/constants/env`、`../loading/LoadingMark`。

- react-query 的 `useQuery(...)` 换成 `useResource(key, () => host.fetchJSON(url))`
- `~/constants/env` 的 API base 换成 `useHost().apiBase`
- `LoadingMark` 换成包内一个 8 行的占位 div（不要把 web 的 loading 组件树拖进来）：

```tsx
function ExcalidrawLoading() {
  return (
    <div
      aria-hidden
      className="my-6 h-64 w-full animate-pulse rounded-xl bg-(--color-neutral-2)"
    />
  )
}
```

`InteractiveScene.tsx` 从 `~/lib/helper` 只用了 `clsxm` 一个函数（已核实）。把它的实现复制进 `packages/rich-content/src/lib/clsxm.ts`，改 import 指向本地文件；不要把整个 `helper` 模块搬进包。

- [ ] **Step 7: 解耦 nested-doc.tsx 并实现 inline 形态**

删除 `import { useTranslations } from 'next-intl'`，把 `const t = useTranslations('common')` 换成：

```tsx
const { labels, nestedDocPresentation } = useHost()
```

两处文案换成 `labels.nestedDocLabel` / `labels.nestedDocExpand`。

`handleOpen` 改为按 presentation 分支：`'modal'` 走现有的 `onExpand(...)`；`'inline'` 不调 `onExpand`，改为翻转本地 state：

```tsx
const [expanded, setExpanded] = useState(false)
```

展开时把 `previewState` 换成完整的 `contentState`、去掉 `pointer-events-none` 与截断遮罩。

- [ ] **Step 8: 写 nested-doc 的测试**

创建 `packages/rich-content/src/lexical/portable/nested-doc.test.tsx`：

```tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'

import { HostProvider, type HostCapabilities } from '../../host'
import { LexicalNestedDocOverride } from './nested-doc'

const baseHost: HostCapabilities = {
  apiBase: '',
  fetchJSON: async () => ({}) as never,
  labels: { nestedDocExpand: '展开', nestedDocLabel: '嵌套文档' },
  nestedDocPresentation: 'inline',
  openImage: () => {},
  openLink: () => {},
  scrollToAnchor: () => {},
  theme: 'light',
  webOrigin: 'https://example.com',
}

const contentState = {
  root: {
    children: [
      {
        children: [{ detail: 0, format: 0, mode: 'normal', style: '', text: '标题', type: 'text', version: 1 }],
        direction: null, format: '', indent: 0, type: 'paragraph', version: 1,
      },
    ],
    direction: null, format: '', indent: 0, type: 'root', version: 1,
  },
} as never

it('renders host-provided labels', () => {
  const html = renderToStaticMarkup(
    <HostProvider host={baseHost}>
      <LexicalNestedDocOverride contentState={contentState} />
    </HostProvider>,
  )
  expect(html).toContain('嵌套文档')
  expect(html).toContain('展开')
})

it('renders nothing for an empty document', () => {
  const empty = { root: { children: [], type: 'root', version: 1 } } as never
  const html = renderToStaticMarkup(
    <HostProvider host={baseHost}>
      <LexicalNestedDocOverride contentState={empty} />
    </HostProvider>,
  )
  expect(html).toBe('')
})
```

- [ ] **Step 9: 跑测试**

```bash
pnpm --filter @yohaku/rich-content test
```

Expected: 全部 passed。若 `NestedDocRenderer` 在 node 环境下要求 DOM，把 `vitest.config.ts` 的 `environment` 改为 `'happy-dom'` 后重跑。

- [ ] **Step 10: 更新 web 侧全部引用**

按 Step 1 的 grep 列表，逐个把 import 改到 `@yohaku/rich-content/src/lexical/portable/...`。`LexicalContent.tsx` 里的 `staticExcalidrawModule`、`yohakuChatModule`、`LexicalMermaidOverride`、`LexicalImageOverride`、`LexicalNestedDocOverride`、`useMarkInk` 全部改源。

`LexicalMermaidOverride.tsx` 与 `LexicalCodeBlockOverride.tsx` 留在 web —— 前者现在只是包内 `Mermaid` 的一行包装（可直接删除，改用包内导出），后者是 web 的 shiki 实现，改为通过 `slots.CodeBlock` 注入。

在 web 的 host 里补上：

```tsx
slots: {
  CodeBlock: ({ code, language }) => (
    <CodeBlockRender content={code} lang={language} />
  ),
},
```

- [ ] **Step 11: 接上 web 的 openImage**

把 `LexicalContent.tsx` 里的 `onLexicalImageClick` 逻辑挪进 host 的 `openImage`：

```tsx
openImage: ({ src }) => {
  const img = document.querySelector<HTMLImageElement>(`img[src="${CSS.escape(src)}"]`)
  if (!img) return
  const zoom = getPhotoZoom()
  if (!zoom.getImages().includes(img)) zoom.attach(img)
  zoom.open({ target: img })
},
```

包内的 image/gallery module setup 改为调 `host.openImage({ src, images, index })`。

- [ ] **Step 12: lint + typecheck + 人工验证**

```bash
pnpm --filter @yohaku/rich-content test
pnpm --filter @yohaku/web exec eslint --fix src/components/ui/rich-content/LexicalContent.tsx
pnpm --filter @yohaku/web exec tsc --noEmit
pnpm --filter @yohaku/web dev
```

逐项确认：文章内图片点击可缩放且 EXIF 浮层出现、mermaid 图渲染且可点击放大、excalidraw 画板渲染、chat 气泡渲染、嵌套文档点击开浮层、划词高亮的墨迹效果仍在。

- [ ] **Step 13: Commit**

```bash
git add -A packages/rich-content apps/web/src
git commit -m "feat(rich-content): migrate portable renderer layer into shared package"
```

---

### Task 4: C 层只读渲染器 + 块级边界 + 体积复测

**Files:**
- Create: `packages/rich-content/src/lexical/block-boundary.tsx`
- Create: `packages/rich-content/src/lexical/sanitize.ts`
- Create: `packages/rich-content/src/lexical/sanitize.test.ts`
- Create: `packages/rich-content/src/lexical/biz/map/renderer.tsx`（新写的静态占位卡）
- Move: `apps/web/src/components/ui/rich-content/poll-renderer.tsx` → `packages/rich-content/src/lexical/biz/poll/renderer.tsx`
- Move: `apps/web/src/components/ui/rich-content/poll-module.ts` → `packages/rich-content/src/lexical/biz/poll/module.ts`
- Move: `apps/web/src/components/ui/rich-content/stock/` → `packages/rich-content/src/lexical/biz/stock/`
- Move: `apps/web/src/components/ui/rich-content/afilmory/` → `packages/rich-content/src/lexical/biz/afilmory/`
- Move: `apps/web/src/components/ui/rich-content/map/{map-augment.ts,map-display-node.ts,yohaku-map-module.ts}` → `packages/rich-content/src/lexical/biz/map/`
- Create: `packages/rich-content/src/lexical/create-renderer.tsx`
- Modify: `apps/web/src/components/ui/rich-content/LexicalContent.tsx`
- Modify: `docs/superpowers/specs/2026-08-10-shared-rich-content-package-design.md`（基线表加行）

**Interfaces:**
- Consumes: Task 2 的 `useHost` / `useResource`；Task 3 的 portable 层
- Produces:
  - `export function createYohakuLexicalRenderer(): ComponentType<{ className?: string; style?: CSSProperties; theme: 'dark' | 'light'; value: SerializedEditorState; variant?: RichEditorVariant }>` — 返回组装好的 `composeRenderer` 实例；props 形状与 `@haklex/rich-compose` 的 `composeRenderer` 产物保持一致，两端调用方式相同
  - `export const REGISTERED_NODE_TYPES: Set<string>`
  - `export function sanitizeEditorState(state: SerializedEditorState, registeredTypes: Set<string>): SerializedEditorState`
  - `export function BlockBoundary({ children, label }: { children: ReactNode; label: string }): ReactNode`

- [ ] **Step 1: 写 sanitize 的失败测试**

创建 `packages/rich-content/src/lexical/sanitize.test.ts`：

```ts
import { expect, it } from 'vitest'

import { sanitizeEditorState } from './sanitize'

const registered = new Set(['root', 'paragraph', 'text', 'poll'])

it('keeps registered node types untouched', () => {
  const state = {
    root: {
      children: [{ type: 'poll', version: 1, pollId: 'p1' }],
      type: 'root', version: 1,
    },
  } as never
  const out = sanitizeEditorState(state, registered)
  expect((out.root.children[0] as { type: string }).type).toBe('poll')
})

it('replaces an unregistered node with a placeholder paragraph', () => {
  const state = {
    root: {
      children: [{ type: 'brand-new-block', version: 1 }],
      type: 'root', version: 1,
    },
  } as never
  const out = sanitizeEditorState(state, registered)
  const node = out.root.children[0] as {
    children: { text: string }[]
    type: string
  }
  expect(node.type).toBe('paragraph')
  expect(node.children[0].text).toContain('请在网页中查看')
})

it('recurses into children', () => {
  const state = {
    root: {
      children: [
        { children: [{ type: 'unknown-x', version: 1 }], type: 'paragraph', version: 1 },
      ],
      type: 'root', version: 1,
    },
  } as never
  const out = sanitizeEditorState(state, registered)
  const child = (out.root.children[0] as { children: { type: string }[] }).children[0]
  expect(child.type).toBe('paragraph')
})
```

- [ ] **Step 2: 跑测试确认失败**

```bash
pnpm --filter @yohaku/rich-content test src/lexical/sanitize.test.ts
```

Expected: FAIL，模块不存在。

- [ ] **Step 3: 实现 sanitize.ts**

创建 `packages/rich-content/src/lexical/sanitize.ts`：

```ts
import type { SerializedEditorState } from 'lexical'

interface SerializedNode {
  children?: SerializedNode[]
  type?: string
  [key: string]: unknown
}

function placeholderParagraph(): SerializedNode {
  return {
    children: [
      {
        detail: 0,
        format: 2,
        mode: 'normal',
        style: '',
        text: '〔此内容 · 请在网页中查看〕',
        type: 'text',
        version: 1,
      },
    ],
    direction: null,
    format: '',
    indent: 0,
    textFormat: 0,
    textStyle: '',
    type: 'paragraph',
    version: 1,
  }
}

function sanitizeNode(
  node: SerializedNode,
  registered: Set<string>,
): SerializedNode {
  if (node.type && !registered.has(node.type)) return placeholderParagraph()
  if (Array.isArray(node.children)) {
    return {
      ...node,
      children: node.children.map((child) => sanitizeNode(child, registered)),
    }
  }
  return node
}

export function sanitizeEditorState(
  state: SerializedEditorState,
  registered: Set<string>,
): SerializedEditorState {
  const root = (state as unknown as { root?: SerializedNode }).root
  if (!root) return state
  return {
    ...state,
    root: sanitizeNode(root, registered),
  } as unknown as SerializedEditorState
}
```

- [ ] **Step 4: 跑测试确认通过**

```bash
pnpm --filter @yohaku/rich-content test src/lexical/sanitize.test.ts
```

Expected: 3 passed。

- [ ] **Step 5: 实现块级边界**

创建 `packages/rich-content/src/lexical/block-boundary.tsx`：

```tsx
'use client'

import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  label: string
}

export class BlockBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="my-4 rounded-lg border border-(--color-neutral-3) px-4 py-3 text-(--color-neutral-7) text-copy-13">
        〔{this.props.label} · 渲染失败，请在网页中查看〕
      </div>
    )
  }
}
```

- [ ] **Step 6: 迁移 biz 模块**

```bash
mkdir -p packages/rich-content/src/lexical/biz/{poll,stock,afilmory,map}
git mv apps/web/src/components/ui/rich-content/poll-renderer.tsx \
       packages/rich-content/src/lexical/biz/poll/renderer.tsx
git mv apps/web/src/components/ui/rich-content/poll-module.ts \
       packages/rich-content/src/lexical/biz/poll/module.ts
git mv apps/web/src/components/ui/rich-content/stock/stock-augment.ts \
       packages/rich-content/src/lexical/biz/stock/augment.ts
git mv apps/web/src/components/ui/rich-content/stock/stock-node.ts \
       packages/rich-content/src/lexical/biz/stock/node.ts
git mv apps/web/src/components/ui/rich-content/stock/StockBlock.tsx \
       packages/rich-content/src/lexical/biz/stock/block.tsx
git mv apps/web/src/components/ui/rich-content/stock/_shared.tsx \
       packages/rich-content/src/lexical/biz/stock/shared.tsx
git mv apps/web/src/components/ui/rich-content/stock/StockSnapshotRenderer.tsx \
       packages/rich-content/src/lexical/biz/stock/snapshot-renderer.tsx
git mv apps/web/src/components/ui/rich-content/stock/yohaku-stock-module.ts \
       packages/rich-content/src/lexical/biz/stock/module.ts
git mv apps/web/src/components/ui/rich-content/afilmory \
       packages/rich-content/src/lexical/biz/afilmory
git mv apps/web/src/components/ui/rich-content/map/map-augment.ts \
       packages/rich-content/src/lexical/biz/map/augment.ts
git mv apps/web/src/components/ui/rich-content/map/map-display-node.ts \
       packages/rich-content/src/lexical/biz/map/node.ts
git mv apps/web/src/components/ui/rich-content/map/yohaku-map-module.ts \
       packages/rich-content/src/lexical/biz/map/module.ts
```

`StockKLineRenderer.tsx` 与 `YohakuKLineCard.tsx` **留在 web**（依赖 `lightweight-charts`）。`map/YohakuMapRenderer.tsx` 也**留在 web**（依赖 `next/dynamic`）。

- [ ] **Step 7: 解耦 poll**

`poll-renderer.tsx` 依赖 `~/components/ui/button`。把用到的按钮换成包内的原生 `<button>` + Tailwind class，不要把 web 的 button 组件树搬进来。

`poll-adapter.tsx` **不迁移** —— 它是 react-query 实现，留在 web。包内新建 `packages/rich-content/src/lexical/biz/poll/adapter.ts`，用 `useResource` + `host.fetchJSON` 重新实现同一个 `PollDataAdapter` 接口：

```ts
'use client'

import type { PollDataAdapter, PollState } from '@haklex/rich-compose/modules/poll'

import { useHost } from '../../../host'
import { fetchResource, useResource } from '../../../lib/use-resource'

const fallbackState: PollState = {
  canVote: false,
  closed: false,
  status: 'loading',
  tallies: {},
  totalVotes: 0,
}

export function usePortablePollAdapter(): PollDataAdapter {
  const host = useHost()
  return {
    usePollState: (pollId) => {
      const { data } = useResource(`poll:${pollId}`, () =>
        host.fetchJSON<PollState>(`${host.apiBase}/proxy/polls/${pollId}`),
      )
      return data ?? fallbackState
    },
    useSubmit: (pollId) => async (optionIds) => {
      await fetchResource(`poll-vote:${pollId}:${optionIds.join(',')}`, () =>
        host.fetchJSON<PollState>(`${host.apiBase}/proxy/polls/${pollId}/vote`, {
          body: JSON.stringify({ optionIds }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        }),
      )
    },
  }
}
```

投票成功后需要让 `poll:${pollId}` 失效 —— 在 `useSubmit` 的 await 之后调用 Task 2 已实现的 `invalidateResource(\`poll:${pollId}\`)`，否则票数条不会刷新。

web 保留自己的 `yohakuPollAdapter`（react-query 版）作为 `pollAdapter` prop 传入，两端行为一致但缓存层各用各的。

- [ ] **Step 8: 解耦 stock 与 afilmory**

`stock/shared.tsx`、`snapshot-renderer.tsx` 里的 `useIsDark` 换成 `useHost().theme === 'dark'`，`~/constants/env` 换成 `host.apiBase`，`next-intl` 的 `useTranslations` 换成写死的中文文案（stock 卡片的字段名极少，不值得扩 `labels` 接口）。`~/lib/stock/types` 整个 `git mv` 到 `packages/rich-content/src/lexical/biz/stock/types.ts` 并更新 web 侧引用。

`block.tsx` 按 K 线 / 快照分流：

```tsx
const { slots } = useHost()
if (mode === 'kline' && slots?.StockKLine) {
  return <slots.StockKLine code={code} market={market} />
}
return <StockSnapshotRenderer … />
```

`afilmory/use-afilmory-manifest.ts` 里的四个 `useQuery` 全部换成 `useResource`，`fetch(...)` 换成 `host.fetchJSON(...)`（galleryUrl 是绝对 URL，直接传）。`slot-text/react` 若未在包内安装，一并 `pnpm --filter @yohaku/rich-content add slot-text`。

- [ ] **Step 9: 新写 map 静态占位卡**

创建 `packages/rich-content/src/lexical/biz/map/renderer.tsx`：

```tsx
'use client'

import { useHost } from '../../../host'
import type { MapSlotProps } from '../../../host'

export function YohakuMapRenderer(props: MapSlotProps) {
  const { openLink, slots, webOrigin } = useHost()
  if (slots?.MapBlock) return <slots.MapBlock {...props} />

  return (
    <figure className="not-prose my-6 overflow-hidden rounded-xl bg-(--color-neutral-1) font-sans ring-1 ring-(--color-neutral-3)">
      <div className="px-4 py-6">
        <div className="text-copy-15 text-(--color-neutral-9)">
          {props.title || '地图'}
        </div>
        <div className="text-label-12 mt-1 text-(--color-neutral-7)">
          {props.pois?.length ?? 0} 个地点
        </div>
        <button
          className="text-label-12 mt-3 rounded-lg bg-(--color-neutral-3) px-3 py-1.5 text-(--color-neutral-9)"
          type="button"
          onClick={() => void openLink(webOrigin)}
        >
          在网页中打开
        </button>
      </div>
    </figure>
  )
}
```

`biz/map/module.ts` 改为引用这个 renderer。web 侧通过 `slots.MapBlock` 注入现有的 `next/dynamic` 版本，观感不变。

- [ ] **Step 10: 写 create-renderer.tsx**

创建 `packages/rich-content/src/lexical/create-renderer.tsx`，把 `LexicalContent.tsx` 现有的 `composeRenderer({...})` 调用整块搬过来，改动三处：

1. 所有 override 从包内相对路径 import
2. `builtinNodeOverrides` 里的 `link` / `autolink` / `paragraph` 改为读 `useHost().slots?.InlineLink` 与 `slots?.BlockLinkCard`，未提供时退化为原生 `<a>` 与纯链接
3. 每个 biz 模块的 renderer 用 `<BlockBoundary label="投票">` 之类包裹

同时导出注册类型集合供 `sanitizeEditorState` 使用：

```ts
export const REGISTERED_NODE_TYPES = new Set<string>([...])
```

集合内容从各 module 的 `nodes` 与 `renderers` key 汇总，加上 lexical 内建类型（`root` `paragraph` `text` `heading` `quote` `list` `listitem` `link` `autolink` `linebreak` `tab` `table` `tablerow` `tablecell` `code` `horizontalrule`）。

- [ ] **Step 11: web 切到 create-renderer**

`LexicalContent.tsx` 删掉本地的 `composeRenderer(...)`，改为调用包内 `createYohakuLexicalRenderer()`，并在 host 里补 `slots.InlineLink`（现有 `InlineLinkAnchor` + `Favicon` 的组合）、`slots.BlockLinkCard`（`BlockLinkRenderer`）、`slots.StockKLine`、`slots.MapBlock`。

渲染前先跑 sanitize：

```tsx
const editorState = useMemo(() => {
  try {
    return sanitizeEditorState(JSON.parse(content), REGISTERED_NODE_TYPES)
  } catch {
    return null
  }
}, [content])
```

- [ ] **Step 12: 写契约 fixture 测试**

这是防两端漂移的自动化闸门：一份覆盖全部块类型的 editor state，用「无 slots 的 host」（等价 mobile）渲染一次，断言每种块的标志性 class 都出现。web 端多出的只是 slot 替换，块结构必须一致。

创建 `packages/rich-content/src/lexical/__fixtures__/all-blocks.json`，内容为一份手工构造的 `SerializedEditorState`，root.children 依次包含：`heading`(h2) / `paragraph` / `quote` / `list`(check) / `details` / `table` / `code` / `alert` / `banner` / `poll` / `stock` / `afilmory` / `map` / `mermaid` / `image` / 一个 `type: "totally-unknown"` 的节点。各节点的字段照抄对应 `*-augment.ts` 与 `@haklex` 模块的 `exportJSON` 形状。

创建 `packages/rich-content/src/lexical/create-renderer.test.tsx`：

```tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'

import { HostProvider, type HostCapabilities } from '../host'
import fixture from './__fixtures__/all-blocks.json'
import { createYohakuLexicalRenderer, REGISTERED_NODE_TYPES } from './create-renderer'
import { sanitizeEditorState } from './sanitize'

const mobileHost: HostCapabilities = {
  apiBase: 'https://example.com/api',
  fetchJSON: async () => ({}) as never,
  labels: { nestedDocExpand: '展开', nestedDocLabel: '嵌套文档' },
  nestedDocPresentation: 'inline',
  openImage: () => {},
  openLink: () => {},
  scrollToAnchor: () => {},
  theme: 'light',
  webOrigin: 'https://example.com',
}

const RichContent = createYohakuLexicalRenderer()

function render() {
  const state = sanitizeEditorState(fixture as never, REGISTERED_NODE_TYPES)
  return renderToStaticMarkup(
    <HostProvider host={mobileHost}>
      <RichContent theme="light" value={state} variant="article" />
    </HostProvider>,
  )
}

it.each([
  ['heading', 'rich-heading-h2'],
  ['quote', 'rich-quote-yohaku'],
  ['checklist', 'yohaku-checklist-item'],
  ['details', 'yohaku-details'],
  ['alert', 'rich-alert-yohaku-label'],
  ['banner', 'rich-banner-yohaku-dot'],
])('renders the %s block with its yohaku class', (_name, className) => {
  expect(render()).toContain(className)
})

it('degrades an unregistered node to a placeholder instead of throwing', () => {
  expect(render()).toContain('请在网页中查看')
})

it('falls back to the static map card when no MapBlock slot is provided', () => {
  expect(render()).toContain('在网页中打开')
})
```

若某个 biz 块在 node 环境下渲染需要 DOM，把 `vitest.config.ts` 的 `environment` 改为 `'happy-dom'`。若某块因异步取数在首次渲染只出骨架，就断言其骨架 class 而非最终内容 —— 但**不要**因此把该块从 fixture 里删掉。

- [ ] **Step 13: 跑测试确认通过**

```bash
pnpm --filter @yohaku/rich-content test
```

Expected: 全部 passed。此测试今后是两端一致性的回归闸门。

- [ ] **Step 14: 全量测试 + lint + typecheck**

```bash
pnpm --filter @yohaku/rich-content test
pnpm --filter @yohaku/web exec eslint --fix src/components/ui/rich-content/
pnpm --filter @yohaku/web exec tsc --noEmit
```

- [ ] **Step 15: 人工验证 web 无回归**

`pnpm --filter @yohaku/web dev`，逐一打开含投票、股票（快照与 K 线两种）、相册、地图、画板的文章，确认全部与迁移前一致。特别确认 K 线图与地图仍是完整交互版（走 slot 注入），不是占位卡。

- [ ] **Step 16: 复测体积**

只重跑 Task 0 的 Step 1–2（Step 3 是人工环节，跳过），命令必须带 `EXPO_NO_BUNDLE_SPLITTING=1` 以与基线同口径：

```bash
cd apps/mobile
EXPO_NO_BUNDLE_SPLITTING=1 npx expo export --platform ios --output-dir /tmp/yohaku-task4
for f in $(find /tmp/yohaku-task4 -name '*.js'); do
  echo "$(wc -c < "$f") raw  $(gzip -c "$f" | wc -c) gzip  $f"
done | sort -rn -k1
```

量 `www.bundle/` 下那个 JS 文件（不是 `_expo/static/js/ios/entry-*.hbc`，那是 RN 主包）。在 spec 的基线表追加一行「Task 4 后」。若 DOM bundle 较基线增长超过 40%，在报告里记录，交给 Task 6 决定是否需要额外裁剪。

- [ ] **Step 17: Commit**

```bash
git add -A packages/rich-content apps/web/src docs/superpowers/specs
git commit -m "feat(rich-content): migrate read-only biz renderers with block-level boundaries"
```

---

### Task 5: mobile 接入

**Files:**
- Modify: `apps/mobile/src/components/dom/rich-body.tsx`（重写为薄壳）
- Modify: `apps/mobile/src/screens/details/article-body.tsx`（补 `onScrollToAnchor` prop）
- Modify: `apps/mobile/package.json`（加依赖）
- Create: `apps/mobile/src/components/dom/webview-host.ts`
- Test: `apps/mobile/src/components/dom/webview-host.test.ts`

**Interfaces:**
- Consumes: Task 2 的 `HostCapabilities`；Task 4 的 `createYohakuLexicalRenderer` / `sanitizeEditorState` / `REGISTERED_NODE_TYPES`
- Produces:
  - `export function createWebviewHost(deps: WebviewHostDeps): HostCapabilities`
  - `WebviewHostDeps = { apiBase: string; labels: HostCapabilities['labels']; onImagePress: (p: {images: string[]; index: number; src: string}) => Promise<void>; onLinkPress: (url: string) => Promise<void>; onScrollToAnchor: (id: string) => Promise<void>; theme: 'dark' | 'light'; webOrigin: string }`

- [ ] **Step 1: 加依赖**

```bash
pnpm --filter @yohaku/mobile add @yohaku/rich-content@workspace:*
pnpm --filter @yohaku/mobile add react-tweet exif-js lumeo clsx
```

`react-tweet` 是 `module-imports.ts` 里 `react-tweet/theme.css` 的来源，mobile 已注册 `embedModule` 却一直缺这份样式，顺带补上。

- [ ] **Step 2: 写 webviewHost 的失败测试**

创建 `apps/mobile/src/components/dom/webview-host.test.ts`：

```ts
import { describe, expect, it, vi } from 'vitest'

import { createWebviewHost } from './webview-host'

const deps = {
  apiBase: 'https://mx.innei.in/api/v3',
  labels: { nestedDocExpand: '展开', nestedDocLabel: '嵌套文档' },
  onImagePress: vi.fn(async () => {}),
  onLinkPress: vi.fn(async () => {}),
  onScrollToAnchor: vi.fn(async () => {}),
  theme: 'light' as const,
  webOrigin: 'https://innei.in',
}

describe('createWebviewHost', () => {
  it('declares inline nested-doc presentation', () => {
    expect(createWebviewHost(deps).nestedDocPresentation).toBe('inline')
  })

  it('provides no slots so biz blocks fall back to portable renderers', () => {
    expect(createWebviewHost(deps).slots).toBeUndefined()
  })

  it('forwards only serializable payloads across the bridge', async () => {
    const host = createWebviewHost(deps)
    await host.openImage({ images: ['a', 'b'], index: 1, src: 'b' })
    const [payload] = deps.onImagePress.mock.calls[0]
    expect(() => JSON.stringify(payload)).not.toThrow()
    expect(JSON.parse(JSON.stringify(payload))).toEqual({
      images: ['a', 'b'],
      index: 1,
      src: 'b',
    })
  })
})
```

- [ ] **Step 3: 跑测试确认失败**

```bash
pnpm --filter @yohaku/mobile exec vitest run src/components/dom/webview-host.test.ts
```

Expected: FAIL，模块不存在。注意 mobile 的 `vitest.config.ts` 的 `include` 是 `src/**/*.test.ts`，本文件符合。

- [ ] **Step 4: 实现 webview-host.ts**

创建 `apps/mobile/src/components/dom/webview-host.ts`：

```ts
import type { HostCapabilities } from '@yohaku/rich-content/host'

export interface WebviewHostDeps {
  apiBase: string
  labels: HostCapabilities['labels']
  onImagePress: (payload: {
    images: string[]
    index: number
    src: string
  }) => Promise<void>
  onLinkPress: (url: string) => Promise<void>
  onScrollToAnchor: (id: string) => Promise<void>
  theme: 'dark' | 'light'
  webOrigin: string
}

export function createWebviewHost(deps: WebviewHostDeps): HostCapabilities {
  return {
    apiBase: deps.apiBase,
    fetchJSON: async (url, init) => {
      const target = url.startsWith('http') ? url : `${deps.apiBase}${url}`
      const res = await fetch(target, init)
      if (!res.ok) {
        throw new Error(`fetchJSON failed (${res.status}): ${target}`)
      }
      return res.json()
    },
    labels: deps.labels,
    nestedDocPresentation: 'inline',
    openImage: (payload) => deps.onImagePress(payload),
    openLink: (url) => deps.onLinkPress(url),
    scrollToAnchor: (id) => deps.onScrollToAnchor(id),
    theme: deps.theme,
    webOrigin: deps.webOrigin,
  }
}
```

不传 `slots` —— 所有块落到包内的可移植 / 降级实现。

- [ ] **Step 5: 跑测试确认通过**

```bash
pnpm --filter @yohaku/mobile exec vitest run src/components/dom/webview-host.test.ts
```

Expected: 3 passed。

- [ ] **Step 6: 重写 rich-body.tsx**

把 `rich-body.tsx` 里第 46–142 行（`imageHandler`、`composeRenderer`、`UNSUPPORTED_TYPES`、`placeholderParagraph`、`sanitizeNode`、`parseLexical`）**整块删除**，改为：

```tsx
import '@yohaku/rich-content/module-imports'
import '@yohaku/rich-content/block-styles.css'
import '@yohaku/rich-content/rich.css'
import 'katex/dist/katex.min.css'

import { HostProvider } from '@yohaku/rich-content/host'
import {
  createYohakuLexicalRenderer,
  REGISTERED_NODE_TYPES,
} from '@yohaku/rich-content/lexical'
import { sanitizeEditorState } from '@yohaku/rich-content/src/lexical/sanitize'
```

删掉 `import '@haklex/rich-compose/style.css'`（被 `module-imports` 的精选清单取代）。

props 增加 `onScrollToAnchor: (id: string) => Promise<void>`，并在组件内构造 host：

```tsx
const host = useMemo(
  () =>
    createWebviewHost({
      apiBase: API_BASE,
      labels: { nestedDocExpand: '展开', nestedDocLabel: '嵌套文档' },
      onImagePress,
      onLinkPress,
      onScrollToAnchor,
      theme,
      webOrigin: new URL(webUrl).origin,
    }),
  [onImagePress, onLinkPress, onScrollToAnchor, theme, webUrl],
)
```

editorState 改走 sanitize：

```tsx
const editorState = useMemo(() => {
  if (format !== 'lexical') return null
  try {
    return sanitizeEditorState(JSON.parse(content), REGISTERED_NODE_TYPES)
  } catch {
    return null
  }
}, [content, format])
```

渲染包在 `<HostProvider host={host}>` 内。

保留的部分：viewport meta 注入、`__yohakuReset`、双 rAF 的 `$$match_contents_event` + `yohaku:rendered` 上报、链接点击拦截、`BodyErrorBoundary`、`openInWeb` 兜底、markdown 分支（本次不动）。

- [ ] **Step 7: 注入 `--surface-paper`**

`vars` 对象补两个变量（`--surface-paper` 定义在 web 的 `variables.css` 里，包内 nested-doc 的截断遮罩用到它，mobile 必须显式给）：

```tsx
const vars = {
  '--rc-accent': accent[theme],
  '--rc-link': accent[theme],
  '--rc-text': neutral[theme][9],
  '--rc-bg': 'transparent',
  '--rc-max-width': '100%',
  '--surface-paper': neutral[theme][1],
  color: neutral[theme][9],
} as CSSProperties
```

同时把 `vars` 从只挂在 `.rich-content` 上，提升到 `.rich-body-root` 上，让 `--surface-paper` 对 nested-doc 也可见。

- [ ] **Step 8: 打通 ScrollView ref 链路**

`EdgeEffectScrollView` 当前签名是 `export function EdgeEffectScrollView({ style, ...props }: ScrollViewProps)` —— **不是 forwardRef，ref 传不进去**。锚点滚动需要先把这条链路打通，涉及三个文件。

先改 `apps/mobile/src/components/navigation/edge-effect-scroll-view.tsx`，让它转发 ref（React 19 可直接把 `ref` 当 prop 接）：

```tsx
export function EdgeEffectScrollView({
  ref,
  style,
  ...props
}: ScrollViewProps & { ref?: Ref<ScrollView> }) {
```

并把 `ref` 透传给内部的 `ScrollView`。

再在 `apps/mobile/src/screens/details/post-detail.tsx` 与 `note-detail.tsx` 里各建一个 ref 并同时传给 `EdgeEffectScrollView` 和 `ArticleBody`：

```tsx
const scrollRef = useRef<ScrollView>(null)
…
<EdgeEffectScrollView ref={scrollRef} …>
  …
  <ArticleBody scrollRef={scrollRef} … />
```

最后在 `apps/mobile/src/screens/details/article-body.tsx` 接收 `scrollRef`，维护 `anchorOffsets`，并给 `<RichBody>` 加：

```tsx
onScrollToAnchor={async (id) => {
  const y = anchorOffsets.current[id]
  if (y === undefined) return
  scrollRef.current?.scrollTo({ animated: true, y: Math.max(0, y + bodyTopRef.current) })
}}
```

`bodyTopRef` 是 `<RichBody>` 容器在 ScrollView 内的 y 偏移，用外层 `<View onLayout={(e) => { bodyTopRef.current = e.nativeEvent.layout.y }}>` 取得 —— webview 报上来的 `offsetTop` 是相对 body 的，必须加上这个偏移才是 ScrollView 坐标。`Math.max(0, …)` 是必需的：Fabric 的 `scrollTo` 对负值有 clamp 行为，不夹会滚到意外位置。

`anchorOffsets` 的填充需要 webview 把各标题的 offsetTop 报上来。在 `rich-body.tsx` 的渲染完成 effect 里追加一条 postMessage：

```tsx
bridge?.postMessage(
  JSON.stringify({
    type: 'yohaku:anchors',
    data: Object.fromEntries(
      [...document.querySelectorAll<HTMLElement>('[id]')].map((el) => [
        el.id,
        el.offsetTop,
      ]),
    ),
  }),
)
```

在 `article-body.tsx` 的 `handleMessage` 里处理 `yohaku:anchors`，存进 `anchorOffsets.current`。注意 `handleMessage` 现有的早退分支 `if (payload.type !== 'yohaku:rendered') return` 会吞掉这条消息，必须先加 `yohaku:anchors` 的分支再走那句早退。

- [ ] **Step 9: 构建 CSS 并跑 mobile 测试**

```bash
pnpm --filter @yohaku/rich-content build:css
pnpm --filter @yohaku/rich-content check
pnpm --filter @yohaku/mobile test
```

`check` 必须以 exit 0 结束（产物与源码一致）。

- [ ] **Step 10: lint + typecheck**

```bash
pnpm --filter @yohaku/mobile exec eslint --fix \
  src/components/dom/rich-body.tsx src/components/dom/webview-host.ts \
  src/screens/details/article-body.tsx
pnpm --filter @yohaku/mobile exec tsc --noEmit
```

- [ ] **Step 11: Commit**

```bash
git add -A apps/mobile packages/rich-content/dist
git commit -m "feat(mobile): render article bodies through shared rich-content package"
```

---

### Task 6: mobile 端到端验证与收尾

> **本任务的 Step 1–5 是人工环节**（需要模拟器交互），不由 subagent 执行。执行者只做 Step 6–8（文档与全量检查），并把 Step 1–5 整理成一份待办清单交给人工。

**Files:**
- Modify: `docs/superpowers/specs/2026-08-10-shared-rich-content-package-design.md`（基线表最终行）
- Modify: `CLAUDE.md`（登记新包）
- Modify: `apps/mobile/src/components/dom/webview-pool-warmer.tsx`（若预热内容需同步）

**Interfaces:**
- Consumes: Task 5 的 mobile 接入
- Produces: 无（收尾任务）

- [ ] **Step 1: 起模拟器**

```bash
cd apps/mobile && npx expo run:ios
```

- [ ] **Step 2: 逐块比对**

准备一篇覆盖全部块类型的测试文章（可在 admin 里临时建一篇），在 mobile 与 web 并排打开，逐项确认：

| 块 | mobile 期望 |
|---|---|
| alert / banner | Yohaku 标签样式，与 web 一致 |
| 引用块 | 开引号字形 + attribution |
| 表格 | 表头分隔线 + 横向滚动 |
| 折叠块 / 待办清单 | 与 web 一致 |
| 标题锚点 | 点击后外层 ScrollView 平滑滚到位 |
| 代码块 | 有高亮（走包内默认实现，不必与 web 的 shiki 全量一致） |
| 图片 | 点击调起 RN 图片查看器；EXIF 浮层显示 |
| mermaid | 渲染成图 |
| 嵌套文档 | 点击就地展开（inline，非浮层） |
| 投票 | 显示选项与票数条 |
| 股票 | 静态快照卡（**不是** K 线图） |
| 相册 | 缩略图网格，点击调起查看器 |
| 地图 | 静态占位卡 + 「在网页中打开」 |
| 画板 | 静态场景渲染 |
| 未知类型 | 占位段落，**不白屏** |

- [ ] **Step 3: 验证块级边界生效**

临时把一篇文章的 stock 节点数据改成非法值（或在 `snapshot-renderer.tsx` 里临时 `throw new Error('test')`），确认只有该块变成「〔行情 · 渲染失败〕」，正文其余部分照常渲染。验证后回滚临时改动。

- [ ] **Step 4: 复测体积与时延（人工）**

重跑 Task 0 的 Step 1–3（导出命令必须带 `EXPO_NO_BUNDLE_SPLITTING=1`），在 spec 基线表追加「迁移后」行。

- [ ] **Step 5: 按结果决定是否裁剪**

若冷启动较基线恶化超过 50%，在 spec 的「风险」段落记录实测数字，并新建一个后续 spec 讨论 Metro 分包 / 依赖裁剪。**本计划不在此处展开分包改造** —— 那是独立的一轮工作。

- [ ] **Step 6: 更新仓库文档**

在根 `CLAUDE.md` 的「Project Structure」里加 `packages/rich-content`，并在「Architecture」下补一小节说明包的职责与 `HostCapabilities` 的作用，指向本 spec。

- [ ] **Step 7: 最终全量检查**

```bash
pnpm --filter @yohaku/rich-content test
pnpm --filter @yohaku/rich-content check
pnpm --filter @yohaku/mobile test
pnpm --filter @yohaku/web exec vitest run
pnpm --filter @yohaku/web exec tsc --noEmit
pnpm --filter @yohaku/mobile exec tsc --noEmit
```

全部必须通过。

- [ ] **Step 8: Commit**

```bash
git add -A docs CLAUDE.md apps/mobile
git commit -m "docs: record post-migration baseline and register rich-content package"
```
