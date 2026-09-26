# Typography Scale Redesign · Geist-style Role+px Tokens

**Date**: 2026-05-11
**Trigger**: `apps/web/src/components/modules/note/NoteLeftSidebar.tsx:14` 等处见 hardcoded font-size；全 app 范围内 `text-[Npx]` 凡五十余处，tw `text-xs/sm/base/...` 数百处。Base 14px 之下，tw 默认阶（基于 16）轻微错位（`text-3xl` = 26.25px ≠ 设计师所求 28px），故弃默认改造，立 Vercel Geist 风格之 role+px 双标 token。

## 1. Goals

- 立全 app 字号之**单一真理源**于 `@yohaku/design-system`。
- 弃 tw 默认 `text-xs/sm/base/lg/xl/2xl/3xl/4xl/...`，立角色+px 双标 token（Vercel Geist 风）。
- 弃 hardcoded `text-[Npx]`；lint 硬禁。
- ≤11px 全消除（11 升 12；10 仅 eyebrow 专用，约束使用）。
- `.prose` / markdown.css 改用 `@apply` 适配新 token。
- 单 PR 一次性扫迁，无双轨期。

## 2. Non-Goals

- 不改 html base 14px 之约（含 print 12px、mobile input 16px 锁，三者皆保）。
- 不引入响应式 token（无 `text-copy-14--md` 之类，按需手配 `lg:` 前缀）。
- 不改 dark mode 之处理（字号同，色仍由 `text-neutral-*` 控）。
- 不入 rich content markdown 自有 typography 阶之"权重"调整（仅 size 改 @apply，1.1rem/2.4em 之结构不动）。
- 不改 font-family（仍 sans/serif/mono/logo 四族）。

## 3. Architecture

### 3.1 Token 归属

| 内容 | 居所 | 理由 |
|---|---|---|
| `@theme` typography token | `packages/design-system/src/tokens.css` | 静态契约入 package（与 neutral / accent / font-family 同约） |
| `html { font-size: 14px }` | `apps/web/src/styles/tailwindcss.css` | runtime anchor，非契约 |
| `@media print { html { font-size: 12px } }` | 同上 | display override |
| `@media (min-width: 1024px) { input, textarea }` | 同上 | mobile input lock |
| `.prose { font-size: ... }` | 同上 | rich content runtime，改 @apply 引用新 token |

### 3.2 值表示

- token 以 **px** 字面书（非 rem）。
- 理由：base 14px 之下 rem 多奇分（10/14 = 0.714rem），px 直观；tw v4 `--text-*` 接受 px 字面，arbitrary 类（`text-[14px]`）渲染同值，无视觉漂。

### 3.3 line-height 绑、weight 不绑

- size + line-height **同捆**于 `--text-{role}-{px}` + `--text-{role}-{px}--line-height`，唯一真理源。
- font-weight **独立**施加（`font-medium` / `font-normal`），不入 token；理由：weight 与角色关系弱（heading 偶用 400 italic 等），分管为宜。CJK 禁 `font-bold`（沿用 tokens.md 之约）。

## 4. Token Spec

```css
@theme {
  /* —— 清除 tw 默认 text-* —— */
  --text-*: initial;

  /* —— Caption · eyebrow uppercase 专用（约束使用） —— */
  --text-caption-10: 10px;
  --text-caption-10--line-height: 1.4;        /* 14px */

  /* —— Label · meta / 标签 / 小注 —— */
  --text-label-12: 12px;
  --text-label-12--line-height: 1.5;          /* 18px */

  /* —— Copy · body 族 —— */
  --text-copy-13: 13px;
  --text-copy-13--line-height: 1.54;          /* 20px */
  --text-copy-14: 14px;                       /* ★ base body */
  --text-copy-14--line-height: 1.57;          /* 22px */
  --text-copy-15: 15px;
  --text-copy-15--line-height: 1.6;           /* 24px */
  --text-copy-16: 16px;
  --text-copy-16--line-height: 1.625;         /* 26px */

  /* —— Title · section → 页面 H1 —— */
  --text-title-20: 20px;
  --text-title-20--line-height: 1.4;          /* 28px */
  --text-title-24: 24px;
  --text-title-24--line-height: 1.33;         /* 32px */
  --text-title-28: 28px;
  --text-title-28--line-height: 1.29;         /* 36px */

  /* —— Display · hero / OG —— */
  --text-display-36: 36px;
  --text-display-36--line-height: 1.22;       /* 44px */
  --text-display-48: 48px;
  --text-display-48--line-height: 1.17;       /* 56px */

  /* —— Icon · 非正文 size 通道（不绑 lh） —— */
  --text-icon-sm: 14px;
  --text-icon-md: 16px;
  --text-icon-lg: 18px;
}
```

### 4.1 Role 使用守则

| Role | 用例 | 约束 |
|---|---|---|
| `text-caption-10` | eyebrow uppercase + tracking 之专用标签 | **约束使用** — 仅许 `uppercase tracking-*` 配；他处禁 |
| `text-label-12` | meta、pagination、windsock、hero italic、卡片元数据 | 最常用之小字 |
| `text-copy-13` | 卡片描述、紧凑 body、thinking aside | 略紧之正文 |
| `text-copy-14` | **默认 body**、textarea、card title | base anchor |
| `text-copy-15` | dialog title、search input、thinking item、`.prose` body | 强调 body |
| `text-copy-16` | 大 body | mobile input 不入此（保 css 锁） |
| `text-title-20` | section H、thinking detail subhead | section heading |
| `text-title-24` | sub-H1 | 中型标题 |
| `text-title-28` | 页面 H1（posts / thinking / notes / etc.） | 配 `font-normal` 或 `font-medium` |
| `text-display-36` | hero、OG inline | 显示级 |
| `text-display-48` | OG display title | 最大 |
| `text-icon-{sm,md,lg}` | `<i>` / icon 元素 | 仅 icon；正文 / span 文字禁用（lint 初版宽松，仅警） |

### 4.2 用法举隅

```tsx
<p className="text-copy-14">正文</p>
<span className="text-label-12 text-neutral-7">2026-05-11</span>
<h1 className="text-title-28 font-medium">页面标题</h1>
<i className="i-mingcute-rss-fill text-icon-lg" />
<span className="text-caption-10 uppercase tracking-[1.5px]">EYEBROW</span>
```

## 5. Migration Map

### 5.1 Hardcoded `text-[Npx]` → token

| 旧 | 新 | 备注 |
|---|---|---|
| `text-[10px]` uppercase eyebrow（Hero / OG） | `text-caption-10` | 仅许配 `uppercase tracking-*` |
| `text-[10px]` icon（refresh-2 等） | `text-icon-sm` | 10px icon 异常，升 14 |
| `text-[11px]` 全部 | `text-label-12` | 11px 弃，升 12 |
| `text-[12px]` | `text-label-12` | |
| `text-[13px]` | `text-copy-13` | |
| `text-[14px]` 正文 | `text-copy-14` | |
| `text-[14px]` icon | `text-icon-sm` | |
| `text-[14px]!`（CodeHighlighter） | `text-copy-14!` | 保 important |
| `text-[15px]` | `text-copy-15` | |
| `text-[16px]` 正文 | `text-copy-16` | |
| `text-[16px]` icon（FAB） | `text-icon-md` | |
| `text-[18px]` icon（rss / emoji） | `text-icon-lg` | 正文禁 |
| `text-[20px]` | `text-title-20` | |
| `text-[28px]` | `text-title-28` | |

### 5.2 Tailwind 旧类 → token

| 旧 | 新 |
|---|---|
| `text-xs` | `text-label-12` |
| `text-sm` | `text-copy-13` |
| `text-base` | `text-copy-14` |
| `text-lg` | `text-copy-16` |
| `text-xl` | `text-title-20` |
| `text-2xl` | `text-title-24` |
| `text-3xl` | `text-title-28` |
| `text-4xl` | `text-display-36` |

`text-5xl` 及以上现状无用例（grep 实证），不入映射；如他日需，按需扩 `display-{N}`。

### 5.3 OG inline `fontSize` 迁移

`apps/web/src/app/[locale]/og/route.tsx` 与 `home-og/route.tsx` 用 inline `fontSize: '28px' / '36px' / '56px' / '60px' / '72px'`：

- ≤ 11px equivalent → 升 12 或更高
- 其他依 ramp 阶折至 `28 / 36 / 48` 一档
- `56px` / `60px` / `72px` 三处合并至 `48`（display-48 为最大档）
- inline 值仍写 px 字面（OG renderer 不解 var），但取自 ramp 阶。

### 5.4 `.prose` / markdown.css 改 @apply

**tailwindcss.css**：

```css
.prose {
  @apply text-copy-15;
  /* 其余规则保（max-width / text-autospace 等） */
}
```

**注 · line-height 变迁**：现 `.prose` 之 line-height 继承自 `html { line-height: 1.5 }`。@apply text-copy-15 后，lh 由 token 控为 1.6（24px / 15px）。长读体验略松，乃改善；如需保 1.5 可附 `leading-[1.5]` 显式覆盖，惟无强诉求则采 1.6 之新阶。

**markdown.css / markdown-variants.css**：

- h1 → `@apply text-title-28 font-medium`
- h2 → `@apply text-title-24 font-medium`
- h3 → `@apply text-title-20 font-medium`
- blockquote subhead `font-size: 14px` → `@apply text-copy-14`
- `font-size: 22px`（实见于 markdown-variants 之 h2 嵌套）→ `@apply text-title-24`（22 距 24 近于 20，且 prose h2 视觉宜稍重）
- `font-size: 11px` → `@apply text-label-12`
- `font-size: 10px` → `@apply text-label-12`（rich content 不入 caption-10，eyebrow 仅许在产品 UI）
- `font-size: 0.6em` 之类（sub / sup） → **保留**，em 单位语义乃相对父尺寸缩放
- `font-size: inherit !important;` → 保留（覆盖第三方 important）
- `font-size: 2em` 之类（如 markdown 题字 2.4em）→ 折算至 `@apply text-title-{N}`

### 5.5 Layer.css / Checkbox.css 内 `font-size: Npx`

`apps/web/src/styles/layer.css`、`checkbox.css` 内之 `font-size: 11px / 10px / 13px / 12px / 14px` 等亦在迁移范围，改 `@apply text-{role}-{px}`。

## 6. Lint & Verification

### 6.1 Design-system check.ts

`packages/design-system/scripts/check.ts` 增 typography 节：

- 扫 `templates/` 内之 `text-\[\d+(\.\d+)?px\]` → fail
- 扫 `templates/` 内之 `\btext-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)\b` → fail
- 扫 CHEATSHEET.md 与 tokens.md 之 typography 节 vs `src/tokens.css` 之 `--text-*` 漂检

### 6.2 apps/web ESLint

新增 ESLint 规则（preference: 单一 `no-restricted-syntax`，或自定 plugin）：

```js
// eslint.config.mjs 之 apps/web override
{
  files: ['apps/web/src/**/*.{tsx,ts,jsx,js}'],
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector: "Literal[value=/\\btext-\\[\\d+(\\.\\d+)?px\\]/]",
        message: '禁 hardcoded text-[Npx]，请用 text-{caption,label,copy,title,display,icon}-{N} token',
      },
      {
        selector: "Literal[value=/\\btext-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)\\b/]",
        message: '弃 tw 默认 text-* 阶，请用 text-{role}-{px} token',
      },
      {
        selector: "TemplateElement[value.raw=/\\btext-\\[\\d+(\\.\\d+)?px\\]/]",
        message: '禁 hardcoded text-[Npx] in template literal',
      },
      {
        selector: "TemplateElement[value.raw=/\\btext-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)\\b/]",
        message: '弃 tw 默认 text-* 阶',
      },
    ],
  },
}
```

无 allowlist（CodeHighlighter `text-[14px]!` 迁后即合规）。

### 6.3 Doc 更新

| 文件 | 改动 |
|---|---|
| `packages/design-system/CHEATSHEET.md` | typography 节重写 — 11 个 token 之 px / lh / 用例表 |
| `packages/design-system/references/tokens.md` | typography 节扩 — role 守则、px 选材、weight 政策、CJK 注意 |
| `packages/design-system/references/typography.md`（新） | 全谱独立文档 — Geist 参照、ramp 选材理由、迁移历史摘记 |
| `packages/design-system/SKILL.md` | routing 加 "type audit" entry — 何时翻阅 typography 节 |
| `CLAUDE.md`（project root） | Color System 节后增 "Typography Scale" 简介 + 指向 design-system |

### 6.4 验证清单

- [ ] `pnpm --filter @yohaku/design-system check` 通过（含 typography 漂检）
- [ ] `pnpm --filter @yohaku/design-system test` 通过
- [ ] `pnpm --filter @yohaku/web lint` 通过（hardcoded / tw 旧类皆零）
- [ ] `pnpm --filter @yohaku/web build` 通过
- [ ] dev server 手验九页：`/`, `/posts`, `/posts/[slug]`, `/notes/[id]`, `/thinking`, `/thinking/[id]`, `/timeline`, `/search`, `/projects`
- [ ] light + dark 各一过；< 1024 mobile input 字号保 16px
- [ ] print preview 试一过（保 12px）

## 7. Implementation Phases

依甲方案（硬切），单 PR 内务，commit 可分：

1. **commit 1**: design-system token 入库 + doc 同步（不动 apps/web）。
2. **commit 2**: codemod 脚本（`scripts/migrate-typography.mjs`，ast-grep 或 jscodeshift）+ 一次性扫迁 `apps/web/src/**/*.tsx`。生成 diff 后人审，调异常。
3. **commit 3**: `.prose` / markdown.css / layer.css / checkbox.css 改 @apply。
4. **commit 4**: OG routes inline `fontSize` 折阶。
5. **commit 5**: lint 收紧（design-system check.ts + apps/web eslint）。
6. **commit 6**: 视觉自测后之修补（如 review 发现某处 lh 偏紧/松）。

## 8. Risks & Mitigations

| 风险 | 缓 |
|---|---|
| Codemod 误改字符串字面（`'text-sm'` 在 string 而非 className 中） | ast-grep / jscodeshift 限 JSX `className` attribute 与 cn() / clsx() 之首参；其余手审 |
| `.prose` @apply 后 markdown 视觉漂 | commit 3 单页对比；保 `text-copy-15` 与 `1.1rem`（约 15.4px）之差 ≤ 0.4px |
| OG renderer 不解 css var，inline 值改后无法跑测试 | OG snapshot 手开 dev `?dryRun` 路径或读 png 比对 |
| 第三方 prose import（如 `@haklex/rich-static-renderer` 内之 prose className）字号亦受 .prose 全局影响 | 此乃既有行为；迁后视觉差仅 0.4px，不阻 |
| ESLint `no-restricted-syntax` 误伤注释字符串 | rule selector 限 `Literal` 与 `TemplateElement`，注释不入；如误伤局部禁用 |

## 9. Out-of-Scope (Future)

- 响应式 token（`text-copy-14--lg`）— 现按需手配，未见普遍诉求。
- light/dark 差异化字号（少数语境如 dark mode 微提 contrast）— 当前不需。
- 自定 font-feature-settings（tabular-nums 之类）— 留 utilities 层，不入 token。
- markdown 内 sup/sub 之 0.6em 改 token — em 单位语义优于 token。

## 10. References

- Vercel Geist · typography tokens (copy-N / label-N / heading-N)
- `packages/design-system/references/tokens.md` § Typography（现 brief 节，本 spec 后扩）
- `apps/web/src/styles/tailwindcss.css`（html base 14、prose、mobile input lock）
- `apps/web/src/styles/layer.css`、`apps/web/src/components/ui/markdown/markdown.css`、`markdown-variants.css`（rich content）
- 现 hardcoded 实测 grep 结果（50 余处 `text-[Npx]`，详 §5.1）
