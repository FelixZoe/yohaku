# Field UI Refinement — Input, TextArea, MarkdownEditor

**Date:** 2026-04-06
**Scope:** `Input`, `TextArea`, `MarkdownEditor` core primitives only
**Approach:** CSS custom properties as single source of truth

## Problem

The current field components have three issues:

1. **Visual inconsistency** — `AdvancedInput` uses a completely different visual language from `Input`/`TextArea`. (Out of scope for this round, but the foundation laid here enables future unification.)
2. **Overdecorated rest state** — the warm parchment gradient (`noteFieldSurfaceClassName`) feels heavy and dated, not aligned with Yohaku's restrained paper metaphor.
3. **Overdramatic focus state** — accent wash + inset shadow + dual gradient shift + border change is too many simultaneous effects. Fields call too much attention to themselves.

## Design Decisions

### Rest State

- Replace the warm parchment gradient with an **accent-tinted gradient at 40% intensity**.
- The gradient uses the dynamic `--color-accent` so it adapts per-page.
- All three primitives share the same rest state — no separate "note" variant.
- Surface: `bg-paper`, light border, soft paper shadow (unchanged).
- Gradient: `linear-gradient(180deg, accent/0.05, transparent 26%)`.

### Focus State

- **Border + soft ring** — border shifts to muted accent, plus a faint 3px outer ring.
- No background change. No inset shadow. No gradient shift.
- Two CSS properties change on focus: `border-color` and `box-shadow`.

### MarkdownEditor Actions Zone

- Hairline `border-top` separator between content area and actions slot.
- Actions sit inside the same card surface but are visually zoned.

### Dark Mode

- Handled entirely at the CSS variable level — no `dark:` prefixes in `styles.ts`, no `:where(.dark)` blocks in `MarkdownEditor.css`.
- Components are theme-unaware; they consume variables.

## Architecture

### Layer 1: CSS Custom Properties

Defined in `apps/web/src/styles/variables.css` under `:root` and `[data-theme='dark']`.

Uses `color-mix(in srgb, ...)` for accent mixing — the established pattern in this codebase. The background uses the existing `--surface-paper` variable which already handles light/dark.

`**:root` (light):**

```css
--field-bg: var(--surface-paper);  /* resolves to #fefefb */
--field-border: rgba(0,0,0,0.05);
--field-shadow: 0 1px 1px rgba(0,0,0,0.01), 0 3px 10px rgba(0,0,0,0.02);
--field-gradient: linear-gradient(180deg, color-mix(in srgb, var(--color-accent) 5%, transparent) 0%, transparent 26%);
--field-border-focus: color-mix(in srgb, var(--color-accent) 35%, transparent);
--field-ring: 0 0 0 3px color-mix(in srgb, var(--color-accent) 10%, transparent);
```

`**[data-theme='dark']`:**

```css
--field-bg: var(--surface-paper);  /* resolves to var(--color-neutral-2) = #f0f0f0 inverted */
--field-border: rgba(255,255,255,0.08);
--field-shadow: 0 1px 1px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.16);
--field-gradient: linear-gradient(180deg, color-mix(in srgb, var(--color-accent) 7%, transparent) 0%, transparent 26%);
--field-border-focus: color-mix(in srgb, var(--color-accent) 35%, transparent);
--field-ring: 0 0 0 3px color-mix(in srgb, var(--color-accent) 8%, transparent);
```

Shared constants (both themes):

- `--field-radius`: `0.75rem` (12px, maps to `rounded-xl`)
- Transition: `200ms cubic-bezier(0.22, 1, 0.36, 1)`

Note: variables go in `variables.css` alongside `--surface-paper` and `--color-root-bg`, not in `tailwindcss.css`, since they are runtime theme values not Tailwind theme tokens.

### Layer 2: `styles.ts` (thin wrappers)

`apps/web/src/components/ui/input/styles.ts` becomes thin references to the CSS variables:

- `fieldSurfaceClassName` — `bg-[var(--field-bg)] border-[var(--field-border)] shadow-[var(--field-shadow)] [background-image:var(--field-gradient)]`
- `fieldFocusClassName` — `focus-visible:border-[var(--field-border-focus)] focus-visible:shadow-[var(--field-ring)]`
- `fieldWrapperBaseClassName` — same surface tokens, for wrapper `<div>` usage (TextArea, MarkdownEditor)
- `fieldWrapperFocusClassName` — same focus tokens but `focus-within:` instead of `focus-visible:`
- `inputRoundedMap` — unchanged
- `noteFieldSurfaceClassName` — **deleted**

### Layer 3: Components

`**Input.tsx`** — minimal change. Already uses `fieldSurfaceClassName` + `fieldFocusClassName`. No code changes needed beyond what the token update provides.

`**TextArea.tsx`** — remove `noteFieldSurfaceClassName` import and usage. Replace with `fieldSurfaceClassName` (via the wrapper classes it already uses). The `bordered` prop logic stays.

`**MarkdownEditor.tsx**` — apply shared Tailwind classnames to the wrapper div:

```tsx
<div className={clsxm(
  'markdown-editor',
  fieldWrapperBaseClassName,
  fieldWrapperFocusClassName,
  inputRoundedMap.xl,
  className,
)}>
```

`**MarkdownEditor.css**` — strips down to content concerns only:

- **Remove:** all surface styles from `.markdown-editor` (border, bg, shadow, gradient, overflow, rounded)
- **Remove:** entire `.markdown-editor:focus-within` block
- **Remove:** both `:where(.dark)` override blocks
- **Keep:** `.markdown-editor` as layout-only (`relative flex h-full w-full flex-col`)
- **Keep:** all `.markdown-editor__content` styles (text-neutral-8, leading-7, tracking)
- **Keep:** all content typography (headings, code, links, blockquotes, lists)
- **Keep:** `.markdown-editor__placeholder`
- **Add:** `.markdown-editor__actions` with `border-top: 1px solid var(--field-border)` for the hairline separator

CSS file goes from ~120 lines to ~80 lines of pure content styling.

## Files Changed


| File                                                            | Change                                                                        |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `apps/web/src/styles/variables.css`                             | Add `--field-`* CSS custom properties in `:root` and `[data-theme='dark']`    |
| `apps/web/src/components/ui/input/styles.ts`                    | Rewrite tokens as CSS variable references; delete `noteFieldSurfaceClassName` |
| `apps/web/src/components/ui/input/TextArea.tsx`                 | Remove `noteFieldSurfaceClassName` usage                                      |
| `apps/web/src/components/ui/markdown-editor/MarkdownEditor.tsx` | Apply shared field classnames to wrapper div                                  |
| `apps/web/src/components/ui/markdown-editor/MarkdownEditor.css` | Strip surface/focus/dark styles; keep content-only; add actions hairline      |


## What This Does NOT Change

- `AdvancedInput` — out of scope, future follow-up to unify with this system
- One-off raw `<input>`/`<textarea>` elements (search, slug, thinking edit) — future cleanup
- Content typography inside MarkdownEditor (headings, code, links) — unchanged
- `inputRoundedMap` — unchanged
- `CodeEditor` — unchanged
- Any component's API/props — no breaking changes

## Visual Summary

**Before:**

- Rest: warm parchment gradient (yellow-ish), varies between Input and TextArea
- Focus: accent bg wash + inset accent shadow + dual gradient + border change (4 effects)
- Dark: per-component `:where(.dark)` overrides

**After:**

- Rest: accent-tinted gradient (follows site accent color), uniform across all fields
- Focus: accent border + soft outer ring (2 effects)
- Dark: CSS variables, zero component-level dark logic

