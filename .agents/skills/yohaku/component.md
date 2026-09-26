# UI Primitives

> Authoritative for `apps/web/src/components/ui/`. Reuse beats reinvent. New primitives need user approval.

## Check before writing

49 primitives live under `apps/web/src/components/ui/`:

```
auto-completion · avatar · back-to-top · background · banner · button · checkbox
code-editor · code-highlighter · collapse · divider · dropdown-menu · excalidraw
fab · float-panel · float-popover · form · gallery · image · input · katex · label
language-selector · link · link-card · list · loading · markdown · markdown-editor
media · modal/stacked · number-transition · pagination · portal · react-component-render
relative-time · rich-content · rich-link · scroll-area · select · sheet · spinner
switch · tabs · tag · toast · transition · typography · user · viewport
```

If a primitive matches → use it. If it almost matches → compose a wrapper in `modules/` or extend variants. **Only write a new `ui/` entry after the user confirms.**

## File layout

```
ui/<kebab-name>/
  index.ts         # barrel — export * from './*'
  <Name>.tsx       # component file (PascalCase)
  styles.ts        # tv variant maps + class strings (when sizable)
  constants.ts     # animation tunings, presets
  context.tsx      # React Context if the primitive composes
  types.ts         # shared types
```

Single-file primitives skip the extras. Import path always `~/components/ui/<name>` — never reach into a file directly.

Barrel pattern:
```ts
// ui/button/index.ts
export * from './StyledButton'
export * from './MotionButton'
export * from './RoundedIconButton'
```

## Variant pattern — `tailwind-variants`

All multi-variant primitives use `tv()`. **Inline string concatenation is rejected at review.**

```tsx
import { tv } from 'tailwind-variants'
import clsx from 'clsx'

const styles = tv({
  base: clsx(
    'inline-flex select-none cursor-default',
    'transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]',
  ),
  variants: {
    variant: {
      primary:   'bg-accent/8 border border-accent/30 text-accent hover:bg-accent/15',
      secondary: 'bg-transparent border border-black/10 dark:border-white/10 text-neutral-9',
      ghost:     'bg-transparent border border-transparent hover:bg-neutral-2',
    },
    size: {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
    },
  },
  defaultVariants: { variant: 'primary', size: 'md' },
})
```

Reference: `apps/web/src/components/ui/button/StyledButton.tsx`.

## Class composition — `clsxm`

```tsx
import { clsxm } from '~/lib/helper'

<div className={clsxm('text-neutral-9', isActive && 'text-accent', className)} />
```

Plain `clsx` is fine inside `tv()` `base` blocks. Outside, prefer `clsxm` because it merges Tailwind tokens correctly.

## Ref forwarding

React 19 style:

```tsx
type Props = { ref?: Ref<HTMLButtonElement> } & ComponentProps<'button'>

export const Button: FC<Props> = ({ ref, className, ...rest }) => (
  <button ref={ref} className={styles({ ...rest })} {...rest} />
)
```

Older `forwardRef` is being phased out — match the surrounding file.

## Theme-driven CSS variables

Inputs, fields, and runtime-themed surfaces pull from CSS variables. Don't hardcode field colors.

```tsx
// ui/input/styles.ts
export const fieldVars = {
  '--field-bg': 'var(--color-neutral-2)',
  '--field-border': 'var(--color-border)',
  '--field-shadow': 'var(--color-hair)',
  '--field-gradient': 'linear-gradient(...)',
} as CSSProperties
```

Reference: `apps/web/src/components/ui/input/styles.ts`.

## `'use client'` discipline

Add `'use client'` when the file:
- uses hooks (`useState`, `useEffect`, etc.)
- imports `motion/react`
- attaches DOM event listeners
- reads `window` / `document`

Server components are for layout shells, async data fetchers, and dumb wrappers.

## Composition over reinvention

Most "new" needs are compositions of existing primitives:

- "A card with a corner ribbon" → compose in `modules/<feature>/`, not `ui/`.
- "A modal that drags and snaps" → already in `ui/modal/stacked/`.
- "A loading state" → `ui/loading` has fractal-noise SVG ink filter.

## Window-scope global registry

Public primitives are also exposed on `window.yohaku.*` via `apps/web/src/components/common/Global.ts`. When a primitive should be usable from rich-content shadow DOM or external scripts:
1. Add the named export to `ui/<name>/index.ts`.
2. Register in `Global.ts` `windowGlobalRegistry`.

## Size budgets

- Max **500 lines** per file. React components ≤ **300 lines** of JSX/hook code.
- Inline sub-components in the same file unless they exceed **80 lines**.
- Anything more — split into a folder with multiple `*.tsx` files.

## Escalation triggers — stop and ask the user

- A new top-level `ui/` primitive.
- Editing `packages/design-system/src/tokens.css`.
- Adding a new accent color or semantic token.
- Anything that crosses the package boundary (web → design-system).

## Source files

- `apps/web/src/components/ui/button/StyledButton.tsx` — canonical `tv()` example
- `apps/web/src/components/ui/input/styles.ts` — canonical CSS-var pattern
- `apps/web/src/components/ui/modal/stacked/` — canonical multi-file primitive
- `apps/web/src/components/common/Global.ts` — `window.yohaku` registry
