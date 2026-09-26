# Codeblock UI 统一与实现收敛 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把正文代码块从「白卡片」改为「一条线」的 Yohaku 形态，并把 web / mobile / 共享包三份实现收敛成 `@yohaku/rich-content` 里的一份，同时纳入多文件 code-snippet 节点。

**Architecture:** 共享包新增 `code-shell.tsx`（线 / 头行 / 尾行 / 折叠 / 复制的唯一外壳）与 `code-language.ts`（语言 → label / icon / color 的唯一映射）。`code-block.tsx` 与新增的 `code-snippet.tsx` 都是壳的薄封装。host 只注入 `slots.CodeBlock`（仅特殊语言分派）、`labels`（三条文案）、`theme`。web 删除 Prism 与 `ShikiWrapper`，mobile 删除 `dom/code-block*`。

**Tech Stack:** React 19、TypeScript、Vitest（`packages/rich-content` 用 happy-dom，`apps/web` 用 node）、Shiki core、next-intl（web）/ 自建 `translate`（mobile）、Tailwind v4。

**Spec:** `docs/superpowers/specs/2026-08-31-codeblock-ui-unification-design.md`

## Global Constraints

- **`packages/rich-content` 是符号链接 → `yohaku-oss/packages/rich-content`（git 子模块）。** 该目录下的改动必须在 `yohaku-oss/` 内提交，然后在父仓 `git add yohaku-oss` 并提交 `chore(mobile): bump public iOS source — <latest oss subject>`。`git submodule status yohaku-oss` 以 `+` 开头即未回填。每个涉及共享包的任务，提交步骤都写了这两步。
- **零注释、零 JSDoc**：业务代码不写注释。只有「非预期行为」或「隐藏约束」才允许留一行。
- **只 lint / typecheck 改动过的文件**，不跑全仓。
- **设计 token 硬约束**：禁止 `neutral-50…950`；禁止 `text-xs/sm/base/...` 与 `text-[Npx]`；代码字号用 `text-copy-13`，头尾行文字用 `text-label-12`。
- **线的规格**：1px，`var(--color-neutral-4)`，单色不渐变、不分段、不叠色。全块只有这一个非文字视觉元素。
- **i18n 五 locale 必须齐全**：`en / ja / ko / zh / zh-TW`（web 由 `messages/message-usage.test.ts` 强制）。
- **动效**：不新增 spring 参数，沿用既有 `useExpandHeight`。
- 测试命令：
  - 共享包：`pnpm --filter @yohaku/rich-content exec vitest run <file>`
  - web：`pnpm --filter @yohaku/web exec vitest run <file>`

---

### Task 1: 语言映射表 `code-language.ts`

把 web 的 `constants.tsx`（icon + color）与 mobile 的 `code-block-chrome.ts`（label + color）合并成共享包里的唯一映射，含三级 fallback。

**Files:**
- Create: `packages/rich-content/src/lexical/portable/code-language.ts`
- Create: `packages/rich-content/src/lexical/portable/code-language.test.ts`
- Create: `packages/rich-content/src/lexical/portable/language-icons.tsx`（从 `apps/web/src/components/ui/code-highlighter/language-icons.tsx` 整文件搬迁）

**Interfaces:**
- Consumes: 无
- Produces:
  - `resolveCodeLanguage(language?: string): CodeLanguageInfo`
  - `interface CodeLanguageInfo { label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> | null; color: string | null }`

- [ ] **Step 1: 搬迁 icon 组件文件**

```bash
cp apps/web/src/components/ui/code-highlighter/language-icons.tsx \
   packages/rich-content/src/lexical/portable/language-icons.tsx
```

打开新文件，把 `FluentShieldError20Regular` 的引用去掉（它来自 web 的 `~/components/icons/status`，共享包不引 web 路径）；shell / bash / zsh 走无 icon 的圆点分支。文件里若还有别的 `~/` 开头 import，一并删掉对应组件。

- [ ] **Step 2: 写失败测试**

`packages/rich-content/src/lexical/portable/code-language.test.ts`：

```ts
import { describe, expect, it } from 'vitest'

import { resolveCodeLanguage } from './code-language'

describe('resolveCodeLanguage', () => {
  it('返回品牌 icon 与颜色', () => {
    const info = resolveCodeLanguage('typescript')
    expect(info.label).toBe('TypeScript')
    expect(info.color).toBe('#3178C6')
    expect(info.Icon).not.toBeNull()
  })

  it('解析别名', () => {
    expect(resolveCodeLanguage('ts').label).toBe('TypeScript')
    expect(resolveCodeLanguage('objc').label).toBe('Objective-C')
    expect(resolveCodeLanguage('c++').label).toBe('C++')
    expect(resolveCodeLanguage('zsh').label).toBe('Shell')
  })

  it('有颜色无 icon 时只给颜色', () => {
    const info = resolveCodeLanguage('zsh')
    expect(info.Icon).toBeNull()
    expect(info.color).toBe('#4EAA25')
  })

  it('未知语言原样大写且无颜色', () => {
    const info = resolveCodeLanguage('brainfuck')
    expect(info.label).toBe('BRAINFUCK')
    expect(info.Icon).toBeNull()
    expect(info.color).toBeNull()
  })

  it('无语言时给空 label', () => {
    expect(resolveCodeLanguage(undefined).label).toBe('')
  })
})
```

- [ ] **Step 3: 跑测试确认失败**

Run: `pnpm --filter @yohaku/rich-content exec vitest run src/lexical/portable/code-language.test.ts`
Expected: FAIL，`Failed to resolve import "./code-language"`

- [ ] **Step 4: 实现**

`packages/rich-content/src/lexical/portable/code-language.ts`：

```ts
import type { ComponentType, SVGProps } from 'react'

import {
  SimpleIconsC,
  SimpleIconsCplusplus,
  SimpleIconsCss,
  SimpleIconsHtml5,
  SimpleIconsJavascript,
  SimpleIconsJson,
  SimpleIconsMarkdown,
  SimpleIconsReact,
  SimpleIconsSwift,
  SimpleIconsTypescript,
  VscodeIconsFileTypeObjectivec,
  VscodeIconsFileTypeObjectivecpp,
} from './language-icons'

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>

export interface CodeLanguageInfo {
  Icon: IconComponent | null
  color: string | null
  label: string
}

const ALIASES: Record<string, string> = {
  'c#': 'csharp',
  'c++': 'cpp',
  cjs: 'javascript',
  js: 'javascript',
  jsx: 'javascriptreact',
  md: 'markdown',
  mjs: 'javascript',
  objc: 'objectivec',
  objcpp: 'objectivecpp',
  'objective-c': 'objectivec',
  py: 'python',
  rb: 'ruby',
  rs: 'rust',
  sh: 'shell',
  shellscript: 'shell',
  ts: 'typescript',
  tsx: 'typescriptreact',
  yml: 'yaml',
  zsh: 'shell',
}

const LABELS: Record<string, string> = {
  cpp: 'C++',
  csharp: 'C#',
  css: 'CSS',
  html: 'HTML',
  javascript: 'JavaScript',
  javascriptreact: 'JSX',
  json: 'JSON',
  markdown: 'Markdown',
  nginx: 'nginx',
  objectivec: 'Objective-C',
  objectivecpp: 'Objective-C++',
  python: 'Python',
  ruby: 'Ruby',
  rust: 'Rust',
  shell: 'Shell',
  swift: 'Swift',
  typescript: 'TypeScript',
  typescriptreact: 'TSX',
  yaml: 'YAML',
}

const COLORS: Record<string, string> = {
  c: '#A8B9CC',
  cpp: '#00599C',
  css: '#1572B6',
  html: '#E34F26',
  javascript: '#F7DF1E',
  javascriptreact: '#61DAFB',
  json: '#F7DF1E',
  markdown: '#000000',
  objectivec: '#438EFF',
  objectivecpp: '#438EFF',
  shell: '#4EAA25',
  swift: '#FA7343',
  typescript: '#3178C6',
  typescriptreact: '#61DAFB',
}

const ICONS: Record<string, IconComponent> = {
  c: SimpleIconsC,
  cpp: SimpleIconsCplusplus,
  css: SimpleIconsCss,
  html: SimpleIconsHtml5,
  javascript: SimpleIconsJavascript,
  javascriptreact: SimpleIconsReact,
  json: SimpleIconsJson,
  markdown: SimpleIconsMarkdown,
  objectivec: VscodeIconsFileTypeObjectivec,
  objectivecpp: VscodeIconsFileTypeObjectivecpp,
  swift: SimpleIconsSwift,
  typescript: SimpleIconsTypescript,
  typescriptreact: SimpleIconsReact,
}

export function resolveCodeLanguage(language?: string): CodeLanguageInfo {
  if (!language) return { Icon: null, color: null, label: '' }
  const normalized = language.toLowerCase()
  const id = ALIASES[normalized] ?? normalized
  return {
    Icon: ICONS[id] ?? null,
    color: COLORS[id] ?? null,
    label: LABELS[id] ?? id.toUpperCase(),
  }
}
```

- [ ] **Step 5: 跑测试确认通过**

Run: `pnpm --filter @yohaku/rich-content exec vitest run src/lexical/portable/code-language.test.ts`
Expected: PASS，5 个用例全绿

- [ ] **Step 6: 提交（子模块 + 父仓 gitlink）**

```bash
cd yohaku-oss
git add packages/rich-content/src/lexical/portable/code-language.ts \
        packages/rich-content/src/lexical/portable/code-language.test.ts \
        packages/rich-content/src/lexical/portable/language-icons.tsx
git commit -m "feat(rich-content): 语言 label/icon/color 单一映射表"
cd ..
git add yohaku-oss
git commit -m "chore(mobile): bump public iOS source — feat(rich-content): 语言 label/icon/color 单一映射表"
```

---

### Task 2: host labels 扩展与两端文案

壳需要三条文案。沿用已有的 `host.labels` 机制（`nestedDoc*` 是先例），共享包不引 i18n 依赖。

**Files:**
- Modify: `packages/rich-content/src/host.tsx:141-145`（`labels` 接口）
- Modify: `apps/web/src/messages/{en,ja,ko,zh,zh-TW}/common.json`
- Modify: `apps/web/src/hooks/common/use-web-host.ts:104-108`
- Modify: `apps/mobile/src/i18n/messages/{en,ja,ko,zh,zh-TW}.ts`（`detail` 命名空间）
- Modify: `apps/mobile/src/components/dom/rich-body.tsx:78-88`（`RichBodyLabels`）、`:683`（透传）
- Modify: `apps/mobile/src/components/dom/use-rich-body-labels.ts`

**Interfaces:**
- Consumes: 无
- Produces: `host.labels.codeCopy: string`、`host.labels.codeCopied: string`、`host.labels.codeExpand: string`（含未替换的 `{count}` 占位）

- [ ] **Step 1: 扩展共享包 labels 类型**

`packages/rich-content/src/host.tsx`，把 `labels` 改为：

```ts
  labels: {
    codeCopied: string
    codeCopy: string
    codeExpand: string
    nestedDocCollapse: string
    nestedDocExpand: string
    nestedDocLabel: string
  }
```

- [ ] **Step 2: 五个 web locale 加文案**

在每个 `apps/web/src/messages/<locale>/common.json` 加三个键（与 `nested_doc_*` 同层）：

```jsonc
// zh
"code_copy": "复制",
"code_copied": "已复制",
"code_expand": "展开 · {count} 行",

// zh-TW
"code_copy": "複製",
"code_copied": "已複製",
"code_expand": "展開 · {count} 行",

// en
"code_copy": "Copy",
"code_copied": "Copied",
"code_expand": "Expand · {count} lines",

// ja
"code_copy": "コピー",
"code_copied": "コピー済み",
"code_expand": "展開 · {count} 行",

// ko
"code_copy": "복사",
"code_copied": "복사됨",
"code_expand": "펼치기 · {count}줄"
```

- [ ] **Step 3: web host 注入**

`apps/web/src/hooks/common/use-web-host.ts`，`labels` 对象改为：

```ts
      labels: {
        codeCopied: t('code_copied'),
        codeCopy: t('code_copy'),
        codeExpand: t.raw('code_expand'),
        nestedDocCollapse: t('nested_doc_collapse'),
        nestedDocExpand: t('nested_doc_expand'),
        nestedDocLabel: t('nested_doc_label'),
      },
```

`t.raw` 是必须的：`code_expand` 带 `{count}` 占位，用 `t()` 会因缺参数抛错，壳负责替换。

- [ ] **Step 4: 五个 mobile locale 加文案**

每个 `apps/mobile/src/i18n/messages/<locale>.ts` 的 `detail` 命名空间里，紧跟 `nestedDocCollapse` 之后加：

```ts
    codeCopy: '复制',
    codeCopied: '已复制',
    codeExpand: '展开 · {count} 行',
```

（其余 locale 的译文与 Step 2 的 web 文案一一对应。）

- [ ] **Step 5: mobile labels 透传**

`apps/mobile/src/components/dom/rich-body.tsx`：`RichBodyLabels` 接口加三个字段（按字母序插入）：

```ts
export interface RichBodyLabels {
  codeCopied: string
  codeCopy: string
  codeExpand: string
  fileDownloadFull: string
  ...
```

同文件解构处（约 640 行）加上 `codeCopied, codeCopy, codeExpand`，并把 `createWebviewHost` 的 `labels` 改为：

```ts
        labels: {
          codeCopied,
          codeCopy,
          codeExpand,
          nestedDocCollapse,
          nestedDocExpand,
          nestedDocLabel,
        },
```

`apps/mobile/src/components/dom/use-rich-body-labels.ts` 加三行（`codeExpand` 不传 vars，让 `{count}` 原样留给壳）：

```ts
      codeCopied: translate(locale, 'detail', 'codeCopied'),
      codeCopy: translate(locale, 'detail', 'codeCopy'),
      codeExpand: translate(locale, 'detail', 'codeExpand'),
```

- [ ] **Step 6: 跑 i18n 漂移测试**

Run: `pnpm --filter @yohaku/web exec vitest run src/messages/message-usage.test.ts`
Expected: PASS（五 locale 键齐全）

Run: `pnpm --filter @yohaku/mobile exec vitest run src/i18n/messages.test.ts`
Expected: PASS

- [ ] **Step 7: 修好 host 类型引用**

Run: `pnpm --filter @yohaku/web exec tsc --noEmit`
Expected: 报错只应出现在「构造 `HostCapabilities` 却没给新 labels」的位置。若 `apps/web` 或 `apps/mobile` 的测试 fixture / dev-demo 里另有手写 host 对象（例如 `packages/rich-content/src/lexical/create-renderer.test.tsx` 的 `mobileHost`、`apps/mobile/src/components/dom/webview-host.test.ts`），逐个补上三个字段后重跑至无错。

- [ ] **Step 8: 提交**

```bash
cd yohaku-oss
git add packages/rich-content/src/host.tsx
git commit -m "feat(rich-content): host labels 增加 code copy/expand 文案"
cd ..
git add yohaku-oss apps/web/src/messages apps/web/src/hooks/common/use-web-host.ts \
        apps/mobile/src/i18n/messages apps/mobile/src/components/dom/rich-body.tsx \
        apps/mobile/src/components/dom/use-rich-body-labels.ts
git commit -m "feat(i18n): codeblock 复制与展开文案（web + mobile 五 locale）"
```

---

### Task 3: 块壳组件 `code-shell.tsx`

线 / 头行 / 尾行 / 折叠 / 复制的唯一实现。code-block 与 code-snippet 都用它。

**Files:**
- Create: `packages/rich-content/src/lexical/portable/code-shell.tsx`
- Create: `packages/rich-content/src/lexical/portable/code-shell.test.tsx`

**Interfaces:**
- Consumes: `resolveCodeLanguage`（Task 1）、`host.labels.codeCopy / codeCopied / codeExpand`（Task 2）、既有 `shouldCollapseCode`、`useExpandHeight`
- Produces:

```ts
export function CodeShell(props: {
  code: string
  fold?: boolean
  footerName?: string
  header?: ReactNode
  language?: string
  children: ReactNode
}): JSX.Element
export function CodeLanguageMark(props: { language?: string }): JSX.Element | null
```

`header` 有值时用它替换默认的「icon + 语言名」头行（code-snippet 传 tabs）。`footerName` 有值时强制出尾行（code-snippet 传当前文件名），此时 copy 落在尾行；无值时 copy 在头行。`children` 是已高亮的代码 DOM。

- [ ] **Step 1: 写失败测试**

`packages/rich-content/src/lexical/portable/code-shell.test.tsx`：

```tsx
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { type HostCapabilities, HostProvider } from '../../host'
import { CodeShell } from './code-shell'

const host = {
  labels: {
    codeCopied: '已复制',
    codeCopy: '复制',
    codeExpand: '展开 · {count} 行',
    nestedDocCollapse: '',
    nestedDocExpand: '',
    nestedDocLabel: '',
  },
} as unknown as HostCapabilities

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function render(ui: React.ReactNode) {
  act(() => {
    root.render(<HostProvider host={host}>{ui}</HostProvider>)
  })
}

describe('CodeShell', () => {
  it('短代码：copy 在头行，没有尾行', () => {
    render(
      <CodeShell code="const a = 1" language="typescript">
        <pre>const a = 1</pre>
      </CodeShell>,
    )
    expect(container.querySelector('.yohaku-code__head')?.textContent).toContain('复制')
    expect(container.querySelector('.yohaku-code__foot')).toBeNull()
    expect(container.querySelector('.yohaku-code__head')?.textContent).toContain('TypeScript')
  })

  it('给了 footerName：copy 落尾行，头行不含 copy', () => {
    render(
      <CodeShell code="const a = 1" footerName="renderer.ts" header={<span>tabs</span>}>
        <pre>const a = 1</pre>
      </CodeShell>,
    )
    const foot = container.querySelector('.yohaku-code__foot')
    expect(foot?.textContent).toContain('renderer.ts')
    expect(foot?.textContent).toContain('复制')
    expect(container.querySelector('.yohaku-code__head')?.textContent).not.toContain('复制')
  })

  it('超过 20 行：折叠并显示带行数的展开项', () => {
    const long = Array.from({ length: 30 }, (_, i) => `line ${i}`).join('\n')
    render(
      <CodeShell code={long} language="typescript">
        <pre>{long}</pre>
      </CodeShell>,
    )
    expect(container.querySelector('.yohaku-code--collapsed')).not.toBeNull()
    expect(container.querySelector('.yohaku-code__expand')?.textContent).toBe('展开 · 30 行')
  })

  it('点击展开后折叠态消失', () => {
    const long = Array.from({ length: 30 }, (_, i) => `line ${i}`).join('\n')
    render(
      <CodeShell code={long} language="typescript">
        <pre>{long}</pre>
      </CodeShell>,
    )
    const button = container.querySelector<HTMLButtonElement>('.yohaku-code__expand')!
    act(() => button.click())
    expect(container.querySelector('.yohaku-code--collapsed')).toBeNull()
    expect(container.querySelector('.yohaku-code__expand')).toBeNull()
  })

  it('fold=false 不折叠', () => {
    const long = Array.from({ length: 30 }, (_, i) => `line ${i}`).join('\n')
    render(
      <CodeShell code={long} fold={false} language="typescript">
        <pre>{long}</pre>
      </CodeShell>,
    )
    expect(container.querySelector('.yohaku-code--collapsed')).toBeNull()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @yohaku/rich-content exec vitest run src/lexical/portable/code-shell.test.tsx`
Expected: FAIL，`Failed to resolve import "./code-shell"`

- [ ] **Step 3: 实现**

`packages/rich-content/src/lexical/portable/code-shell.tsx`：

```tsx
'use client'

import { type ReactNode, useEffect, useState } from 'react'

import { useHost } from '../../host'
import { shouldCollapseCode } from './code-collapse'
import { resolveCodeLanguage } from './code-language'
import { useExpandHeight } from './tween-height'

function copyText(text: string): void {
  if (navigator.clipboard?.writeText) {
    void navigator.clipboard.writeText(text).catch(() => legacyCopy(text))
    return
  }
  legacyCopy(text)
}

// WKWebView pages loaded from file:// are not a secure context, so
// navigator.clipboard is unavailable there — fall back to execCommand.
function legacyCopy(text: string): void {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.append(textarea)
  textarea.select()
  document.execCommand('copy')
  textarea.remove()
}

export function CodeLanguageMark({ language }: { language?: string }) {
  const { Icon, color } = resolveCodeLanguage(language)
  if (Icon) return <Icon className="yohaku-code__icon" style={{ color }} />
  return (
    <span
      aria-hidden
      className="yohaku-code__dot"
      style={color ? { background: color } : undefined}
    />
  )
}

function CopyButton({ code }: { code: string }) {
  const { labels } = useHost()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timer)
  }, [copied])

  return (
    <button
      className="yohaku-code__copy"
      type="button"
      onClick={() => {
        copyText(code)
        setCopied(true)
      }}
    >
      {copied ? labels.codeCopied : labels.codeCopy}
    </button>
  )
}

export function CodeShell({
  children,
  code,
  fold = true,
  footerName,
  header,
  language,
}: {
  children: ReactNode
  code: string
  fold?: boolean
  footerName?: string
  header?: ReactNode
  language?: string
}) {
  const { labels } = useHost()
  const { label } = resolveCodeLanguage(language)
  const long = fold && shouldCollapseCode(code)
  const [expandedFor, setExpandedFor] = useState<string | null>(null)
  const collapsed = long && expandedFor !== code
  const { capture, ref } = useExpandHeight(collapsed)
  const hasFooter = footerName !== undefined || collapsed
  const expandLabel = labels.codeExpand.replace(
    '{count}',
    String(code.split('\n').length),
  )

  return (
    <div className={collapsed ? 'yohaku-code yohaku-code--collapsed' : 'yohaku-code'}>
      <div className="yohaku-code__body" ref={ref}>
        <div className="yohaku-code__head">
          {header ?? (
            <span className="yohaku-code__name">
              <CodeLanguageMark language={language} />
              {label}
            </span>
          )}
          {hasFooter ? null : <CopyButton code={code} />}
        </div>
        <div className="yohaku-code__scroll">{children}</div>
      </div>
      {hasFooter ? (
        <div className="yohaku-code__foot">
          {footerName === undefined ? null : (
            <span className="yohaku-code__foot-name">{footerName}</span>
          )}
          {collapsed ? (
            <button
              className="yohaku-code__expand"
              type="button"
              onClick={() => {
                capture()
                setExpandedFor(code)
              }}
            >
              {expandLabel}
            </button>
          ) : null}
          <CopyButton code={code} />
        </div>
      ) : null}
    </div>
  )
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @yohaku/rich-content exec vitest run src/lexical/portable/code-shell.test.tsx`
Expected: PASS，5 个用例全绿

- [ ] **Step 5: 提交**

```bash
cd yohaku-oss
git add packages/rich-content/src/lexical/portable/code-shell.tsx \
        packages/rich-content/src/lexical/portable/code-shell.test.tsx
git commit -m "feat(rich-content): codeblock 统一外壳组件"
cd ..
git add yohaku-oss
git commit -m "chore(mobile): bump public iOS source — feat(rich-content): codeblock 统一外壳组件"
```

---

### Task 4: 新形态样式

重写 `.yohaku-code-*`，删除旧的 `.yohaku-code-block*` 与 `.yohaku-code-fold*`。

**Files:**
- Modify: `packages/rich-content/src/styles/yohaku-block-styles.css:400-470`

**Interfaces:**
- Consumes: Task 3 的类名（`yohaku-code`、`__body`、`__head`、`__name`、`__icon`、`__dot`、`__scroll`、`__copy`、`__foot`、`__foot-name`、`__expand`、`--collapsed`）
- Produces: 无

- [ ] **Step 1: 删除旧规则**

删掉 `.rich-code-block`、`.rich-code-block code`、`.yohaku-code-fold*`、`.yohaku-code-block*` 的全部规则，以及它们上方那段已过时的注释（「mobile 没有 Shiki 依赖」）。

- [ ] **Step 2: 写入新规则**

```css
.yohaku-code {
  position: relative;
  margin: 20px 0;
  padding-left: 1px;
  border-left: 1px solid var(--color-neutral-4);
}

.yohaku-code--collapsed .yohaku-code__body {
  max-height: calc(var(--app-viewport-height, 100vh) * 0.5);
  overflow: hidden;
  mask-image: linear-gradient(to bottom, #000 60%, transparent);
}

.yohaku-code__head,
.yohaku-code__foot {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-left: 18px;
  font-family: var(--font-sans, system-ui);
  font-size: var(--text-label-12, 12px);
  line-height: var(--text-label-12--line-height, 1.5);
  color: var(--color-neutral-7);
}

.yohaku-code__head {
  margin-bottom: 9px;
}

.yohaku-code__foot {
  margin-top: 10px;
}

.yohaku-code__name,
.yohaku-code__foot-name {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.yohaku-code__icon {
  flex: 0 0 14px;
  width: 14px;
  height: 14px;
}

.yohaku-code__dot {
  flex: 0 0 5px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--color-neutral-5);
}

.yohaku-code__copy,
.yohaku-code__expand {
  flex: 0 0 auto;
  padding: 6px 0;
  border: none;
  background: transparent;
  font: inherit;
  color: var(--color-neutral-5);
}

.yohaku-code__copy {
  margin-left: auto;
}

.yohaku-code__expand {
  color: var(--color-neutral-7);
}

.yohaku-code__scroll {
  padding-left: 18px;
  max-width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.yohaku-code__scroll pre {
  margin: 0;
  padding: 0;
  background: transparent !important;
}

.yohaku-code__scroll code {
  display: block;
  width: max-content;
  min-width: 100%;
  padding: 0;
  background: transparent !important;
  color: var(--color-neutral-9);
  font-family: var(--font-mono, monospace);
  font-size: var(--text-copy-13, 13px);
  line-height: var(--text-copy-13--line-height, 1.54);
  tab-size: 2;
  white-space: pre;
}

.yohaku-code .shiki,
.yohaku-code .shiki span {
  background-color: transparent !important;
}

.dark .yohaku-code .shiki,
.dark .yohaku-code .shiki span {
  color: var(--shiki-dark) !important;
}
```

`__copy` 的 `margin-left: auto` 让它在头行与尾行都靠右；尾行有 `__expand` 时顺序是「名字 — 展开 — 复制」，`auto` 只作用在 copy 上，展开项紧跟名字。

- [ ] **Step 3: 确认没有遗留引用**

Run: `grep -rn "yohaku-code-block\|yohaku-code-fold\|rich-code-block" packages apps --include="*.ts*" --include="*.css" | grep -v node_modules`
Expected: 无输出（Task 5 会删掉 `code-block.tsx` 里的最后一处；若此时仍有输出，记下位置，Task 5 处理）

- [ ] **Step 4: 提交**

```bash
cd yohaku-oss
git add packages/rich-content/src/styles/yohaku-block-styles.css
git commit -m "style(rich-content): codeblock 改为单线形态"
cd ..
git add yohaku-oss
git commit -m "chore(mobile): bump public iOS source — style(rich-content): codeblock 改为单线形态"
```

---

### Task 5: `code-block.tsx` 切到新壳

原 `PortableCodeBlock` 自带外壳，现在改成只做「Shiki 高亮 + 套壳」。

**Files:**
- Modify: `packages/rich-content/src/lexical/portable/code-block.tsx`（整文件重写）
- Modify: `packages/rich-content/src/lexical/link-overrides.tsx:166-185`

**Interfaces:**
- Consumes: `CodeShell`（Task 3）
- Produces: `PortableCodeBlock({ code, fold, language })` —— 名字不变，`CodeBlockOverride` 的 fallback 分支照旧引用

- [ ] **Step 1: 重写 code-block.tsx**

```tsx
'use client'

import { useEffect, useState } from 'react'

import { CodeShell } from './code-shell'

function useShikiHtml(code: string, language?: string): string | null {
  const [html, setHtml] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setHtml(null)
    import('./shiki-highlighter')
      .then(async ({ highlightToHtml }) => {
        try {
          return await highlightToHtml(code, language)
        } catch {
          return await highlightToHtml(code)
        }
      })
      .then((out) => {
        if (!cancelled) setHtml(out)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [code, language])

  return html
}

export function PortableCodeBlock({
  code,
  fold = true,
  language,
}: {
  code: string
  fold?: boolean
  language?: string
}) {
  const html = useShikiHtml(code, language)

  return (
    <CodeShell code={code} fold={fold} language={language}>
      {html ? (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <pre>
          <code>{code}</code>
        </pre>
      )}
    </CodeShell>
  )
}
```

- [ ] **Step 2: 跑既有渲染器测试**

Run: `pnpm --filter @yohaku/rich-content exec vitest run src/lexical/create-renderer.test.tsx src/lexical/portable-defaults.test.tsx`
Expected: PASS。若断言里写死了旧类名（`yohaku-code-block`），改成新类名 `yohaku-code`。

- [ ] **Step 3: 确认旧类名彻底消失**

Run: `grep -rn "yohaku-code-block\|yohaku-code-fold\|rich-code-block" packages apps --include="*.ts*" --include="*.css" | grep -v node_modules`
Expected: 无输出

- [ ] **Step 4: 提交**

```bash
cd yohaku-oss
git add packages/rich-content/src/lexical/portable/code-block.tsx \
        packages/rich-content/src/styles/yohaku-block-styles.css
git commit -m "refactor(rich-content): code-block 复用统一外壳"
cd ..
git add yohaku-oss
git commit -m "chore(mobile): bump public iOS source — refactor(rich-content): code-block 复用统一外壳"
```

---

### Task 6: 接管 code-snippet 多文件节点

上游 `rcs-*` DOM 没有尾行位置，纯 CSS 覆盖做不到，所以整体替换 renderer。

**Files:**
- Create: `packages/rich-content/src/lexical/portable/code-snippet.tsx`
- Create: `packages/rich-content/src/lexical/portable/code-snippet.test.tsx`
- Modify: `packages/rich-content/src/lexical/create-renderer.tsx:180-232`
- Modify: `packages/rich-content/src/styles/module-imports.ts`
- Modify: `packages/rich-content/src/styles/yohaku-block-styles.css`（追加 tabs 样式）

**Interfaces:**
- Consumes: `CodeShell`、`CodeLanguageMark`（Task 3）、`resolveCodeLanguage`（Task 1）
- Produces: `YohakuCodeSnippet({ files }: { files: { code: string; filename: string; language?: string }[] })`

- [ ] **Step 1: 写失败测试**

`packages/rich-content/src/lexical/portable/code-snippet.test.tsx`：

```tsx
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { type HostCapabilities, HostProvider } from '../../host'
import { YohakuCodeSnippet } from './code-snippet'

const host = {
  labels: {
    codeCopied: '已复制',
    codeCopy: '复制',
    codeExpand: '展开 · {count} 行',
    nestedDocCollapse: '',
    nestedDocExpand: '',
    nestedDocLabel: '',
  },
} as unknown as HostCapabilities

const FILES = [
  { code: 'const a = 1', filename: 'renderer.ts', language: 'typescript' },
  { code: 'const b = 2', filename: 'Host.tsx', language: 'tsx' },
]

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function render() {
  act(() => {
    root.render(
      <HostProvider host={host}>
        <YohakuCodeSnippet files={FILES} />
      </HostProvider>,
    )
  })
}

describe('YohakuCodeSnippet', () => {
  it('tabs 独占头行，尾行重复当前文件名', () => {
    render()
    expect(container.querySelectorAll('.yohaku-code__tab')).toHaveLength(2)
    expect(container.querySelector('.yohaku-code__foot-name')?.textContent).toBe('renderer.ts')
  })

  it('首个 tab 默认激活', () => {
    render()
    const active = container.querySelector('.yohaku-code__tab--active')
    expect(active?.textContent).toContain('renderer.ts')
  })

  it('切 tab 换代码并换尾行名字', () => {
    render()
    const tabs = container.querySelectorAll<HTMLButtonElement>('.yohaku-code__tab')
    act(() => tabs[1].click())
    expect(container.querySelector('.yohaku-code__foot-name')?.textContent).toBe('Host.tsx')
    expect(container.querySelector('.yohaku-code__tab--active')?.textContent).toContain('Host.tsx')
  })

  it('复制的是当前 tab 的代码', () => {
    render()
    const copied: string[] = []
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: (text: string) => (copied.push(text), Promise.resolve()) },
    })
    const tabs = container.querySelectorAll<HTMLButtonElement>('.yohaku-code__tab')
    act(() => tabs[1].click())
    act(() => container.querySelector<HTMLButtonElement>('.yohaku-code__copy')!.click())
    expect(copied).toEqual(['const b = 2'])
  })

  it('空 files 不渲染', () => {
    act(() => {
      root.render(
        <HostProvider host={host}>
          <YohakuCodeSnippet files={[]} />
        </HostProvider>,
      )
    })
    expect(container.querySelector('.yohaku-code')).toBeNull()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @yohaku/rich-content exec vitest run src/lexical/portable/code-snippet.test.tsx`
Expected: FAIL，`Failed to resolve import "./code-snippet"`

- [ ] **Step 3: 实现**

`packages/rich-content/src/lexical/portable/code-snippet.tsx`：

```tsx
'use client'

import { useEffect, useState } from 'react'

import { CodeLanguageMark, CodeShell } from './code-shell'

export interface CodeSnippetFile {
  code: string
  filename: string
  language?: string
}

function useShikiHtml(code: string, language?: string): string | null {
  const [html, setHtml] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setHtml(null)
    import('./shiki-highlighter')
      .then(async ({ highlightToHtml }) => {
        try {
          return await highlightToHtml(code, language)
        } catch {
          return await highlightToHtml(code)
        }
      })
      .then((out) => {
        if (!cancelled) setHtml(out)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [code, language])

  return html
}

export function YohakuCodeSnippet({ files }: { files: CodeSnippetFile[] }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const active = files[activeIndex] ?? files[0]
  const html = useShikiHtml(active?.code ?? '', active?.language)

  if (!active) return null

  const tabs = (
    <div className="yohaku-code__tabs">
      {files.map((file, index) => (
        <button
          className={
            index === activeIndex
              ? 'yohaku-code__tab yohaku-code__tab--active'
              : 'yohaku-code__tab'
          }
          key={file.filename}
          type="button"
          onClick={() => setActiveIndex(index)}
        >
          <CodeLanguageMark language={file.language} />
          {file.filename}
        </button>
      ))}
    </div>
  )

  return (
    <CodeShell
      code={active.code}
      footerName={active.filename}
      header={tabs}
      language={active.language}
    >
      {html ? (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <pre>
          <code>{active.code}</code>
        </pre>
      )}
    </CodeShell>
  )
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @yohaku/rich-content exec vitest run src/lexical/portable/code-snippet.test.tsx`
Expected: PASS，5 个用例全绿

- [ ] **Step 5: tabs 样式**

在 `yohaku-block-styles.css` 的 `.yohaku-code__head` 规则之后追加：

```css
.yohaku-code__tabs {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.yohaku-code__tabs::-webkit-scrollbar {
  display: none;
}

.yohaku-code__tab {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
  padding: 6px 0;
  border: none;
  background: transparent;
  font: inherit;
  color: var(--color-neutral-5);
  white-space: nowrap;
}

.yohaku-code__tab .yohaku-code__icon,
.yohaku-code__tab .yohaku-code__dot {
  opacity: 0.4;
}

.yohaku-code__tab--active {
  color: var(--color-neutral-9);
  font-weight: 500;
}

.yohaku-code__tab--active .yohaku-code__icon,
.yohaku-code__tab--active .yohaku-code__dot {
  opacity: 1;
}
```

- [ ] **Step 6: 注册覆盖模块**

`packages/rich-content/src/lexical/create-renderer.tsx`：

在 `lexicalCodeBlockModule` 定义之后加：

```tsx
const lexicalCodeSnippetModule: RichRendererModule = {
  ...codeSnippetModule,
  renderers: { CodeSnippet: YohakuCodeSnippet },
}
```

把 `modules` 数组里的 `codeSnippetModule` 换成 `lexicalCodeSnippetModule`，并在文件顶部加 `import { YohakuCodeSnippet } from './portable/code-snippet'`。保留展开 `...codeSnippetModule` 是为了继续沿用上游注册的 Lexical 节点类。

- [ ] **Step 7: 停止引入上游样式**

`packages/rich-content/src/styles/module-imports.ts`：删除 `import '@haklex/rich-compose/style/code-snippet.css'`，并把顶部注释里列出的「已被本地覆盖」模块名单加上 `code-snippet`。

- [ ] **Step 8: 断言渲染器走本地 CodeSnippet**

在 `packages/rich-content/src/lexical/create-renderer.test.tsx` 末尾加：

```tsx
it('code-snippet 走本地渲染器而非上游', () => {
  const html = renderToStaticMarkup(
    <HostProvider host={mobileHost}>
      <RichContent
        editorState={sanitizeEditorState(
          JSON.stringify({
            root: {
              children: [
                {
                  files: [
                    { code: 'const a = 1', filename: 'renderer.ts', language: 'typescript' },
                  ],
                  type: 'code-snippet',
                  version: 1,
                },
              ],
              direction: null,
              format: '',
              indent: 0,
              type: 'root',
              version: 1,
            },
          }),
        )}
      />
    </HostProvider>,
  )
  expect(html).toContain('yohaku-code__tab')
  expect(html).not.toContain('rcs-container')
})
```

若该测试文件里 `RichContent` / `mobileHost` 的变量名与此不同，按文件里既有的渲染辅助函数改写，断言两条保持不变。

Run: `pnpm --filter @yohaku/rich-content exec vitest run src/lexical/create-renderer.test.tsx`
Expected: PASS

- [ ] **Step 9: 提交**

```bash
cd yohaku-oss
git add packages/rich-content/src
git commit -m "feat(rich-content): 接管 code-snippet 多文件渲染"
cd ..
git add yohaku-oss
git commit -m "chore(mobile): bump public iOS source — feat(rich-content): 接管 code-snippet 多文件渲染"
```

---

### Task 7: web 接入并删除 Prism

`CodeBlockRender` 退化为纯语言分派器；Prism 与旧 Shiki 外壳全部删除。

**Files:**
- Modify: `apps/web/src/components/modules/shared/CodeBlock.tsx`
- Delete: `apps/web/src/components/ui/code-highlighter/shiki/ShikiWrapper.tsx`
- Delete: `apps/web/src/components/ui/code-highlighter/shiki/Shiki.css`
- Delete: `apps/web/src/components/ui/code-highlighter/constants.tsx`
- Delete: `apps/web/src/components/ui/code-highlighter/language-icons.tsx`
- Modify: `apps/web/src/components/ui/code-highlighter/CodeHighlighter.tsx`
- Modify: `apps/web/src/components/ui/code-highlighter/index.ts`

**Interfaces:**
- Consumes: `PortableCodeBlock`（Task 5）
- Produces: `CodeBlockRender({ lang, content, attrs, fold })` —— 签名不变，`Markdown.tsx` 与 `LexicalContent.tsx` 的调用点无需改

- [ ] **Step 1: 重写 CodeBlockRender 的默认分支**

`apps/web/src/components/modules/shared/CodeBlock.tsx`：

顶部把 `ShikiHighLighterWrapper`、`PrismHighLighter`、`lazyHighlighter`、`isClientSide`、`parseShouldCollapsedFromAttrs` 的 import 删掉，加：

```tsx
import { PortableCodeBlock } from '@yohaku/rich-content/src/lexical/portable/code-block.tsx'
```

`switch` 的 `default` 分支整体替换为：

```tsx
      default: {
        return (
          <PortableCodeBlock
            code={formatCode(props.content)}
            fold={props.fold !== false}
            language={props.lang}
          />
        )
      }
```

`formatCode` 函数保留（去公共缩进是 markdown 路径需要的）。文件里那段解释 `formatCode` 的中文 JSDoc 一并删掉。

- [ ] **Step 2: 删除 Prism 与旧外壳**

```bash
git rm apps/web/src/components/ui/code-highlighter/shiki/ShikiWrapper.tsx \
       apps/web/src/components/ui/code-highlighter/shiki/Shiki.css \
       apps/web/src/components/ui/code-highlighter/constants.tsx \
       apps/web/src/components/ui/code-highlighter/language-icons.tsx
```

`apps/web/src/components/ui/code-highlighter/CodeHighlighter.tsx`：删除 `PrismHighLighter`、`HighLighterPrismCdn`、`ShikiFallback` 三个导出以及只被它们使用的 `useLoadHighlighter` / `loadScript` / `loadStyleSheet` 引用。若删完文件已空，`git rm` 整个文件并同步清空 `index.ts`。

- [ ] **Step 3: 找出所有断掉的引用**

Run: `pnpm --filter @yohaku/web exec tsc --noEmit`
Expected: 报错集中在引用了已删导出的文件。逐个处理：引用 `PrismHighLighter` / `HighLighterPrismCdn` / `ShikiHighLighterWrapper` / `languageToIconMap` / `languageToColorMap` 的地方，若是正文路径就改用 `PortableCodeBlock`，若是已无用的 dev 组件就删掉。重跑至零错误。

- [ ] **Step 4: 确认 Prism CDN 不再被加载**

Run: `grep -rn "prism" apps/web/src --include="*.ts*" -i | grep -v node_modules`
Expected: 无输出

- [ ] **Step 5: 跑 web 测试与 lint**

Run: `pnpm --filter @yohaku/web exec vitest run`
Expected: PASS

Run: `pnpm --filter @yohaku/web exec eslint --fix apps/web/src/components/modules/shared/CodeBlock.tsx apps/web/src/components/ui/code-highlighter`
Expected: 无 error

- [ ] **Step 6: 提交**

```bash
git add -A apps/web/src/components
git commit -m "refactor(web): codeblock 改用共享外壳，删除 Prism 高亮路径"
```

---

### Task 8: mobile 接入并删除本地实现

**Files:**
- Delete: `apps/mobile/src/components/dom/code-block.tsx`
- Delete: `apps/mobile/src/components/dom/code-block.css`
- Delete: `apps/mobile/src/components/dom/code-block-chrome.ts`
- Delete: `apps/mobile/src/components/dom/code-block-chrome.test.ts`
- Modify: `apps/mobile/src/components/dom/rich-body.tsx`

**Interfaces:**
- Consumes: `PortableCodeBlock`（Task 5）
- Produces: 无

- [ ] **Step 1: 删除本地实现**

```bash
git rm apps/mobile/src/components/dom/code-block.tsx \
       apps/mobile/src/components/dom/code-block.css \
       apps/mobile/src/components/dom/code-block-chrome.ts \
       apps/mobile/src/components/dom/code-block-chrome.test.ts
```

- [ ] **Step 2: 改 rich-body 的 slot**

`apps/mobile/src/components/dom/rich-body.tsx`：把 `import { MobileCodeBlock } from './code-block'` 换成：

```tsx
import { PortableCodeBlock } from '@yohaku/rich-content/src/lexical/portable/code-block.tsx'
```

`createWebviewHost` 的 `codeBlock: MobileCodeBlock` 改为 `codeBlock: PortableCodeBlock`。

同时删掉 `import './code-block.css'`（若存在于该文件或 `webview-host.ts`）。

- [ ] **Step 3: 确认无残留引用**

Run: `grep -rn "MobileCodeBlock\|code-block-chrome\|m-code-block" apps/mobile --include="*.ts*" --include="*.css" | grep -v node_modules`
Expected: 无输出

- [ ] **Step 4: typecheck 与测试**

Run: `pnpm --filter @yohaku/mobile exec tsc --noEmit`
Expected: 零错误

Run: `pnpm --filter @yohaku/mobile exec vitest run src/components/dom`
Expected: PASS

- [ ] **Step 5: 重建 DOM 侧 CSS**

Run: `pnpm --filter @yohaku/rich-content build:css`
Expected: `dist/rich.css` 重新生成（该文件被 gitignore，不提交）

- [ ] **Step 6: 提交**

```bash
git add -A apps/mobile/src/components/dom
git commit -m "refactor(mobile): codeblock 改用共享外壳，删除本地实现"
```

---

### Task 9: 视觉验证 fixture

补一条超过 20 行的长代码与一条多文件 snippet，覆盖折叠态与 tabs 溢出。

**Files:**
- Modify: `apps/web/src/app/dev-demos/lexical/_fixtures/node-cases.ts:277`

**Interfaces:**
- Consumes: `codeBlock(language, code)`、`codeSnippet(files)`（`_fixtures/helpers.ts:214-222`）
- Produces: 无

- [ ] **Step 1: 加长代码与多文件 fixture**

在 `node-cases.ts` 里 `key: 'code-snippet'` 那一条附近加两条：

```ts
  {
    key: 'code-block-long',
    nodes: [
      codeBlock(
        'typescript',
        Array.from({ length: 40 }, (_, i) => `const value${i} = ${i} * 2`).join('\n'),
      ),
    ],
  },
  {
    key: 'code-snippet-overflow',
    nodes: [
      codeSnippet([
        { code: 'const a = 1', filename: 'renderer.ts', language: 'typescript' },
        { code: 'const b = 2', filename: 'Host.tsx', language: 'tsx' },
        { code: 'const c = 3', filename: 'setup.js', language: 'javascript' },
        { code: 'server { }', filename: 'nginx.conf', language: 'nginx' },
      ]),
    ],
  },
```

- [ ] **Step 2: 起 dev server 实际看**

Run: `PORT=2323 pnpm --filter @yohaku/web dev`
打开 `http://localhost:2323/dev-demos/lexical`，逐项确认：

1. 单块只有一条 1px 中性线，无边框 / 阴影 / 背景填充。
2. 头行是 icon + 语言名 + 右端「复制」；点击翻成「已复制」，约 1.5s 翻回。
3. `nginx` 那条走圆点 fallback（绿点，无 icon）。
4. `code-block-long` 折叠，代码与线一起渐隐，下方出现「展开 · 40 行」；点击后展开且该项消失。
5. `code-snippet-overflow` 的 tabs 独占头行、窄屏可横滚；尾行左侧是当前文件名、右侧是复制；切 tab 时两者同步变化。
6. 切到深色主题重复一遍 1–5。

- [ ] **Step 3: mobile 模拟器验证**

Run: `pnpm --filter @yohaku/mobile ios`
打开任意含代码块的文章，确认：窄屏下代码区可独立横向滚动而整页不横滚；折叠与复制可点（热区不小于 44pt）；深色主题正常。

- [ ] **Step 4: 提交**

```bash
git add apps/web/src/app/dev-demos/lexical/_fixtures/node-cases.ts
git commit -m "test(web): 补 codeblock 折叠与多文件 tabs fixture"
```

- [ ] **Step 5: 确认子模块已回填**

Run: `git submodule status yohaku-oss`
Expected: 不以 `+` 开头。若以 `+` 开头，执行 `git add yohaku-oss && git commit -m "chore(mobile): bump public iOS source — <yohaku-oss 最新提交标题>"`。

---

## 附：未纳入本计划的事项

spec「不做」章节所列内容（序列化格式、admin 编辑器、行号、diff 高亮、fold region、语言切换器、其他块的视觉）均不在任何任务中，属于有意排除。
