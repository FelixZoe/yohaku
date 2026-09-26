# ErrorBoundary Visual Redesign

## Goal

Redesign the `ErrorBoundary` fallback UI for visual quality and i18n support, with two size variants (block / inline) to suit different wrapping contexts.

## Current State

- File: `apps/web/src/components/common/ErrorBoundary.tsx` (40 lines)
- Thin wrapper over `react-error-boundary`
- Single hardcoded Chinese fallback: plain text + `StyledButton` reload
- 9 consumer usage sites across the codebase; most use the default fallback
- `CodeBlock.tsx` and `ComponentRender.tsx` import `react-error-boundary` directly with custom fallbacks (not affected)

## Design

### Component API

```tsx
interface ErrorBoundaryProps {
  variant?: 'block' | 'inline' // default: 'block'
  children: React.ReactNode
}
```

The existing `ErrorBoundary` component signature changes from `FC<PropsWithChildren>` to accept an optional `variant` prop. Default is `'block'` to preserve backward compatibility — all current call sites continue working without modification.

**Implementation note:** Since `react-error-boundary`'s `FallbackComponent` prop does not forward custom props, use `fallbackRender` instead to close over the `variant` value:

```tsx
<ErrorBoundaryLib
  fallbackRender={() => variant === 'inline' ? <InlineFallback /> : <BlockFallback />}
  onError={...}
>
```

### Variant Styling with `tailwind-variants`

Use `tv()` per project conventions:

```tsx
const fallbackStyles = tv({
  base: 'flex items-center',
  variants: {
    variant: {
      block: 'flex-col justify-center rounded-xl bg-gray-500/5 py-6 gap-3',
      inline: 'flex-row rounded-lg bg-gray-500/5 px-3 py-2 gap-2',
    },
  },
})
```

### Block Fallback (default)

Visual: rounded container with subtle gray background fill, centered content.

```
┌─────────────────────────────────────┐
│         ┌───────────────┐           │
│         │ bg-gray-500/5 │           │
│         │               │           │
│         │   (○) icon    │  badge    │
│         │               │           │
│         │  Title text   │           │
│         │  Subtitle     │           │
│         │               │           │
│         │  [Refresh]    │  accent   │
│         │               │           │
│         └───────────────┘           │
└─────────────────────────────────────┘
```

- Container: `rounded-xl bg-gray-500/5 py-6`, centered flex column
- Icon: circle badge (`size-10 rounded-full bg-gray-500/10`) with `i-mingcute-alert-line` icon
- Title: `text-sm font-medium`
- Subtitle: `text-xs opacity-60`
- Button: existing `StyledButton` with default primary variant, calls `window.location.reload()`

### Inline Fallback

Visual: compact single-line with subtle gray background, no button.

```
┌──────────────────────────────────┐
│  (!) Failed to render component  │
└──────────────────────────────────┘
```

- Container: `rounded-lg bg-gray-500/5 px-3 py-2`, horizontal flex, items-center
- Icon: `i-mingcute-alert-line` size-3.5, `opacity-40`
- Text: `text-xs opacity-50`, single line

### i18n Keys

Add flat keys to `messages/{zh,en,ja}/common.json` (matching existing flat key convention):

**English:**
```json
"error_boundary_block_title": "Something went wrong",
"error_boundary_block_subtitle": "Please try refreshing the page",
"error_boundary_inline_text": "Failed to render component"
```

**Chinese:**
```json
"error_boundary_block_title": "页面渲染出错",
"error_boundary_block_subtitle": "请尝试刷新页面",
"error_boundary_inline_text": "组件渲染失败"
```

**Japanese:**
```json
"error_boundary_block_title": "エラーが発生しました",
"error_boundary_block_subtitle": "ページを更新してください",
"error_boundary_inline_text": "コンポーネントの描画に失敗しました"
```

Refresh button reuses existing `actions_refresh` key (already present in all three locales).

### Usage Site Updates

| File | Current | Change to |
|------|---------|-----------|
| `layout.tsx` | default | keep block (no change) |
| `Markdown.tsx` | default | keep block |
| `Header.tsx` | default | `variant="inline"` |
| `ActivityScreen.tsx` | default | `variant="inline"` |
| `CommentBox/Root.tsx` | default | keep block |
| `Comments.tsx` | default | keep block |
| `CommentRootLazy.tsx` | default | keep block |
| `SummarySwitcher.tsx` | default | `variant="inline"` |
| `preview/page.tsx` | default (3 instances) | keep block |

**Not affected** (import `react-error-boundary` directly with custom fallbacks):
- `CodeBlock.tsx`
- `ComponentRender.tsx`
- `MarkdownEditor.tsx` (uses `LexicalErrorBoundary`, unrelated)

### Out of Scope

- Error reporting (Sentry TODO preserved as-is)
- `error.tsx` / `global-error.tsx` (separate Next.js error handling)
- Custom fallbacks in `CodeBlock` and `ComponentRender` (unchanged)
- `resetErrorBoundary` vs `reload()` (future improvement)

## Files to Modify

1. `apps/web/src/components/common/ErrorBoundary.tsx` — redesign fallback components, add variant prop
2. `apps/web/src/messages/zh/common.json` — add error_boundary keys
3. `apps/web/src/messages/en/common.json` — add error_boundary keys
4. `apps/web/src/messages/ja/common.json` — add error_boundary keys
5. `apps/web/src/components/layout/header/Header.tsx` — add `variant="inline"`
6. `apps/web/src/app/[locale]/(home)/components/ActivityScreen.tsx` — add `variant="inline"`
7. `apps/web/src/components/modules/shared/SummarySwitcher.tsx` — add `variant="inline"`
