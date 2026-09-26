# Yohaku Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `@yohaku/design-system` workspace package — single source of truth for static design tokens, AI-readable contract (skill + cheatsheet + references), and HTML mockup templates. Migrate static `@theme` blocks out of `apps/web/src/styles/tailwindcss.css` into the package.

**Architecture:** Two-layer separation — static contract lives in the package (color tier, type, spacing, radius, shadow, backdrop, AI docs, snippets), runtime injection stays in `apps/web` (dynamic accent, page color gradient, fadeable keyframes). Web imports tokens via `@import '@yohaku/design-system/tokens.css';`. A small TypeScript verify script lints token drift and forbidden patterns in templates.

**Tech Stack:** pnpm workspaces, Tailwind v4 (CSS-first config), TypeScript via `tsx` for the verify script, plain HTML for snippet templates.

**Spec:** `docs/superpowers/specs/2026-04-25-yohaku-design-system-design.md`

---

## File Structure

| Path | Responsibility |
|---|---|
| `packages/design-system/package.json` | Workspace package manifest, exports tokens.css + skill |
| `packages/design-system/README.md` | Human entry, brief overview |
| `packages/design-system/SKILL.md` | Claude routing rules (English) |
| `packages/design-system/CHEATSHEET.md` | One-page token + decision quick reference (English) |
| `packages/design-system/src/tokens.css` | Canonical static `@theme` blocks |
| `packages/design-system/references/tokens.md` | Full token spec |
| `packages/design-system/references/components.md` | ui/ catalog and selection rules |
| `packages/design-system/references/anti-patterns.md` | Forbidden / discouraged patterns |
| `packages/design-system/references/mockup-to-react.md` | HTML→React handoff mapping |
| `packages/design-system/templates/scaffold.html` | Empty mockup page wired with tokens |
| `packages/design-system/templates/snippets/*.html` | 8 ready-to-copy section snippets |
| `packages/design-system/scripts/check.ts` | Token drift + template lint |
| `packages/design-system/scripts/check.test.ts` | Tests for the check script |
| `apps/web/src/styles/tailwindcss.css` | Modified: removes static `@theme` blocks, imports them from package |
| `apps/web/package.json` | Modified: adds `"@yohaku/design-system": "workspace:*"` to deps |

---

## Phase 1 — Package skeleton + token migration

### Task 1: Create package directory and manifest

**Files:**
- Create: `packages/design-system/package.json`
- Create: `packages/design-system/README.md`

- [ ] **Step 1: Create the directory**

```bash
mkdir -p packages/design-system/src \
  packages/design-system/references \
  packages/design-system/templates/snippets \
  packages/design-system/scripts
```

- [ ] **Step 2: Write `packages/design-system/package.json`**

```json
{
  "name": "@yohaku/design-system",
  "version": "0.0.1",
  "private": true,
  "description": "Yohaku design system: tokens, AI-readable contract, and HTML mockup templates.",
  "type": "module",
  "exports": {
    "./tokens.css": "./src/tokens.css",
    "./skill": "./SKILL.md",
    "./cheatsheet": "./CHEATSHEET.md"
  },
  "files": [
    "src",
    "references",
    "templates",
    "SKILL.md",
    "CHEATSHEET.md",
    "README.md"
  ],
  "scripts": {
    "check": "tsx scripts/check.ts",
    "test": "tsx --test scripts/check.test.ts"
  },
  "devDependencies": {
    "tsx": "^4.19.0"
  }
}
```

- [ ] **Step 3: Write `packages/design-system/README.md` stub**

```markdown
# @yohaku/design-system

Yohaku 设计系统 · static design contract for the Yohaku monorepo.

## What lives here

- `src/tokens.css` — canonical color/typography/spacing tokens (Tailwind v4 `@theme`)
- `SKILL.md` — Claude Code routing rules
- `CHEATSHEET.md` — one-page quick reference
- `references/` — full specs (tokens, components, anti-patterns, mockup-to-react)
- `templates/` — HTML scaffold + section snippets for mockups

## Consumers

- `apps/web` imports `@yohaku/design-system/tokens.css` from its main Tailwind entry.
- AI agents read `SKILL.md` + `CHEATSHEET.md` + `references/` to produce mockups and React components.

## Verify

```bash
pnpm --filter @yohaku/design-system check
```

Lints token drift between `CHEATSHEET.md` and `src/tokens.css`, plus forbidden patterns in `templates/`.
```

- [ ] **Step 4: Run pnpm install to register the package**

Run: `pnpm install`
Expected: `+ @yohaku/design-system 0.0.1` in install output, symlink at `node_modules/@yohaku/design-system`.

- [ ] **Step 5: Verify the symlink resolves**

Run: `ls -la node_modules/@yohaku/design-system`
Expected: symlink pointing to `../../packages/design-system`.

- [ ] **Step 6: Commit**

```bash
git add packages/design-system/package.json packages/design-system/README.md pnpm-lock.yaml
git commit -m "feat(design-system): scaffold @yohaku/design-system package"
```

---

### Task 2: Add `@yohaku/design-system` as a dependency of `@yohaku/web`

**Files:**
- Modify: `apps/web/package.json`

- [ ] **Step 1: Read the current dependencies block**

Run: `grep -n "@yohaku" apps/web/package.json`
Expected: lists existing `@yohaku/*` deps if any, otherwise no matches.

- [ ] **Step 2: Add `"@yohaku/design-system": "workspace:*"` to the `dependencies` block**

Open `apps/web/package.json`, find the `"dependencies": { ... }` object, add an entry alphabetically:

```json
"@yohaku/design-system": "workspace:*",
```

- [ ] **Step 3: Run pnpm install**

Run: `pnpm install`
Expected: `node_modules/@yohaku/web/node_modules/@yohaku/design-system` symlink resolves (or top-level resolution via hoisting).

- [ ] **Step 4: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml
git commit -m "feat(web): depend on @yohaku/design-system"
```

---

### Task 3: Lift static `@theme` blocks into `packages/design-system/src/tokens.css`

**Files:**
- Create: `packages/design-system/src/tokens.css`

The static blocks are lines 19–76 of `apps/web/src/styles/tailwindcss.css`. They include two `@theme` blocks and the `@custom-variant dark` declaration. They reference one runtime variable each (`--surface-paper`, `--bg-opacity`) that web continues to inject.

- [ ] **Step 1: Write `packages/design-system/src/tokens.css`**

```css
/*
 * @yohaku/design-system · static tokens
 *
 * Canonical Tailwind v4 @theme blocks for the Yohaku monorepo.
 * Runtime overrides for --surface-paper, --bg-opacity, --color-border, and
 * the dynamic accent (--a) live in apps/web (variables.css, theme.css,
 * AccentColorStyleInjector). This file declares only static contract.
 */

@theme inline {
  --color-paper: var(--surface-paper);
  --font-sans:
    var(--app-font-sans), var(--app-font-sans-cjk, system-ui, -apple-system, 'PingFang SC',
    'Microsoft YaHei', 'Segoe UI', Roboto, Helvetica, 'noto sans sc',
    'hiragino sans gb', 'sans-serif', Apple Color Emoji, Segoe UI Emoji,
    Not Color Emoji);
  --font-serif:
    var(--app-font-serif, 'Noto Serif CJK SC', 'Noto Serif SC',
    'Source Han Serif SC', 'Source Han Serif', source-han-serif-sc, SongTi SC,
    SimSum, 'Hiragino Sans GB', system-ui, -apple-system, Segoe UI, Roboto,
    Helvetica, 'Microsoft YaHei', 'WenQuanYi Micro Hei', sans-serif);
  --font-mono:
    'OperatorMonoSSmLig Nerd Font', 'Cascadia Code PL',
    'FantasqueSansMono Nerd Font', 'operator mono', JetBrainsMono,
    'Fira code Retina', 'Fira code', 'Consolas', Monaco, 'Hannotate SC',
    monospace, -apple-system;
}

@theme {
  --color-accent: #33a6b8;

  /* Neutral 色阶 — 素 Pure (3-tier, dark mode auto-inverts in apps/web)
     Tier 1 (1-4): surface/fill   Tier 2 (5-7): border/icon/secondary text   Tier 3 (8-10): body/heading
     n-5 must NEVER be used for text. neutral-50~950 is banned project-wide. */
  --color-neutral-1: #f8f8f8;
  --color-neutral-2: #f0f0f0;
  --color-neutral-3: #e3e3e3;
  --color-neutral-4: #d0d0d0;
  --color-neutral-5: #a8a8a8;
  --color-neutral-6: #787878;
  --color-neutral-7: #5c5c5c;
  --color-neutral-8: #404040;
  --color-neutral-9: #242424;
  --color-neutral-10: #141414;

  --color-info: #007aff;
  --color-success: #34c759;
  --color-warning: #ff9500;
  --color-error: #ff3b30;

  /* border-border utility — value is overridden in apps/web variables.css per theme */
  --color-border: rgba(24, 24, 27, 0.1);

  --color-muted-1: var(--color-neutral-1);
  --color-muted-2: var(--color-neutral-2);
  --color-muted-3: var(--color-neutral-3);
  --color-muted-4: var(--color-neutral-4);
  --color-muted-5: var(--color-neutral-5);
  --color-muted-6: var(--color-neutral-6);
  --color-muted-7: var(--color-neutral-7);
  --color-muted-8: var(--color-neutral-8);
  --color-muted-9: var(--color-neutral-9);
  --color-muted-10: var(--color-neutral-10);

  --color-themed-bg_opacity: var(--bg-opacity);
}

@custom-variant dark (&:where(.dark, .dark *, [data-theme="dark"], [data-theme="dark"] *));
```

- [ ] **Step 2: Verify the file parses (no Tailwind errors yet — will run after Task 4)**

Run: `cat packages/design-system/src/tokens.css | head -5`
Expected: prints the comment header.

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/src/tokens.css
git commit -m "feat(design-system): add canonical tokens.css"
```

---

### Task 4: Replace static blocks in `apps/web/src/styles/tailwindcss.css` with the package import

**Files:**
- Modify: `apps/web/src/styles/tailwindcss.css` (lines 19–76)

- [ ] **Step 1: Open `apps/web/src/styles/tailwindcss.css` and replace lines 19–76 with the import**

Before (lines 19–76 will be removed):

```css
@theme inline {
  --color-paper: var(--surface-paper);
  --font-sans: ...;
  ...
}

@theme {
  --color-accent: #33a6b8;
  ...
}

@custom-variant dark (...);
```

After (single import line replaces all three blocks):

```css
@import '@yohaku/design-system/tokens.css';
```

The full top of the file should now read:

```css
@import 'tailwindcss';
@import 'tw-animate-css';

@config "../../tailwind.config.ts";

@source "./src/**/*.{js,jsx,ts,tsx}";
@source "../../node_modules/@ferrucc-io/emoji-picker/dist/**/*.{js,jsx,ts,tsx}";
@source inline("w-full! w-full");

@plugin "@tailwindcss/typography";

@import './loading.css';
@import './checkbox.css';
@import './layer.css';
@import './animation.css';
@import './image-zoom.css';
@import './yohaku.css';

@import '@yohaku/design-system/tokens.css';

@custom-variant dark (&:where(.dark, .dark *, [data-theme="dark"], [data-theme="dark"] *));

html {
  font-size: 14px;
  ...
```

Wait — the `@custom-variant dark` is now declared inside the package's tokens.css. Remove the duplicate declaration from `apps/web/src/styles/tailwindcss.css` as well. The final state of lines 1–20 should be:

```css
@import 'tailwindcss';
@import 'tw-animate-css';

@config "../../tailwind.config.ts";

@source "./src/**/*.{js,jsx,ts,tsx}";
@source "../../node_modules/@ferrucc-io/emoji-picker/dist/**/*.{js,jsx,ts,tsx}";
@source inline("w-full! w-full");

@plugin "@tailwindcss/typography";

@import './loading.css';
@import './checkbox.css';
@import './layer.css';
@import './animation.css';
@import './image-zoom.css';
@import './yohaku.css';

@import '@yohaku/design-system/tokens.css';

html {
  font-size: 14px;
  line-height: 1.5;
  letter-spacing: 0.01em;
}
```

Everything from `html { ... }` onward (the `@media print`, `.rich-content`, `.prose`, `@layer utilities`, animations, `@utility radio*` etc., lines 78–305 of the original file) stays unchanged.

- [ ] **Step 2: Verify no leftover `@theme` or `@custom-variant` blocks in web's tailwindcss.css**

Run: `grep -n "@theme\|@custom-variant" apps/web/src/styles/tailwindcss.css`
Expected: no output (zero matches).

- [ ] **Step 3: Verify the package import line is present exactly once**

Run: `grep -c "@yohaku/design-system/tokens.css" apps/web/src/styles/tailwindcss.css`
Expected: `1`.

---

### Task 5: Boot the web app and check visual parity

- [ ] **Step 1: Start the dev server**

Run: `pnpm --filter @yohaku/web dev`
Expected: server boots on port 2323 with no Tailwind compile errors.

- [ ] **Step 2: Open the home page in a browser**

Visit: `http://localhost:2323/`

Confirm visually:
- Light mode renders identically to before the migration (same paper background, same accent on links/CTAs, same neutral text shades).
- Toggle dark mode (theme switcher in header). Dark mode renders identically.
- No console errors, no missing CSS variables.

- [ ] **Step 3: Open a content page (post or note) to verify prose styling**

Visit any post or note. Confirm prose, code highlighter, and blockquote-with-accent-bar render unchanged.

- [ ] **Step 4: Stop the dev server and commit**

```bash
git add apps/web/src/styles/tailwindcss.css
git commit -m "refactor(web): import design tokens from @yohaku/design-system"
```

---

## Phase 2 — AI contract (SKILL + CHEATSHEET + references)

### Task 6: Write `packages/design-system/SKILL.md`

**Files:**
- Create: `packages/design-system/SKILL.md`

- [ ] **Step 1: Write the file**

```markdown
---
name: yohaku-design
description: 'Build new Yohaku-style UI: HTML mockups, React components, or mockup→React handoff. Triggers on "make a Yohaku mockup / design a new component / add a hero / modal / sheet / convert mockup to React / audit token compliance / 做一个 Yohaku 风的 mockup / 设计一个新组件 / mockup 转 React / 检查 token 合规".'
---

# yohaku-design

The Yohaku design system: static tokens, component catalog, and section snippets for the Yohaku personal blog. Adapts the Kami constraint-system shape to a webapp context.

## Step 1 · Identify the task

| User says | Task tier | Read |
|---|---|---|
| "make a mockup for X" / "design a new hero / modal / sheet" / "做一个 mockup" | **New mockup** | `CHEATSHEET.md` + `references/tokens.md` + `references/anti-patterns.md` |
| "build component X" / "I need a new Button variant" / "新组件" | **New React component** | `CHEATSHEET.md` + `references/components.md` + `references/anti-patterns.md` |
| "convert this mockup to React" / "mockup 转 React" / "implement this design" | **Handoff** | `references/mockup-to-react.md` + `references/components.md` |
| "audit this file for token compliance" / "is this color right?" / "检查 token 合规" | **Token audit** | `references/anti-patterns.md` + `references/tokens.md` |

If unsure, ask one short question instead of guessing.

## Step 2 · Produce

### New mockup
1. Copy `templates/scaffold.html` to `docs/superpowers/plans/<topic>-mockup.html` (or wherever the user wants).
2. Pick relevant pieces from `templates/snippets/` (hero, list-card, modal, sheet, form, code-block, stat-grid, comment-thread). Copy and adapt.
3. Use only token classes / vars listed in `CHEATSHEET.md`. No raw hex except inside `<style>` blocks where contract applies.
4. Open the file in a browser to verify before declaring done.

### New React component
1. **First** check `references/components.md` and `apps/web/src/components/ui/` to confirm the primitive does not already exist. Reuse beats reinvent.
2. If a new ui/ entry is needed, follow the patterns in `components.md` (file structure, exports, Tailwind variants).
3. Use only the tokens listed in `CHEATSHEET.md`. Never reach for `text-neutral-50…950`.
4. Run `pnpm --filter @yohaku/web lint` on changed files only (do not lint the whole project).

### Handoff
1. Open the mockup HTML and `references/mockup-to-react.md` side by side.
2. Walk the mapping table top-to-bottom: every HTML class / pattern has a target React component or Tailwind class.
3. Replace structure first, styling second. Do not introduce new tokens during handoff.
4. Run `pnpm --filter @yohaku/web lint` on the changed files.

### Token audit
1. Read `references/anti-patterns.md`.
2. Scan the target file for: `text-neutral-50/100/200/.../950`, raw hex literals, `n-5` used as text, hardcoded `font-family`, synthetic `font-weight: bold` on Chinese text.
3. Report a punch list with line numbers and proposed replacements.

## Step 3 · Verify

```bash
pnpm --filter @yohaku/design-system check
```

Lints token drift between the cheatsheet and `src/tokens.css`, plus forbidden patterns in `templates/`. Run before committing changes inside `packages/design-system/`.

## When NOT to use this skill

- Editing application logic, routes, queries, hooks — this skill is design-only.
- Producing PDF / slides / marketing pages — Yohaku is a webapp, use Kami for static documents.
- Restyling `@haklex/*` packages — those have their own `rich-style-token` system.
- Modifying `apps/web/src/styles/yohaku.css` runtime injection — that is application owned, not design contract.

## Languages

This skill, the cheatsheet, and references are English. The web app and its content are Chinese-first. Do not translate the contract docs.
```

- [ ] **Step 2: Commit**

```bash
git add packages/design-system/SKILL.md
git commit -m "docs(design-system): add SKILL.md routing"
```

---

### Task 7: Write `packages/design-system/CHEATSHEET.md`

**Files:**
- Create: `packages/design-system/CHEATSHEET.md`

- [ ] **Step 1: Write the file**

```markdown
# Yohaku Cheatsheet

One-page quick reference. Scan before filling a mockup or restyling a component. Full spec in `references/`.

## Ten invariants

1. Neutrals are three-tier: 1–4 surface/fill, 5–7 border/icon/secondary text, 8–10 body/heading.
2. n-5 must never be used for text. n-6 only for small text. n-7 for secondary text.
3. Tailwind's `neutral-50…950` palette is banned. Use `text-neutral-1…10` only.
4. Accent covers ≤ 5% of any surface. Reserved for CTA, focus ring, and brand mark.
5. Default body color is n-9 (dark mode auto-inverts).
6. Three font roles only: sans, serif, mono. CJK fallback is mandatory wherever Chinese or Japanese can render.
7. Backdrop blur has four levels (thick, default, thin, ultrathin). Do not invent more.
8. Border radius follows Tailwind defaults; `rounded-2xl` is the cap for hero surfaces.
9. Depth comes from ring or whisper shadow. Hard drop shadows are forbidden.
10. Mockup HTML files must `@import` `@yohaku/design-system/tokens.css`. Raw hex outside the contract is a lint failure.

## Color

### Neutral (Pure scale)

| Var | Hex | Tier | Use |
|---|---|---|---|
| `--color-neutral-1` | `#f8f8f8` | 1 (surface) | Page background light, lightest fills |
| `--color-neutral-2` | `#f0f0f0` | 1 (surface) | Card background |
| `--color-neutral-3` | `#e3e3e3` | 1 (surface) | Subtle fill, hover surface |
| `--color-neutral-4` | `#d0d0d0` | 1 (surface) | Strong fill, divider behind icons |
| `--color-neutral-5` | `#a8a8a8` | 2 (border) | Border on solid surfaces. **Never text.** |
| `--color-neutral-6` | `#787878` | 2 (border/icon) | Icon, very small label only |
| `--color-neutral-7` | `#5c5c5c` | 2 (secondary) | Secondary text, captions |
| `--color-neutral-8` | `#404040` | 3 (body) | Body text alt, strong secondary |
| `--color-neutral-9` | `#242424` | 3 (body) | **Default body color** |
| `--color-neutral-10` | `#141414` | 3 (heading) | Headings, max emphasis |

In dark mode `apps/web/src/styles/variables.css` auto-inverts the scale. Use the same `text-neutral-N` classes in both themes.

### Accent and semantic

| Var | Hex | Use |
|---|---|---|
| `--color-accent` | `#33a6b8` (浅葱, light theme base) | CTA, focus, brand mark, blockquote bar. ≤ 5% surface. |
| `--color-info` | `#007aff` | Informational state |
| `--color-success` | `#34c759` | Success state |
| `--color-warning` | `#ff9500` | Warning state |
| `--color-error` | `#ff3b30` | Error state |

The accent is also dynamically injected as `--a` (OKLCH) by `AccentColorStyleInjector` in `apps/web`. Per-page gradients via `PageColorGradient` use a content seed. These are runtime concerns and do not appear in mockups.

### Surface

| Var | Source | Use |
|---|---|---|
| `--color-paper` → `var(--surface-paper)` | runtime in `apps/web/src/styles/variables.css` | Page background (paper) |
| `--color-border` | runtime override per theme | Default border on cards, lists |

## Typography

```css
--font-sans:  Inter (var) → CJK fallback chain (PingFang SC, Microsoft YaHei, Noto Sans SC, Hiragino Sans GB, …)
--font-serif: app-defined → Noto Serif CJK SC → Source Han Serif → SongTi SC → STSong → system serif
--font-mono:  Operator Mono → Cascadia Code PL → JetBrainsMono → Fira Code → Consolas → Monaco → CJK fallback
```

| Tailwind class | Size | Use |
|---|---|---|
| `text-xs` | 0.75rem | Tiny labels |
| `text-sm` | 0.875rem | Captions, secondary UI text |
| `text-base` | 1rem | UI default |
| `text-lg` | 1.125rem | Lead paragraph |
| `text-xl` | 1.25rem | Section title |
| `text-2xl` | 1.5rem | H2 |
| `text-3xl` | 1.875rem | H1 on content pages |
| `text-4xl` | 2.25rem | Hero title |

Body line-height `1.5`. Heading `1.1–1.3`. Letter-spacing on `html` is `0.01em`.

## Spacing & radius

Tailwind defaults. Common conventions:

| Tier | Value | Use |
|---|---|---|
| `gap-1` (4px) | inline icon ↔ text |
| `gap-2` (8px) | tight stacks |
| `gap-3` (12px) | card content |
| `gap-4` (16px) | section content |
| `gap-6` (24px) | between cards in a grid |
| `gap-8` (32px) | major section breaks |

Radius: `rounded` (4px) for chips, `rounded-md` (6px) default, `rounded-lg` (8px) cards, `rounded-xl` (12px) modals, `rounded-2xl` (16px) hero cap.

## Backdrop blur

| Level | Class | Use |
|---|---|---|
| Thick | `backdrop-blur-2xl` | Modal scrim, full-screen sheet |
| Default | `backdrop-blur-xl` | Floating panel, popover |
| Thin | `backdrop-blur-md` | Subtle frosted card on hero |
| Ultrathin | `backdrop-blur-sm` | Sticky header on scroll |

Always pair with semi-transparent surface (`bg-paper/80`, `bg-neutral-1/70` etc.).

## Quick decisions

| Need | Use |
|---|---|
| Body paragraph | `text-neutral-9` |
| Secondary text | `text-neutral-7` |
| Small caption | `text-neutral-6 text-sm` |
| Heading | `text-neutral-10 font-medium` (headings stay 500, never synthetic bold for CJK) |
| Card | `bg-neutral-2 dark:bg-neutral-2 rounded-lg p-4 ring-1 ring-border` |
| Primary CTA | accent fill, white text — see `templates/snippets/hero.html` |
| Secondary button | `bg-neutral-2 hover:bg-neutral-3 text-neutral-9 ring-1 ring-border` |
| Tag / chip | `bg-neutral-2 text-neutral-7 text-xs px-2 py-0.5 rounded-md` |
| Code block | `bg-neutral-1 ring-1 ring-border rounded-md font-mono text-sm` |
| Blockquote | left border accent (`var(--color-accent)`), `text-neutral-7` |
| Section divider | `1px solid var(--color-border)` or `bg-neutral-3 h-px` |

When in doubt: **n-9 carries body, accent carries focus, n-2 carries surface, ring-border carries division.**

## Verification

```bash
pnpm --filter @yohaku/design-system check
```

Validates:
1. Every hex listed in this cheatsheet matches `src/tokens.css`.
2. No `template/**/*.html` file uses `text-neutral-50…950`, raw hex (outside the token contract), or hardcoded `font-family`.
3. Every snippet imports `@yohaku/design-system/tokens.css` (or extends `scaffold.html`).
```

- [ ] **Step 2: Commit**

```bash
git add packages/design-system/CHEATSHEET.md
git commit -m "docs(design-system): add one-page CHEATSHEET"
```

---

### Task 8: Write `packages/design-system/references/tokens.md`

**Files:**
- Create: `packages/design-system/references/tokens.md`

- [ ] **Step 1: Write the file**

```markdown
# Tokens · Full Spec

Companion to `CHEATSHEET.md`. Read this when building a new component or auditing color usage in depth. The cheatsheet is the day-to-day reference; this file is the rationale and edge cases.

## Three-tier neutral system

The pure neutral scale (`#f8f8f8` → `#141414`) has no temperature — true gray with no warm or cool bias. Dark mode automatically inverts the scale via `apps/web/src/styles/variables.css`, so `text-neutral-9` reads as light text on a dark surface without changing the class name.

### Tier 1 · Surface (1–4)

| Var | Hex | Use |
|---|---|---|
| n-1 | `#f8f8f8` | Lightest surface, page background |
| n-2 | `#f0f0f0` | Card surface |
| n-3 | `#e3e3e3` | Hover surface, subtle fill |
| n-4 | `#d0d0d0` | Strong fill behind monochrome icons |

**Tier 1 must never carry text.** A text color this close to the page surface fails contrast even in light mode and inverts unreadably in dark mode.

### Tier 2 · Border / icon / secondary (5–7)

| Var | Hex | Use |
|---|---|---|
| n-5 | `#a8a8a8` | Border on solid surfaces. **Never text.** |
| n-6 | `#787878` | Icon stroke, small label (`<= text-xs`) only |
| n-7 | `#5c5c5c` | Secondary text, caption, metadata |

n-5 reads as gray-on-white border but as gray-on-gray text — invisible in both themes. Reach for n-7 (or n-6 only when constrained to `text-xs`).

### Tier 3 · Body / heading (8–10)

| Var | Hex | Use |
|---|---|---|
| n-8 | `#404040` | Body alt, strong secondary text |
| n-9 | `#242424` | **Default body color** |
| n-10 | `#141414` | Headings, max emphasis |

n-9 is what you reach for by default for any paragraph. n-10 is reserved for headings and the rare "this needs to win the hierarchy fight" moment.

### Banned: Tailwind `neutral-50…950`

The palette ships with Tailwind by default. We override `--color-neutral-N` for `N` in 1..10 and explicitly do **not** export the 50–950 scale. Any class using those values is a lint failure. The verify script blocks them.

## Accent

`--color-accent` is `#33a6b8` (浅葱) in the light theme base. The runtime layer (`AccentColorStyleInjector` in `apps/web`) replaces it with an OKLCH-based dynamic value bound to `--a` so per-user theme accents work without touching tokens.

### Discipline

- **≤ 5% surface coverage.** Accent is for the eye to land on, not to fill in.
- Reserved roles: primary CTA fill, focus ring, brand mark, blockquote bar, link underline (sometimes), focus state on form fields.
- Avoid: accent text in body paragraphs, accent borders on regular cards, accent backgrounds on large surfaces.

### Pairing

| Background | Foreground | Use |
|---|---|---|
| Accent fill | white text | Primary CTA |
| Accent border (`ring-1 ring-accent`) | n-9 text | Focus state on input |
| Accent left bar (4px) | n-9 text | Blockquote, section emphasis |

## Semantic colors

| Var | Hex | Use |
|---|---|---|
| `--color-info` | `#007aff` | Informational toast, info banner, link in admin contexts |
| `--color-success` | `#34c759` | Success toast, confirmation chip |
| `--color-warning` | `#ff9500` | Warning toast, draft state |
| `--color-error` | `#ff3b30` | Error toast, destructive action label |

These are state colors; do not use them for general decoration. Reach for accent or neutrals first.

## Typography

### Three roles only

```
sans:  app default → CJK fallback chain
serif: app default → CJK serif fallback chain
mono:  developer-tier mono → CJK fallback for missing glyph boxes
```

### CJK fallback is mandatory

Any `font-family` used to render Chinese or Japanese must include `Noto Serif CJK SC` (or sans equivalent) in its fallback. Even mono needs a CJK family or you get tofu boxes for missing glyphs.

### Weight

- Body: 400.
- Heading: 500. **Never synthetic bold (`<b>`, `font-bold`) on Chinese text** — it produces uneven faux-bold glyphs in most CJK fonts. Use `font-medium` (500) at most.
- English emphasis: 600 acceptable in narrow contexts (badges, label uppercase).

### Letter-spacing

`html { letter-spacing: 0.01em; }` is global. Tracking adjustments should be local and intentional (e.g., 0.04em uppercase eyebrow labels).

## Spacing & radius

We follow Tailwind v4 defaults:

```
Spacing tier base: 4px
Radius scale: 4px → 6px → 8px → 12px → 16px → 24px (rounded-3xl)
```

Hero surfaces cap at `rounded-2xl` (16px). Anything more rounds away into "playful" territory the brand does not target.

## Backdrop blur (glassmorphism)

Four levels, no improvisation:

| Level | Class | Pixel | Use |
|---|---|---|---|
| Thick | `backdrop-blur-2xl` | 40px | Modal scrim, full-screen sheet |
| Default | `backdrop-blur-xl` | 24px | Floating panel, popover |
| Thin | `backdrop-blur-md` | 12px | Subtle frosted card on hero background |
| Ultrathin | `backdrop-blur-sm` | 4px | Sticky header on scroll |

Pair every blur with a transparent surface that lets the underlying gradient or noise show through.

## Shadow

Two flavors, both subtle:

```css
/* ring (outline) */
ring-1 ring-border

/* whisper shadow */
shadow-[0_4px_24px_rgba(0,0,0,0.05)]
```

Hard drop shadows (`shadow-lg`, `shadow-xl`, `shadow-2xl`) are forbidden in product surfaces. They make Yohaku look like a generic SaaS tool.

## Motion

Motion belongs to `apps/web` (Motion / Framer Motion lazy-loaded). Mockup HTML can use plain CSS transitions:

```css
transition: transform 0.2s ease, opacity 0.2s ease;
```

Easing default is ease (`cubic-bezier(0.25, 0.1, 0.25, 1)`). Spring physics live in React only.
```

- [ ] **Step 2: Commit**

```bash
git add packages/design-system/references/tokens.md
git commit -m "docs(design-system): add tokens.md spec"
```

---

### Task 9: Write `packages/design-system/references/components.md`

**Files:**
- Create: `packages/design-system/references/components.md`

- [ ] **Step 1: Inventory the existing `apps/web/src/components/ui/` directory and use that to populate the component catalog**

Run: `ls apps/web/src/components/ui/`

Capture the names. The catalog in the file below uses the inventory observed during plan authoring. If new ui/ entries have been added since, update the catalog while writing this file.

- [ ] **Step 2: Write the file**

```markdown
# Components · Catalog and Selection

When building React components for Yohaku, **reuse beats reinvent.** This catalog lists the existing primitives in `apps/web/src/components/ui/` and explains when each applies. Before writing a new component, scan this list and verify nothing fits.

## Inventory (as of 2026-04-25)

```
apps/web/src/components/ui/
├── auto-completion/         — typeahead with async suggestions
├── avatar/                  — user avatar with fallback
├── background/              — page-level decorated backgrounds (paper texture, gradients)
├── banner/                  — top-of-content banner strip
├── button/                  — button primitive (variants: primary, secondary, ghost, link)
├── checkbox/                — form checkbox
├── code-editor/             — monaco-style editor surface (admin-side mostly)
├── code-highlighter/        — read-only syntax highlighter for posts
├── collapse/                — accordion / disclosure
├── dialog/                  — confirm / alert dialog (smaller than modal)
├── divider/                 — horizontal / vertical rule
├── dropdown-menu/           — popover menu with items, checkboxes, radios
├── excalidraw/              — embedded sketch board
├── fab/                     — floating action button
├── float-panel/             — persistent floating side panel
├── float-popover/           — hover-anchored popover
├── form/                    — form layout primitives
├── gallery/                 — image gallery grid
├── image/                   — Next.js Image with placeholder + zoom
├── input/                   — text input, textarea
├── katex/                   — math rendering
├── label/                   — form label
├── language-selector/       — language toggle
├── link/                    — internal / external link with hover preview
├── link-card/               — rich URL preview card
├── list/                    — generic list with separators
├── loading/                 — spinner / placeholder
├── markdown/                — markdown renderer
├── markdown-editor/         — markdown editor (admin)
├── masonry/                 — masonry grid
├── media/                   — audio / video player
├── modal/                   — full-screen overlay (larger than dialog)
├── number-transition/       — animated number counter
├── pagination/              — page links
├── portal/                  — React portal wrapper
├── react-component-render/  — render arbitrary React component from string
├── relative-time/           — "3 days ago" formatter
├── rich-content/            — rich content (haklex) surface
├── rich-link/               — rich link block (haklex)
├── scroll-area/             — custom scroll area with thin scrollbar
├── select/                  — dropdown select
├── sheet/                   — bottom sheet / side sheet (mobile-leaning)
├── skeleton/                — loading skeleton
├── spinner/                 — inline spinner
├── switch/                  — toggle switch
├── tabs/                    — tab navigation
├── tag/                     — chip / tag pill
├── text/                    — typography primitive (eyebrow, title, body, etc.)
├── theme-switcher/          — light/dark toggle
├── toast/                   — transient notification
├── transition/              — react-transition wrapper
├── typography/              — heading, lead, etc.
├── user/                    — user identity row
└── viewport/                — responsive viewport helpers
```

Run `ls apps/web/src/components/ui/` to refresh this list before authoring a new component plan.

## Selection rules

### Modal vs Dialog vs Sheet

| Surface | Use |
|---|---|
| **Dialog** (`ui/dialog`) | Confirm / alert / quick prompt. ≤ 1 form field, focus-locked, dismissable. |
| **Modal** (`ui/modal`) | Multi-field form, content viewer, settings page. Larger, focus-locked. |
| **Sheet** (`ui/sheet`) | Mobile bottom sheet or right-edge sheet. Uses backdrop blur, swipeable. |
| **float-popover** | Hover or click-anchored content. Not focus-locked. Small content only. |
| **dropdown-menu** | Action list. Items, checkboxes, radios. Built on top of popover primitives. |

### Button vs Link vs Tag

| Need | Use |
|---|---|
| Action that mutates state | `ui/button` |
| Navigation that changes route | `ui/link` |
| Static label (category, state) | `ui/tag` |
| Action inside a menu | `ui/dropdown-menu` item, not a button |

### Text typography

`ui/text` and `ui/typography` are layered. Prefer the semantic component (`Text.Heading`, `Text.Lead`) over hand-rolled `<h1 className="...">`. The component carries the weight, line-height, color tokens.

## Adding a new ui/ entry

If, after consulting this catalog, no primitive fits:

1. **Confirm with the user before writing.** New ui/ entries are project-wide commitments.
2. Folder: `apps/web/src/components/ui/<kebab-name>/`.
3. Files:
   - `index.tsx` — the primary export
   - `index.css.ts` (or Tailwind className composition with `tailwind-variants`) — styles
4. Use only token classes documented in `CHEATSHEET.md`. Never reach for `text-neutral-50…950`.
5. Compose with existing primitives where possible (e.g., a new "Banner" should consume `ui/divider` rather than reinvent dividers).

## Imports inside `apps/web`

The `~` alias points to `apps/web/src`. Standard import shape:

```tsx
import { Button } from '~/components/ui/button'
import { Modal, ModalContent } from '~/components/ui/modal'
```

Never import from `@yohaku/design-system` in React code — the package only exports CSS tokens, not React. Components live in `apps/web/src/components/ui/`.
```

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/references/components.md
git commit -m "docs(design-system): add components.md catalog"
```

---

### Task 10: Write `packages/design-system/references/anti-patterns.md`

**Files:**
- Create: `packages/design-system/references/anti-patterns.md`

- [ ] **Step 1: Write the file**

```markdown
# Anti-Patterns · What Not to Do

The verify script blocks the worst of these mechanically. Treat this list as the reasoning behind those checks plus everything the script can't catch.

## Color

### `text-neutral-50…950` is banned

Tailwind ships a default neutral palette in addition to our own `neutral-1…10`. Using it bypasses the contract:

```html
<!-- Wrong -->
<p class="text-neutral-500">Body copy</p>

<!-- Right -->
<p class="text-neutral-9">Body copy</p>
```

The verify script rejects any token from the 50–950 range. There is no exception.

### n-5 is not a text color

n-5 (`#a8a8a8`) reads as a border on solid surfaces but disappears as text — and the dark-mode inversion makes it worse. Reach for n-7 minimum.

### Raw hex outside the contract

Mockup `<style>` blocks may declare new component-level vars, but they should source values from `var(--color-neutral-N)`, `var(--color-accent)`, etc. A literal hex like `#5c5c5c` should always be replaced by `var(--color-neutral-7)`.

```css
/* Wrong */
.my-card { background: #f0f0f0; }

/* Right */
.my-card { background: var(--color-neutral-2); }
```

### Accent overuse

The accent is a focal device. Once it shows up on more than ~5% of a surface, the eye stops landing anywhere. Audit any view where you find:

- More than one accent CTA per fold.
- Accent borders on multiple cards in a list.
- Accent text in body paragraphs.

## Typography

### Synthetic bold on Chinese text

```html
<!-- Wrong -->
<strong class="font-bold">重要内容</strong>

<!-- Right -->
<strong class="font-medium">重要内容</strong>
```

CJK fonts rarely ship a 700 weight cut. The browser fakes it by stroking the glyph, which produces uneven, blurry boldness. `font-medium` (500) is the cap for CJK.

### Hardcoded `font-family`

Any `font-family: ...` in mockup CSS that does not include the CJK fallback chain breaks rendering for Chinese and Japanese content. Always reach through `var(--font-sans)`, `var(--font-serif)`, or `var(--font-mono)`.

```css
/* Wrong */
h1 { font-family: 'Charter', Georgia, serif; }

/* Right */
h1 { font-family: var(--font-serif); }
```

### Tiny body text

Body should never go below `text-sm` (14px). Tertiary metadata can go to `text-xs` (12px) but only when paired with high-contrast color (n-9, never n-7).

## Layout

### Hard drop shadows

```css
/* Wrong */
.card { box-shadow: 0 8px 24px rgba(0,0,0,0.2); }

/* Right */
.card { box-shadow: 0 4px 24px rgba(0,0,0,0.05); }   /* whisper */
/* or */
.card { @apply ring-1 ring-border; }                 /* ring */
```

Hard shadows make any surface look like a generic SaaS card. Yohaku uses ring-or-whisper.

### Borderless on borderless

Two surfaces in the same tier (e.g., n-1 page bg behind n-2 card) need a border or whisper shadow to separate. Stacking n-2 on n-2 with no division produces an invisible card.

### Maxing out radius

`rounded-3xl` (24px) and beyond reads as decorative. Hero surfaces cap at `rounded-2xl` (16px). Forms, cards, buttons rarely exceed `rounded-lg` (8px).

## Components

### Reinventing existing ui/ primitives

Always check `references/components.md` and `apps/web/src/components/ui/` before writing a new dropdown, modal, or toast. Most surface needs already exist.

### Mixing Modal and Sheet on desktop

Sheets are for mobile (bottom edge, swipeable). Modals are the desktop equivalent. A "modal that slides up from the bottom on desktop" is design fan-fiction; pick one.

### Inline `style={{}}` for tokens

```tsx
// Wrong
<div style={{ color: '#242424', backgroundColor: '#f0f0f0' }}>...</div>

// Right
<div className="text-neutral-9 bg-neutral-2">...</div>
```

Inline styles bypass the contract and make audits harder. The verify script does not currently scan TSX files; reviewers must catch this.

## Process

### Skipping the cheatsheet

If you find yourself reaching for a hex value, a font name, or a spacing tier that doesn't appear in `CHEATSHEET.md`, stop. Either:
1. The need maps to an existing token you missed → re-read the cheatsheet.
2. The need is genuinely new → bring it up before introducing it; design system additions are a deliberate choice, not a side effect.

### Editing tokens.css to "make a class work"

`packages/design-system/src/tokens.css` is the canonical contract. Adding or changing values touches every consumer. Such edits need a spec change, not a one-off PR.
```

- [ ] **Step 2: Commit**

```bash
git add packages/design-system/references/anti-patterns.md
git commit -m "docs(design-system): add anti-patterns.md"
```

---

### Task 11: Write `packages/design-system/references/mockup-to-react.md`

**Files:**
- Create: `packages/design-system/references/mockup-to-react.md`

- [ ] **Step 1: Write the file**

```markdown
# Mockup → React Handoff

A standalone HTML mockup uses Yohaku tokens but plain HTML markup. When the design lands and we move to production code, every mockup pattern has a target React component (or token-bearing Tailwind class).

This file is the translation table.

## General rules

1. **Replace structure first, styling second.** The mockup's class names already use tokens; if you keep the same Tailwind classes, visual fidelity is automatic.
2. **Never introduce new tokens during handoff.** If a token is missing, fix the mockup first to use an existing one.
3. **Reuse `apps/web/src/components/ui/*` aggressively.** Most mockup snippets map to one or two existing primitives.
4. Run `pnpm --filter @yohaku/web lint` on the changed files only — never on the whole project.

## Mapping table

| Mockup pattern | Target React |
|---|---|
| `<button class="bg-accent text-white rounded-md">` | `<Button variant="primary">` from `~/components/ui/button` |
| `<button class="bg-neutral-2 ring-1 ring-border">` | `<Button variant="secondary">` |
| `<button class="hover:bg-neutral-2">` (no fill) | `<Button variant="ghost">` |
| `<a class="text-accent underline">` | `<Link>` from `~/components/ui/link` (handles hover preview, internal/external) |
| `<span class="bg-neutral-2 text-neutral-7 text-xs px-2 py-0.5 rounded-md">` | `<Tag>` from `~/components/ui/tag` |
| `<h1 class="text-3xl font-medium text-neutral-10">` | `<Text.Heading level={1}>` from `~/components/ui/text` (or `<Heading>` from `ui/typography`) |
| `<p class="text-lg text-neutral-7">` (lead) | `<Text.Lead>` |
| `<p class="text-neutral-9">` (body) | plain `<p>`; default body color via `prose` or rely on inherited n-9 |
| `<div class="bg-neutral-2 ring-1 ring-border rounded-lg p-4">` (card) | compose with `<div>` + Tailwind, or use a content-specific primitive (e.g., `link-card` for URL previews) |
| `<dialog class="...">` (mockup confirm) | `<Dialog>` from `~/components/ui/dialog` |
| `<div class="modal-overlay ...">` (mockup full-screen) | `<Modal>` from `~/components/ui/modal` |
| `<div class="sheet ...">` (mockup bottom sheet) | `<Sheet>` from `~/components/ui/sheet` |
| `<details>` (mockup) | `<Collapse>` from `~/components/ui/collapse` |
| `<input>` (mockup form) | `<Input>` from `~/components/ui/input` |
| `<select>` (mockup) | `<Select>` from `~/components/ui/select` |
| `<input type="checkbox">` (mockup) | `<Checkbox>` from `~/components/ui/checkbox` |
| `<input type="radio">` | `<input class="radio">` (the `@utility radio` is defined in `apps/web/src/styles/tailwindcss.css`) |
| `<label>` | `<Label>` from `~/components/ui/label` |
| `<pre><code>...</code></pre>` (mockup) | `<CodeHighlighter>` from `~/components/ui/code-highlighter` for read-only; `<CodeEditor>` for editable |
| Avatar `<img class="rounded-full">` | `<Avatar>` from `~/components/ui/avatar` |
| Time `2 hours ago` static text | `<RelativeTime date={...}>` from `~/components/ui/relative-time` |
| Loading dots / spinner | `<Spinner>` or `<Loading>` |
| Toast / banner | `<Toast>` (transient) or `<Banner>` (persistent) |

## Handoff steps

1. Open the mockup HTML file and the target React file (or create the target file) side by side.
2. Walk the mockup top-to-bottom. For each block:
   - Identify the pattern in the mapping table.
   - Replace the markup with the React component invocation.
   - Carry over any class names that are not absorbed by the component (e.g., positioning, gap, layout).
3. Replace any inline `<style>` blocks. If the mockup carried component-level CSS, fold it into the React component or its sibling `.css.ts` file using existing tokens.
4. Hook up data: replace mockup placeholder text with props or content from the queries layer (`apps/web/src/queries/`).
5. Verify locally (`pnpm --filter @yohaku/web dev`), then run lint on changed files only.

## When the mapping table is silent

If a mockup pattern has no entry above, do **not** invent a new ui/ primitive on the spot. Ask:

1. Is this really new, or did I miss an existing primitive?
2. Is it a one-off composition (e.g., a special hero layout that should live in `apps/web/src/components/modules/` rather than `ui/`)?
3. If a new ui/ primitive is genuinely needed, escalate to the user before writing.

Most "new" patterns are compositions, not primitives.
```

- [ ] **Step 2: Commit**

```bash
git add packages/design-system/references/mockup-to-react.md
git commit -m "docs(design-system): add mockup-to-react.md"
```

---

## Phase 3 — Templates and verify script

### Task 12: Write `packages/design-system/templates/scaffold.html`

**Files:**
- Create: `packages/design-system/templates/scaffold.html`

This is the empty mockup page. Every snippet in `templates/snippets/` is meant to be copied into this scaffold (or into a copy of it placed elsewhere). It must:

1. Import `@yohaku/design-system/tokens.css` so the mockup renders with real tokens — but standalone HTML has no Tailwind compiler. So we inline the `<style>` block with the canonical CSS vars and a small set of utility classes mirrored from Tailwind. **Do not duplicate the full Tailwind utility set.** Mockups should target a small, cheatsheet-aligned class surface.
2. Wire dark-mode toggle via `data-theme="light|dark"`.
3. Set the right font stack and CJK fallbacks.

- [ ] **Step 1: Write the file**

```html
<!doctype html>
<html lang="zh-CN" data-theme="light">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Yohaku Mockup Scaffold</title>
  <style>
    /*
     * Mockup tokens — mirror @yohaku/design-system/src/tokens.css.
     * The verify script (scripts/check.ts) lints these against the package.
     */
    :root {
      --color-neutral-1: #f8f8f8;
      --color-neutral-2: #f0f0f0;
      --color-neutral-3: #e3e3e3;
      --color-neutral-4: #d0d0d0;
      --color-neutral-5: #a8a8a8;
      --color-neutral-6: #787878;
      --color-neutral-7: #5c5c5c;
      --color-neutral-8: #404040;
      --color-neutral-9: #242424;
      --color-neutral-10: #141414;

      --color-accent: #33a6b8;
      --color-info: #007aff;
      --color-success: #34c759;
      --color-warning: #ff9500;
      --color-error: #ff3b30;

      --color-paper: #faf9f5;
      --color-border: rgba(24, 24, 27, 0.1);

      --font-sans: -apple-system, 'PingFang SC', 'Microsoft YaHei',
                   'Noto Sans SC', 'Hiragino Sans GB', system-ui, sans-serif;
      --font-serif: 'Noto Serif CJK SC', 'Source Han Serif SC', SongTi SC,
                    STSong, Georgia, serif;
      --font-mono: 'JetBrains Mono', 'SF Mono', 'Fira Code', Consolas, Monaco,
                   'Hannotate SC', monospace;
    }

    [data-theme='dark'] {
      --color-neutral-1: #141414;
      --color-neutral-2: #242424;
      --color-neutral-3: #404040;
      --color-neutral-4: #5c5c5c;
      --color-neutral-5: #787878;
      --color-neutral-6: #a8a8a8;
      --color-neutral-7: #d0d0d0;
      --color-neutral-8: #e3e3e3;
      --color-neutral-9: #f0f0f0;
      --color-neutral-10: #f8f8f8;

      --color-paper: #18181a;
      --color-border: rgba(255, 255, 255, 0.1);
    }

    * { box-sizing: border-box; }
    html { font-size: 14px; line-height: 1.5; letter-spacing: 0.01em; }
    body {
      margin: 0;
      padding: 0;
      background: var(--color-paper);
      color: var(--color-neutral-9);
      font-family: var(--font-sans);
      min-height: 100vh;
    }

    .mockup-shell { max-width: 960px; margin: 0 auto; padding: 32px 24px; }

    .toolbar {
      position: fixed; top: 12px; right: 12px; z-index: 10;
      background: var(--color-neutral-2);
      border: 1px solid var(--color-border);
      border-radius: 6px;
      padding: 4px 6px;
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--color-neutral-7);
    }
    .toolbar button {
      background: none; border: none; cursor: pointer;
      color: inherit; font: inherit; padding: 2px 6px;
      border-radius: 4px;
    }
    .toolbar button:hover { background: var(--color-neutral-3); }
  </style>
</head>
<body>
  <div class="toolbar">
    <button onclick="document.documentElement.dataset.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'">
      light · dark
    </button>
  </div>

  <main class="mockup-shell">
    <!--
      Drop snippets from packages/design-system/templates/snippets/ here.
      Each snippet uses only the CSS vars declared above.
    -->
  </main>
</body>
</html>
```

- [ ] **Step 2: Open the file in a browser to verify it renders**

```bash
open packages/design-system/templates/scaffold.html
```

Expected: an empty paper surface, dark-toggle in the top-right corner.

- [ ] **Step 3: Toggle dark mode**

Click the toolbar. Expected: the surface flips to dark; tokens auto-invert.

- [ ] **Step 4: Commit**

```bash
git add packages/design-system/templates/scaffold.html
git commit -m "feat(design-system): add scaffold.html mockup template"
```

---

### Task 13: Write `templates/snippets/hero.html`

**Files:**
- Create: `packages/design-system/templates/snippets/hero.html`

- [ ] **Step 1: Write the file**

```html
<!--
  Hero snippet · Yohaku design system
  Copy into <main class="mockup-shell"> of scaffold.html.
  Tokens used: --color-neutral-{2,7,9,10}, --color-accent, --font-serif.
-->
<section style="
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  padding: 48px 0;
  border-bottom: 1px solid var(--color-border);
">
  <p style="
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-accent);
    margin: 0;
  ">余白 · Yohaku</p>

  <h1 style="
    margin: 0;
    font-family: var(--font-serif);
    font-size: 2.25rem;
    font-weight: 500;
    line-height: 1.15;
    color: var(--color-neutral-10);
  ">题如其志，留余白以载所思</h1>

  <p style="
    margin: 0;
    font-size: 1.125rem;
    line-height: 1.55;
    color: var(--color-neutral-7);
    max-width: 56ch;
  ">字字皆择，色不溢于五分。Yohaku 之主页若纸：执三档 neutral，载一抹 accent，余者尽留为白。</p>

  <div style="display: flex; gap: 12px; align-items: center; padding-top: 8px;">
    <button style="
      background: var(--color-accent);
      color: #ffffff;
      border: none;
      border-radius: 6px;
      padding: 10px 20px;
      font: inherit;
      font-weight: 500;
      cursor: pointer;
    ">访 posts</button>

    <button style="
      background: var(--color-neutral-2);
      color: var(--color-neutral-9);
      border: 1px solid var(--color-border);
      border-radius: 6px;
      padding: 10px 20px;
      font: inherit;
      font-weight: 500;
      cursor: pointer;
    ">关于</button>
  </div>
</section>
```

- [ ] **Step 2: Manually verify in scaffold**

Copy the snippet into `scaffold.html`'s `<main>` and reload the file in the browser. Expected: hero with eyebrow accent label, serif title, secondary body text, two buttons.

- [ ] **Step 3: Commit (without the scaffold edit — that was just for verification)**

```bash
git checkout packages/design-system/templates/scaffold.html  # discard scaffold edit if any
git add packages/design-system/templates/snippets/hero.html
git commit -m "feat(design-system): add hero snippet"
```

---

### Task 14: Write `templates/snippets/list-card.html`

**Files:**
- Create: `packages/design-system/templates/snippets/list-card.html`

- [ ] **Step 1: Write the file**

```html
<!--
  List card snippet · Yohaku design system
  Use for posts/notes/says feed items.
  Tokens: --color-neutral-{2,3,7,9,10}, --color-border, --font-mono.
-->
<a href="#" style="
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px 24px;
  padding: 20px 24px;
  background: transparent;
  color: inherit;
  text-decoration: none;
  border-bottom: 1px solid var(--color-border);
  transition: background 0.15s ease;
" onmouseover="this.style.background='var(--color-neutral-2)'" onmouseout="this.style.background='transparent'">

  <h3 style="
    grid-column: 1;
    margin: 0;
    font-size: 1.125rem;
    font-weight: 500;
    color: var(--color-neutral-10);
    line-height: 1.35;
  ">在余白处书写：一篇关于设计系统克制的笔记</h3>

  <span style="
    grid-column: 2;
    grid-row: 1 / span 2;
    align-self: start;
    font-family: var(--font-mono);
    font-size: 0.8125rem;
    color: var(--color-neutral-7);
    white-space: nowrap;
  ">2026-04-25</span>

  <p style="
    grid-column: 1;
    margin: 0;
    color: var(--color-neutral-7);
    line-height: 1.55;
  ">少即多，不是减法的口号，而是每一处加法都被审过的结果。</p>
</a>
```

- [ ] **Step 2: Verify visually**

Copy into scaffold, reload, hover the row to see surface lift to n-2.

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/templates/snippets/list-card.html
git commit -m "feat(design-system): add list-card snippet"
```

---

### Task 15: Write `templates/snippets/modal.html`

**Files:**
- Create: `packages/design-system/templates/snippets/modal.html`

- [ ] **Step 1: Write the file**

```html
<!--
  Modal snippet · Yohaku design system
  Tokens: --color-paper, --color-neutral-{2,7,9,10}, --color-border, backdrop-filter.
-->
<div style="
  position: fixed;
  inset: 0;
  background: color-mix(in srgb, var(--color-neutral-10) 40%, transparent);
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
  display: grid;
  place-items: center;
  z-index: 50;
">
  <div role="dialog" aria-modal="true" style="
    width: min(560px, calc(100vw - 32px));
    background: var(--color-paper);
    border-radius: 12px;
    border: 1px solid var(--color-border);
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.05);
    padding: 24px;
    display: grid;
    gap: 16px;
  ">
    <header>
      <h2 style="
        margin: 0;
        font-size: 1.25rem;
        font-weight: 500;
        color: var(--color-neutral-10);
      ">删此条 say？</h2>
      <p style="margin: 8px 0 0; color: var(--color-neutral-7); line-height: 1.55;">
        删讫不可还原。三人已应此条，删后该评论亦逝。
      </p>
    </header>

    <footer style="display: flex; justify-content: flex-end; gap: 8px;">
      <button style="
        background: var(--color-neutral-2);
        color: var(--color-neutral-9);
        border: 1px solid var(--color-border);
        border-radius: 6px;
        padding: 8px 16px;
        font: inherit;
        cursor: pointer;
      ">取消</button>
      <button style="
        background: var(--color-error);
        color: #ffffff;
        border: none;
        border-radius: 6px;
        padding: 8px 16px;
        font: inherit;
        font-weight: 500;
        cursor: pointer;
      ">删此条</button>
    </footer>
  </div>
</div>
```

- [ ] **Step 2: Verify visually**

Copy into scaffold; the modal should overlay the page with thick backdrop blur.

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/templates/snippets/modal.html
git commit -m "feat(design-system): add modal snippet"
```

---

### Task 16: Write `templates/snippets/sheet.html`

**Files:**
- Create: `packages/design-system/templates/snippets/sheet.html`

- [ ] **Step 1: Write the file**

```html
<!--
  Sheet snippet · Yohaku design system (mobile-leaning bottom sheet)
  Tokens: --color-paper, --color-neutral-{4,7,9,10}, --color-border.
-->
<div style="
  position: fixed;
  inset: 0;
  background: color-mix(in srgb, var(--color-neutral-10) 30%, transparent);
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
  z-index: 50;
">
  <div style="
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--color-paper);
    border-top-left-radius: 16px;
    border-top-right-radius: 16px;
    padding: 12px 24px 32px;
    box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.05);
    max-height: 75vh;
    overflow-y: auto;
  ">
    <div style="
      width: 36px;
      height: 4px;
      background: var(--color-neutral-4);
      border-radius: 2px;
      margin: 0 auto 16px;
    "></div>

    <h2 style="
      margin: 0 0 8px;
      font-size: 1.125rem;
      font-weight: 500;
      color: var(--color-neutral-10);
    ">分享此条</h2>
    <p style="margin: 0 0 16px; color: var(--color-neutral-7); line-height: 1.55;">
      择其一以分享。
    </p>

    <ul style="list-style: none; margin: 0; padding: 0; display: grid; gap: 8px;">
      <li><button style="
        width: 100%;
        text-align: left;
        background: transparent;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        padding: 12px 16px;
        color: var(--color-neutral-9);
        font: inherit;
        cursor: pointer;
      ">复制链接</button></li>
      <li><button style="
        width: 100%;
        text-align: left;
        background: transparent;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        padding: 12px 16px;
        color: var(--color-neutral-9);
        font: inherit;
        cursor: pointer;
      ">分享至 Twitter</button></li>
      <li><button style="
        width: 100%;
        text-align: left;
        background: transparent;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        padding: 12px 16px;
        color: var(--color-neutral-9);
        font: inherit;
        cursor: pointer;
      ">导出为 markdown</button></li>
    </ul>
  </div>
</div>
```

- [ ] **Step 2: Verify visually**

Copy into scaffold; sheet anchors to bottom edge with grab-handle pill.

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/templates/snippets/sheet.html
git commit -m "feat(design-system): add sheet snippet"
```

---

### Task 17: Write `templates/snippets/form.html`

**Files:**
- Create: `packages/design-system/templates/snippets/form.html`

- [ ] **Step 1: Write the file**

```html
<!--
  Form snippet · Yohaku design system
  Tokens: --color-neutral-{2,7,9,10}, --color-border, --color-accent.
-->
<form style="
  display: grid;
  gap: 16px;
  max-width: 480px;
" onsubmit="event.preventDefault()">

  <div style="display: grid; gap: 6px;">
    <label for="comment-name" style="
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-neutral-9);
    ">名</label>
    <input id="comment-name" type="text" placeholder="如何称呼你" style="
      width: 100%;
      padding: 10px 12px;
      background: var(--color-neutral-2);
      border: 1px solid var(--color-border);
      border-radius: 6px;
      font: inherit;
      color: var(--color-neutral-9);
      outline: none;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    " onfocus="this.style.borderColor='var(--color-accent)'; this.style.boxShadow='0 0 0 3px color-mix(in srgb, var(--color-accent) 15%, transparent)'"
      onblur="this.style.borderColor='var(--color-border)'; this.style.boxShadow='none'">
  </div>

  <div style="display: grid; gap: 6px;">
    <label for="comment-mail" style="
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-neutral-9);
    ">邮箱 <span style="color: var(--color-neutral-7); font-weight: 400;">(不公开)</span></label>
    <input id="comment-mail" type="email" placeholder="you@example.com" style="
      width: 100%;
      padding: 10px 12px;
      background: var(--color-neutral-2);
      border: 1px solid var(--color-border);
      border-radius: 6px;
      font: inherit;
      color: var(--color-neutral-9);
      outline: none;
    ">
  </div>

  <div style="display: grid; gap: 6px;">
    <label for="comment-body" style="
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-neutral-9);
    ">所言</label>
    <textarea id="comment-body" rows="4" placeholder="写下你的想法" style="
      width: 100%;
      padding: 10px 12px;
      background: var(--color-neutral-2);
      border: 1px solid var(--color-border);
      border-radius: 6px;
      font: inherit;
      font-family: inherit;
      color: var(--color-neutral-9);
      outline: none;
      resize: vertical;
    "></textarea>
  </div>

  <div style="display: flex; justify-content: flex-end;">
    <button type="submit" style="
      background: var(--color-accent);
      color: #ffffff;
      border: none;
      border-radius: 6px;
      padding: 10px 20px;
      font: inherit;
      font-weight: 500;
      cursor: pointer;
    ">发表</button>
  </div>
</form>
```

- [ ] **Step 2: Verify visually**

Copy into scaffold; focus an input — accent ring should appear.

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/templates/snippets/form.html
git commit -m "feat(design-system): add form snippet"
```

---

### Task 18: Write `templates/snippets/code-block.html`

**Files:**
- Create: `packages/design-system/templates/snippets/code-block.html`

- [ ] **Step 1: Write the file**

```html
<!--
  Code block snippet · Yohaku design system
  Tokens: --color-neutral-{1,2,7,9}, --color-border, --font-mono.
-->
<figure style="
  margin: 24px 0;
  background: var(--color-neutral-1);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
">
  <header style="
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    background: var(--color-neutral-2);
    border-bottom: 1px solid var(--color-border);
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--color-neutral-7);
  ">
    <span>tailwindcss.css</span>
    <button style="
      background: none;
      border: none;
      cursor: pointer;
      color: var(--color-neutral-7);
      font: inherit;
      padding: 2px 6px;
      border-radius: 4px;
    " onmouseover="this.style.background='var(--color-neutral-3)'" onmouseout="this.style.background='none'">复制</button>
  </header>

  <pre style="
    margin: 0;
    padding: 16px 20px;
    overflow-x: auto;
    font-family: var(--font-mono);
    font-size: 0.8125rem;
    line-height: 1.6;
    color: var(--color-neutral-9);
  "><code>@import 'tailwindcss';
@import '@yohaku/design-system/tokens.css';

html { font-size: 14px; }</code></pre>
</figure>
```

- [ ] **Step 2: Verify visually**

Copy into scaffold; mono font should render, header bar with filename + copy button.

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/templates/snippets/code-block.html
git commit -m "feat(design-system): add code-block snippet"
```

---

### Task 19: Write `templates/snippets/stat-grid.html`

**Files:**
- Create: `packages/design-system/templates/snippets/stat-grid.html`

- [ ] **Step 1: Write the file**

```html
<!--
  Stat grid snippet · Yohaku design system
  Use for owner dashboard, post stats, profile cards.
  Tokens: --color-neutral-{2,7,10}, --color-accent, --color-border, --font-serif.
-->
<section style="
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  padding: 24px 0;
">
  <article style="
    background: var(--color-neutral-2);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 16px 20px;
  ">
    <p style="
      margin: 0 0 4px;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--color-neutral-7);
    ">posts</p>
    <p style="
      margin: 0;
      font-family: var(--font-serif);
      font-size: 2rem;
      font-weight: 500;
      color: var(--color-neutral-10);
      font-variant-numeric: tabular-nums;
    ">128</p>
  </article>

  <article style="
    background: var(--color-neutral-2);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 16px 20px;
  ">
    <p style="
      margin: 0 0 4px;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--color-neutral-7);
    ">notes</p>
    <p style="
      margin: 0;
      font-family: var(--font-serif);
      font-size: 2rem;
      font-weight: 500;
      color: var(--color-neutral-10);
      font-variant-numeric: tabular-nums;
    ">412</p>
  </article>

  <article style="
    background: var(--color-neutral-2);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 16px 20px;
  ">
    <p style="
      margin: 0 0 4px;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--color-neutral-7);
    ">comments</p>
    <p style="
      margin: 0;
      font-family: var(--font-serif);
      font-size: 2rem;
      font-weight: 500;
      color: var(--color-accent);
      font-variant-numeric: tabular-nums;
    ">1.2k</p>
  </article>

  <article style="
    background: var(--color-neutral-2);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 16px 20px;
  ">
    <p style="
      margin: 0 0 4px;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--color-neutral-7);
    ">days</p>
    <p style="
      margin: 0;
      font-family: var(--font-serif);
      font-size: 2rem;
      font-weight: 500;
      color: var(--color-neutral-10);
      font-variant-numeric: tabular-nums;
    ">2,103</p>
  </article>
</section>
```

- [ ] **Step 2: Verify visually**

Four cards in a responsive grid; the comments card uses accent for emphasis (single accent point).

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/templates/snippets/stat-grid.html
git commit -m "feat(design-system): add stat-grid snippet"
```

---

### Task 20: Write `templates/snippets/comment-thread.html`

**Files:**
- Create: `packages/design-system/templates/snippets/comment-thread.html`

- [ ] **Step 1: Write the file**

```html
<!--
  Comment thread snippet · Yohaku design system
  Tokens: --color-neutral-{2,3,7,9,10}, --color-border, --color-accent, --font-mono.
-->
<section style="display: grid; gap: 16px; padding: 24px 0;">
  <article style="
    display: grid;
    grid-template-columns: 36px 1fr;
    gap: 12px;
  ">
    <div aria-hidden="true" style="
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--color-neutral-3);
      display: grid;
      place-items: center;
      color: var(--color-neutral-7);
      font-weight: 600;
      font-size: 0.875rem;
    ">A</div>
    <div>
      <header style="
        display: flex;
        align-items: baseline;
        gap: 8px;
        margin-bottom: 4px;
      ">
        <strong style="font-weight: 500; color: var(--color-neutral-10);">Anya</strong>
        <span style="
          font-family: var(--font-mono);
          font-size: 0.75rem;
          color: var(--color-neutral-7);
        ">2 小时前</span>
      </header>
      <p style="margin: 0; color: var(--color-neutral-9); line-height: 1.55;">
        三档 neutral 的设定让阅读节奏有了松紧感。dark mode 自动反转这一点尤其难得。
      </p>
      <footer style="margin-top: 8px;">
        <button style="
          background: none;
          border: none;
          color: var(--color-neutral-7);
          font: inherit;
          font-size: 0.875rem;
          cursor: pointer;
          padding: 0;
        ">回此言</button>
      </footer>
    </div>
  </article>

  <article style="
    display: grid;
    grid-template-columns: 36px 1fr;
    gap: 12px;
    margin-left: 48px;
    padding-left: 16px;
    border-left: 2px solid var(--color-accent);
  ">
    <div aria-hidden="true" style="
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--color-neutral-3);
      display: grid;
      place-items: center;
      color: var(--color-neutral-7);
      font-weight: 600;
      font-size: 0.875rem;
    ">I</div>
    <div>
      <header style="
        display: flex;
        align-items: baseline;
        gap: 8px;
        margin-bottom: 4px;
      ">
        <strong style="font-weight: 500; color: var(--color-neutral-10);">Innei</strong>
        <span style="
          font-family: var(--font-mono);
          font-size: 0.75rem;
          color: var(--color-accent);
          font-weight: 500;
        ">作者</span>
        <span style="
          font-family: var(--font-mono);
          font-size: 0.75rem;
          color: var(--color-neutral-7);
        ">1 小时前</span>
      </header>
      <p style="margin: 0; color: var(--color-neutral-9); line-height: 1.55;">
        多谢一阅。原是要避免 50–950 那一档的「色味稀薄」感。
      </p>
    </div>
  </article>
</section>
```

- [ ] **Step 2: Verify visually**

Top-level comment then reply with accent left bar; "作者" pill in accent.

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/templates/snippets/comment-thread.html
git commit -m "feat(design-system): add comment-thread snippet"
```

---

### Task 21: Write the verify script test (TDD step 1 — failing test)

**Files:**
- Create: `packages/design-system/scripts/check.test.ts`

The verify script (`check.ts`) does three things: (a) extracts CSS vars from `src/tokens.css`, (b) extracts hex values from `CHEATSHEET.md` color tables and asserts each one matches the tokens, (c) lints `templates/**/*.html` for forbidden patterns.

We TDD this. Start with one focused test for the most important behavior: token-cheatsheet hex match.

- [ ] **Step 1: Write the failing test**

```typescript
// packages/design-system/scripts/check.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { extractTokens, extractCheatsheetHex, lintTemplate, runChecks } from './check.js'

test('extractTokens parses --color-neutral-N from tokens.css', () => {
  const css = `
    @theme {
      --color-neutral-1: #f8f8f8;
      --color-neutral-9: #242424;
      --color-accent: #33a6b8;
    }
  `
  const tokens = extractTokens(css)
  assert.equal(tokens.get('--color-neutral-1'), '#f8f8f8')
  assert.equal(tokens.get('--color-neutral-9'), '#242424')
  assert.equal(tokens.get('--color-accent'), '#33a6b8')
})

test('extractCheatsheetHex parses hex values from a table cell', () => {
  const md = `
    | Var | Hex | Use |
    |---|---|---|
    | \`--color-neutral-1\` | \`#f8f8f8\` | Page bg |
    | \`--color-accent\` | \`#33a6b8\` | CTA |
  `
  const hexes = extractCheatsheetHex(md)
  assert.equal(hexes.get('--color-neutral-1'), '#f8f8f8')
  assert.equal(hexes.get('--color-accent'), '#33a6b8')
})

test('lintTemplate flags banned text-neutral-50 class', () => {
  const html = `<p class="text-neutral-500">Body</p>`
  const issues = lintTemplate(html, 'snippet.html')
  assert.equal(issues.length, 1)
  assert.match(issues[0], /text-neutral-500/)
})

test('lintTemplate flags raw hex inside class attribute (not in <style>)', () => {
  const html = `<div style="color: #ff0000">!</div>`
  // Inline styles are allowed only when sourcing from var(--...). A raw hex is a violation.
  const issues = lintTemplate(html, 'snippet.html')
  assert.ok(issues.some((i) => i.includes('#ff0000')))
})

test('lintTemplate accepts var(--color-...) references', () => {
  const html = `<div style="color: var(--color-neutral-9)">ok</div>`
  const issues = lintTemplate(html, 'snippet.html')
  assert.equal(issues.length, 0)
})

test('runChecks returns ok on a consistent token + cheatsheet', () => {
  const result = runChecks({
    tokensCss: `@theme { --color-neutral-9: #242424; }`,
    cheatsheetMd: `| \`--color-neutral-9\` | \`#242424\` | Body |`,
    templates: [],
  })
  assert.equal(result.ok, true)
  assert.equal(result.issues.length, 0)
})

test('runChecks reports drift when cheatsheet hex disagrees with tokens', () => {
  const result = runChecks({
    tokensCss: `@theme { --color-neutral-9: #242424; }`,
    cheatsheetMd: `| \`--color-neutral-9\` | \`#000000\` | Body |`,
    templates: [],
  })
  assert.equal(result.ok, false)
  assert.ok(result.issues[0].includes('--color-neutral-9'))
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @yohaku/design-system test`
Expected: FAIL — `Cannot find module './check.js'` (the script does not exist yet).

---

### Task 22: Implement the verify script (TDD step 2 — pass the test)

**Files:**
- Create: `packages/design-system/scripts/check.ts`

- [ ] **Step 1: Write the script**

```typescript
// packages/design-system/scripts/check.ts
import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative } from 'node:path'

const HEX = /#[0-9a-fA-F]{3,8}\b/

export function extractTokens(css: string): Map<string, string> {
  const result = new Map<string, string>()
  const re = /(--color-[a-z0-9-]+|--font-[a-z0-9-]+):\s*([^;]+);/g
  for (const match of css.matchAll(re)) {
    const name = match[1]
    const value = match[2].trim()
    if (HEX.test(value)) {
      const hex = value.match(HEX)![0].toLowerCase()
      result.set(name, hex)
    } else {
      result.set(name, value)
    }
  }
  return result
}

export function extractCheatsheetHex(md: string): Map<string, string> {
  const result = new Map<string, string>()
  const lines = md.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('|')) continue
    const cells = trimmed.split('|').map((c) => c.trim())
    let varName: string | undefined
    let hexValue: string | undefined
    for (const cell of cells) {
      const varMatch = cell.match(/`(--[a-z0-9-]+)`/)
      if (varMatch) varName = varMatch[1]
      const hexMatch = cell.match(/`(#[0-9a-fA-F]{3,8})`/)
      if (hexMatch) hexValue = hexMatch[1].toLowerCase()
    }
    if (varName && hexValue) result.set(varName, hexValue)
  }
  return result
}

const BANNED_NEUTRAL_CLASS = /\b(?:text|bg|border|ring|fill|stroke|from|to|via)-neutral-(?:50|100|200|300|400|500|600|700|800|900|950)\b/g

const ALLOWED_HEX_VALUES = new Set(['#fff', '#ffffff', '#000', '#000000'])

export function lintTemplate(html: string, filename: string): string[] {
  const issues: string[] = []

  for (const match of html.matchAll(BANNED_NEUTRAL_CLASS)) {
    issues.push(`${filename}: banned Tailwind class "${match[0]}" (use --color-neutral-1..10)`)
  }

  const styleAttrs = html.match(/style="[^"]*"/g) ?? []
  for (const attr of styleAttrs) {
    const hexes = attr.match(new RegExp(HEX, 'g')) ?? []
    for (const hex of hexes) {
      if (!ALLOWED_HEX_VALUES.has(hex.toLowerCase())) {
        issues.push(`${filename}: raw hex ${hex} in inline style (use var(--color-...))`)
      }
    }
  }

  const inlineFont = html.match(/font-family:\s*(?!var\(|inherit)([^;"]+)/g)
  if (inlineFont) {
    for (const decl of inlineFont) {
      issues.push(`${filename}: hardcoded font-family "${decl.trim()}" (use var(--font-...))`)
    }
  }

  return issues
}

export function runChecks(input: {
  tokensCss: string
  cheatsheetMd: string
  templates: { filename: string; html: string }[]
}): { ok: boolean; issues: string[] } {
  const issues: string[] = []
  const tokens = extractTokens(input.tokensCss)
  const cheatsheetHexes = extractCheatsheetHex(input.cheatsheetMd)

  for (const [name, hex] of cheatsheetHexes) {
    const tokenHex = tokens.get(name)
    if (!tokenHex) {
      issues.push(`cheatsheet references ${name} but it is not declared in tokens.css`)
      continue
    }
    if (tokenHex !== hex) {
      issues.push(`drift: ${name} = ${tokenHex} in tokens.css vs ${hex} in CHEATSHEET.md`)
    }
  }

  for (const tmpl of input.templates) {
    issues.push(...lintTemplate(tmpl.html, tmpl.filename))
  }

  return { ok: issues.length === 0, issues }
}

async function readTemplates(dir: string): Promise<{ filename: string; html: string }[]> {
  const result: { filename: string; html: string }[] = []
  const entries = await readdir(dir, { withFileTypes: true })
  for (const e of entries) {
    const full = join(dir, e.name)
    if (e.isDirectory()) {
      result.push(...(await readTemplates(full)))
    } else if (e.name.endsWith('.html')) {
      result.push({ filename: relative(process.cwd(), full), html: await readFile(full, 'utf8') })
    }
  }
  return result
}

async function main() {
  const here = dirname(fileURLToPath(import.meta.url))
  const root = join(here, '..')
  const tokensCss = await readFile(join(root, 'src/tokens.css'), 'utf8')
  const cheatsheetMd = await readFile(join(root, 'CHEATSHEET.md'), 'utf8')
  const templates = await readTemplates(join(root, 'templates'))

  const result = runChecks({ tokensCss, cheatsheetMd, templates })

  if (!result.ok) {
    console.error('Check failed:')
    for (const issue of result.issues) console.error(`  - ${issue}`)
    process.exit(1)
  }
  const tokenCount = extractTokens(tokensCss).size
  console.log(`OK: ${tokenCount} tokens, ${templates.length} templates lint clean.`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
```

- [ ] **Step 2: Run the test**

Run: `pnpm --filter @yohaku/design-system test`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/scripts/check.ts packages/design-system/scripts/check.test.ts
git commit -m "feat(design-system): add check.ts verify script with tests"
```

---

### Task 23: Run check against the real package and fix any drift

- [ ] **Step 1: Install `tsx` if not already present**

Run: `pnpm install`
Expected: `tsx` resolves under `packages/design-system/node_modules/tsx` (devDep declared in Task 1).

- [ ] **Step 2: Run check on the real package**

Run: `pnpm --filter @yohaku/design-system check`
Expected: either `OK: …` or a list of drift / lint issues.

- [ ] **Step 3: For each issue, fix at the source**

- If a hex in `CHEATSHEET.md` mismatches `src/tokens.css`, the cheatsheet has a typo — fix the cheatsheet to match tokens. Tokens are canonical.
- If a snippet has a banned `text-neutral-N` class, replace it with `text-neutral-1..10`.
- If a snippet has a raw hex in inline style, replace it with `var(--color-...)` from the cheatsheet table.

After each fix, re-run `pnpm --filter @yohaku/design-system check`.

- [ ] **Step 4: Once clean, commit any fixes**

```bash
git add packages/design-system
git commit -m "fix(design-system): resolve initial check drift"
```

(Skip if no fixes were needed.)

---

### Task 24: Wire the check into the monorepo lint pipeline (optional convenience)

This task is **optional** — out-of-MVP per the spec — but if you want the check to run alongside `pnpm lint`, do this. Otherwise skip.

**Files:**
- Modify: `package.json` (root)

- [ ] **Step 1: Inspect the existing root lint script**

Run: `grep -A1 '"lint"' package.json | head -3`

- [ ] **Step 2: Decide whether to add `&& pnpm --filter @yohaku/design-system check`**

If `lint` is currently `"turbo run lint"`, leave it alone — Turbo handles per-package scripts via `turbo.json`. Instead update `turbo.json`:

```json
{
  "tasks": {
    "lint": { ... existing ... },
    "check": {
      "outputs": []
    }
  }
}
```

And add a top-level `"check": "turbo run check"` script.

If you don't want this entanglement, **skip the task entirely**. The verify script can be invoked manually before commits inside `packages/design-system/`.

- [ ] **Step 3: Commit if changed**

```bash
git add package.json turbo.json
git commit -m "chore: wire design-system check into turbo pipeline"
```

---

## Self-Review Checklist (run after the plan is fully written, not skipped)

Before handing this plan off, the implementer (or planner) should:

1. **Spec coverage:** Every section in the spec has a corresponding task above. The spec lists: package skeleton (Task 1), token migration (Tasks 3–5), AI contract (Tasks 6–11), templates (Tasks 12–20), verify script (Tasks 21–23). Everything in the MVP scope is covered.
2. **Placeholder scan:** No `TBD`, `TODO`, `implement later`, or vague "handle errors" steps.
3. **Type consistency:** `extractTokens`, `extractCheatsheetHex`, `lintTemplate`, `runChecks` are referenced consistently across the test (Task 21) and implementation (Task 22).
4. **Ambiguity:** The `tokens()` helper at the bottom of `check.ts` is intentionally a no-op label — its only job is producing a friendly success line. If you find yourself confused, simplify it inline.

If anything is unclear, fix the plan before starting Task 1 — not mid-execution.
