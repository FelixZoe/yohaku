# Field UI Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine Input, TextArea, and MarkdownEditor to use a unified, quieter field system with accent-tinted rest gradient and border+ring focus, driven by CSS custom properties.

**Architecture:** CSS custom properties in `variables.css` serve as the single source of truth for field surface/focus. `styles.ts` becomes thin wrappers referencing these variables. Components consume shared tokens — no per-component dark mode logic.

**Tech Stack:** CSS custom properties, Tailwind CSS v4, `color-mix(in srgb, ...)`, existing `--color-accent` and `--surface-paper` variables.

**Spec:** `docs/superpowers/specs/2026-04-06-field-ui-refinement-design.md`

---

## File Map


| File                                                            | Action | Responsibility                                                                |
| --------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------- |
| `apps/web/src/styles/variables.css`                             | Modify | Add `--field-`* CSS custom properties in `:root` and `[data-theme='dark']`    |
| `apps/web/src/components/ui/input/styles.ts`                    | Modify | Rewrite tokens as CSS variable references; delete `noteFieldSurfaceClassName` |
| `apps/web/src/components/ui/input/TextArea.tsx`                 | Modify | Remove `noteFieldSurfaceClassName` import/usage                               |
| `apps/web/src/components/ui/markdown-editor/MarkdownEditor.tsx` | Modify | Apply shared field classnames to wrapper div                                  |
| `apps/web/src/components/ui/markdown-editor/MarkdownEditor.css` | Modify | Strip surface/focus/dark styles; keep content-only; add actions hairline      |


---

### Task 1: Add CSS custom properties to `variables.css`

**Files:**

- Modify: `apps/web/src/styles/variables.css`
- **Step 1: Add field variables to `:root` block**

In `apps/web/src/styles/variables.css`, add the field variables inside the existing `:root` block, after `--color-border`:

```css
:root {
  --bg-opacity: rgba(254, 253, 251, 0.72);
  --color-root-bg: #fefefb;
  --surface-paper: var(--color-root-bg);
  --color-border: rgba(24, 24, 27, 0.1);

  /* Field system */
  --field-bg: var(--surface-paper);
  --field-border: rgba(0, 0, 0, 0.05);
  --field-shadow: 0 1px 1px rgba(0, 0, 0, 0.01), 0 3px 10px rgba(0, 0, 0, 0.02);
  --field-gradient: linear-gradient(180deg, color-mix(in srgb, var(--color-accent) 5%, transparent) 0%, transparent 26%);
  --field-border-focus: color-mix(in srgb, var(--color-accent) 35%, transparent);
  --field-ring: 0 0 0 3px color-mix(in srgb, var(--color-accent) 10%, transparent);
}
```

- **Step 2: Add dark-mode field variables to `[data-theme='dark']` block**

In the same file, add field variables at the end of the existing `[data-theme='dark']` block, after `--color-border`:

```css
[data-theme='dark'] {
  /* ...existing dark overrides... */
  --color-border: #3f3f46;

  /* Field system */
  --field-bg: var(--surface-paper);
  --field-border: rgba(255, 255, 255, 0.08);
  --field-shadow: 0 1px 1px rgba(0, 0, 0, 0.18), 0 4px 16px rgba(0, 0, 0, 0.16);
  --field-gradient: linear-gradient(180deg, color-mix(in srgb, var(--color-accent) 7%, transparent) 0%, transparent 26%);
  --field-border-focus: color-mix(in srgb, var(--color-accent) 35%, transparent);
  --field-ring: 0 0 0 3px color-mix(in srgb, var(--color-accent) 8%, transparent);
}
```

- **Step 3: Commit**

```bash
git add apps/web/src/styles/variables.css
git commit -m "feat(field-ui): add --field-* CSS custom properties for unified field system"
```

---

### Task 2: Rewrite `styles.ts` as thin variable references

**Files:**

- Modify: `apps/web/src/components/ui/input/styles.ts`
- **Step 1: Replace the entire file contents**

Replace the full contents of `apps/web/src/components/ui/input/styles.ts` with:

```ts
export const inputRoundedMap = {
  sm: 'rounded-xs',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  '3xl': 'rounded-3xl',
  default: 'rounded-xl',
} as const

export const fieldSurfaceClassName = [
  'border bg-[var(--field-bg)] border-[var(--field-border)]',
  'shadow-[var(--field-shadow)]',
  '[background-image:var(--field-gradient)]',
].join(' ')

export const fieldFocusClassName = [
  'focus-visible:border-[var(--field-border-focus)]',
  'focus-visible:shadow-[var(--field-ring)]',
].join(' ')

export const fieldWrapperBaseClassName = [
  'group relative h-full overflow-hidden border bg-[var(--field-bg)] border-[var(--field-border)]',
  'shadow-[var(--field-shadow)]',
  '[background-image:var(--field-gradient)]',
  'duration-200',
].join(' ')

export const fieldWrapperFocusClassName = [
  'focus-within:border-[var(--field-border-focus)]',
  'focus-within:shadow-[var(--field-ring)]',
].join(' ')
```

Key changes:

- All color/shadow/gradient values now reference `--field-*` CSS variables
- Zero `dark:` prefixes — dark mode is handled by the CSS variables
- `noteFieldSurfaceClassName` is deleted
- `inputRoundedMap` is unchanged
- **Step 2: Verify no other files import `noteFieldSurfaceClassName`**

Run:

```bash
rg 'noteFieldSurfaceClassName' apps/web/src/
```

Expected: only `TextArea.tsx` imports it (handled in Task 3). If other files appear, they need updating too.

- **Step 3: Commit**

```bash
git add apps/web/src/components/ui/input/styles.ts
git commit -m "refactor(field-ui): rewrite styles.ts as thin CSS variable references"
```

---

### Task 3: Update `TextArea.tsx` — remove note surface variant

**Files:**

- Modify: `apps/web/src/components/ui/input/TextArea.tsx`
- **Step 1: Update the import statement**

Change the import from:

```ts
import {
  fieldWrapperBaseClassName,
  fieldWrapperFocusClassName,
  inputRoundedMap,
  noteFieldSurfaceClassName,
} from './styles'
```

to:

```ts
import {
  fieldWrapperBaseClassName,
  fieldWrapperFocusClassName,
  inputRoundedMap,
} from './styles'
```

- **Step 2: Remove `noteFieldSurfaceClassName` from the wrapper div**

In the wrapper `<div>`, change:

```tsx
bordered && [
  fieldWrapperBaseClassName,
  fieldWrapperFocusClassName,
  noteFieldSurfaceClassName,
],
```

to:

```tsx
bordered && [
  fieldWrapperBaseClassName,
  fieldWrapperFocusClassName,
],
```

- **Step 3: Commit**

```bash
git add apps/web/src/components/ui/input/TextArea.tsx
git commit -m "refactor(field-ui): remove noteFieldSurfaceClassName from TextArea"
```

---

### Task 4: Update `MarkdownEditor.tsx` — apply shared field classnames

**Files:**

- Modify: `apps/web/src/components/ui/markdown-editor/MarkdownEditor.tsx`
- **Step 1: Add imports for shared field tokens**

Add this import at the top of the file (after the existing imports):

```ts
import {
  fieldWrapperBaseClassName,
  fieldWrapperFocusClassName,
  inputRoundedMap,
} from '~/components/ui/input/styles'
```

- **Step 2: Apply shared classnames to the wrapper div**

Change the wrapper div from:

```tsx
<div className={clsxm('markdown-editor', className)}>
```

to:

```tsx
<div className={clsxm(
  'markdown-editor',
  fieldWrapperBaseClassName,
  fieldWrapperFocusClassName,
  inputRoundedMap.xl,
  className,
)}>
```

- **Step 3: Wrap the actions slot with the hairline separator**

Change the bare `{actions}` at the bottom of the wrapper div from:

```tsx
        {actions}
      </div>
```

to:

```tsx
        {actions && (
          <div className="markdown-editor__actions">
            {actions}
          </div>
        )}
      </div>
```

Note: Both current consumers (`UniversalTextArea` and `post-box.tsx`) position their action children with `absolute`. These will still position relative to the `.markdown-editor` wrapper (which has `relative`). The `.markdown-editor__actions` div provides the hairline `border-top` at the bottom of the flex column. Consumers that want flow-positioned actions can stop using absolute positioning in the future.

- **Step 4: Commit**

```bash
git add apps/web/src/components/ui/markdown-editor/MarkdownEditor.tsx
git commit -m "refactor(field-ui): apply shared field tokens to MarkdownEditor wrapper"
```

---

### Task 5: Strip `MarkdownEditor.css` to content-only

**Files:**

- Modify: `apps/web/src/components/ui/markdown-editor/MarkdownEditor.css`
- **Step 1: Replace the entire file contents**

Replace the full contents of `apps/web/src/components/ui/markdown-editor/MarkdownEditor.css` with:

```css
@reference "../../../styles/tailwindcss.css";

.markdown-editor {
  @apply relative flex h-full w-full flex-col;
}

.markdown-editor__content {
  @apply size-full min-h-[150px] resize-none bg-transparent px-3.5 py-3.5 text-sm text-neutral-8 outline-hidden;
  @apply leading-7 tracking-[0.01em];
}

.markdown-editor__content a {
  @apply text-accent underline-offset-2;
}

.markdown-editor__content a:hover {
  @apply underline;
}

.markdown-editor__content code {
  @apply rounded-md bg-neutral-9/5 px-1.5 py-0.5 font-mono text-[0.85em] text-neutral-8;
}

.markdown-editor__content pre {
  @apply my-2 rounded-lg bg-neutral-9/10 p-3 font-mono text-[0.85em] leading-6 text-neutral-9;
}

.markdown-editor__content blockquote {
  @apply relative my-2 border-l-2 border-accent/60 pl-3 text-neutral-8;
}

.markdown-editor__content h1,
.markdown-editor__content h2,
.markdown-editor__content h3,
.markdown-editor__content h4,
.markdown-editor__content h5,
.markdown-editor__content h6 {
  @apply font-semibold tracking-tight text-neutral-9;
}

.markdown-editor__content h1 {
  @apply text-lg;
}

.markdown-editor__content h2 {
  @apply text-base;
}

.markdown-editor__content ul,
.markdown-editor__content ol {
  @apply my-2 pl-5;
}

.markdown-editor__content ul {
  @apply list-disc;
}

.markdown-editor__content ol {
  @apply list-decimal;
}

.markdown-editor__content li {
  @apply my-1;
}

.markdown-editor__content p {
  @apply my-0;
}

.markdown-editor__placeholder {
  @apply pointer-events-none absolute left-3.5 top-3.5 block text-sm leading-7 tracking-[0.01em] text-neutral-5;
}

.markdown-editor__content .lexical-code {
  @apply font-mono text-[0.85em] leading-6;
}

.markdown-editor__content .lexical-quote {
  @apply text-neutral-8;
}

.markdown-editor__content .lexical-list-ol,
.markdown-editor__content .lexical-list-ul {
  @apply pl-5;
}

.markdown-editor__content .lexical-link {
  @apply text-accent underline-offset-2;
}

.markdown-editor__actions {
  border-top: 1px solid var(--field-border);
}
```

Key changes:

- `.markdown-editor` is now layout-only (`relative flex h-full w-full flex-col`) — no border, bg, shadow, gradient, overflow, or rounded (those come from the shared Tailwind classnames in Task 4)
- Removed `.markdown-editor:focus-within` block entirely
- Removed both `:where(.dark, [data-theme='dark'])` override blocks
- All content typography styles unchanged
- Added `.markdown-editor__actions` with the hairline separator
- **Step 2: Commit**

```bash
git add apps/web/src/components/ui/markdown-editor/MarkdownEditor.css
git commit -m "refactor(field-ui): strip MarkdownEditor.css to content-only styles"
```

---

### Task 6: Verify the `index.ts` barrel export

**Files:**

- Check: `apps/web/src/components/ui/input/index.ts`
- **Step 1: Verify the barrel export doesn't re-export `noteFieldSurfaceClassName`**

Run:

```bash
rg 'noteFieldSurfaceClassName' apps/web/src/components/ui/input/index.ts
```

Expected: no matches. If it does re-export it, remove that line.

- **Step 2: Search for any remaining references to the deleted export**

Run:

```bash
rg 'noteFieldSurfaceClassName' apps/web/src/
```

Expected: zero results. If any file still imports it, remove the import and usage.

- **Step 3: Commit (only if changes were needed)**

```bash
git add -A
git commit -m "fix(field-ui): clean up remaining noteFieldSurfaceClassName references"
```

---

### Task 7: Build verification

- **Step 1: Run the dev build**

```bash
pnpm --filter @yohaku/web build
```

Expected: successful build with no errors. Watch for:

- CSS compilation errors from invalid `var()` references
- TypeScript errors from missing `noteFieldSurfaceClassName` exports
- Tailwind warnings about unresolved classes
- **Step 2: Visual spot-check**

Start the dev server and visually verify these pages:

```bash
pnpm --filter @yohaku/web dev
```

Check at `http://localhost:2323`:

1. Any page with a comment box (uses `MarkdownEditor` via `UniversalTextArea`)
2. `/thinking` page (uses `MarkdownEditor` in post-box, `Input` for tags)
3. Dashboard writing page (uses `TextArea` for body, `Input` for various fields)

For each, verify:

- Rest state: faint accent-tinted gradient at top, light border, soft shadow
- Focus state: border shifts to accent, soft 3px outer ring appears, no other changes
- Dark mode: same behavior, variables auto-switch
- The accent gradient color matches the page's accent (especially if the page uses a non-default accent)
- **Step 3: Final commit if any adjustments needed**

```bash
git add -A
git commit -m "fix(field-ui): post-verification adjustments"
```

