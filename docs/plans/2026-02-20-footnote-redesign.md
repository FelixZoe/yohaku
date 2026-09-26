# Footnote Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign FootnoteNode to support actual footnote content via a document-level definitions map, with tooltip preview on hover and a rendered footer section.

**Architecture:** A new `FootnoteSectionNode` (block, singleton at doc end) stores `definitions: Record<string, string>` (identifier to markdown content). A `FootnoteDefinitionsContext` provides definitions + display-number map to inline `FootnoteNode` renderers. A `FootnotePlugin` computes numbering by document order and syncs section with references.

**Tech Stack:** Lexical `DecoratorNode`, React Context (`createContext`/`use`), Vanilla Extract CSS, existing `RendererWrapper` pattern.

**Design doc:** `docs/plans/2026-02-20-footnote-redesign-design.md`

---

### Task 1: FootnoteDefinitionsContext

Create the context that provides footnote definitions and display numbering to all footnote renderers.

**Files:**
- Create: `packages/rich-editor/src/context/FootnoteDefinitionsContext.ts`

**Step 1: Create context file**

```typescript
// packages/rich-editor/src/context/FootnoteDefinitionsContext.ts
import { createContext, use, useMemo } from 'react'
import type { ReactNode } from 'react'

export interface FootnoteDefinitionsContextValue {
  definitions: Record<string, string>
  displayNumberMap: Record<string, number>
}

const FootnoteDefinitionsContext = createContext<FootnoteDefinitionsContextValue>({
  definitions: {},
  displayNumberMap: {},
})

export function FootnoteDefinitionsProvider({
  definitions,
  displayNumberMap,
  children,
}: FootnoteDefinitionsContextValue & { children: ReactNode }) {
  const value = useMemo(
    () => ({ definitions, displayNumberMap }),
    [definitions, displayNumberMap],
  )
  return (
    <FootnoteDefinitionsContext value={value}>
      {children}
    </FootnoteDefinitionsContext>
  )
}

export function useFootnoteDefinitions(): FootnoteDefinitionsContextValue {
  return use(FootnoteDefinitionsContext)
}

export function useFootnoteContent(identifier: string): string | undefined {
  const { definitions } = use(FootnoteDefinitionsContext)
  return definitions[identifier]
}

export function useFootnoteDisplayNumber(identifier: string): number | undefined {
  const { displayNumberMap } = use(FootnoteDefinitionsContext)
  return displayNumberMap[identifier]
}
```

Note: Uses React 19 `use()` (not `useContext()`), matching `ColorSchemeContext.tsx` and `RendererConfigContext.tsx` patterns. Uses JSX `<Context value={}>` provider pattern (React 19).

**Step 2: Export from index.ts**

Add to `packages/rich-editor/src/index.ts`:
```typescript
export {
  FootnoteDefinitionsProvider,
  useFootnoteDefinitions,
  useFootnoteContent,
  useFootnoteDisplayNumber,
} from './context/FootnoteDefinitionsContext'
export type { FootnoteDefinitionsContextValue } from './context/FootnoteDefinitionsContext'
```

**Step 3: Commit**

```bash
git add packages/rich-editor/src/context/FootnoteDefinitionsContext.ts packages/rich-editor/src/index.ts
git commit -m "feat(rich-editor): add FootnoteDefinitionsContext"
```

---

### Task 2: FootnoteSectionNode (static)

Create the block-level node that stores all footnote definitions. Follows the same `DecoratorNode<ReactElement>` pattern as other custom nodes.

**Files:**
- Create: `packages/rich-editor/src/nodes/FootnoteSectionNode.ts`
- Modify: `packages/rich-editor/src/nodes/index.ts` (if needed for shared node list)
- Modify: `packages/rich-editor/src/config.ts` (register static node)

**Step 1: Create FootnoteSectionNode**

```typescript
// packages/rich-editor/src/nodes/FootnoteSectionNode.ts
import type {
  EditorConfig,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from 'lexical'
import { DecoratorNode } from 'lexical'
import type { ReactElement } from 'react'

import { FootnoteSectionRenderer } from '../components/renderers/FootnoteSectionRenderer'
import { createRendererDecoration } from '../components/RendererWrapper'

export type SerializedFootnoteSectionNode = Spread<
  {
    definitions: Record<string, string>
  },
  SerializedLexicalNode
>

export class FootnoteSectionNode extends DecoratorNode<ReactElement> {
  __definitions: Record<string, string>

  static getType(): string {
    return 'footnote-section'
  }

  static clone(node: FootnoteSectionNode): FootnoteSectionNode {
    return new FootnoteSectionNode({ ...node.__definitions }, node.__key)
  }

  constructor(definitions: Record<string, string>, key?: NodeKey) {
    super(key)
    this.__definitions = definitions
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const div = document.createElement('div')
    div.className = 'rich-footnote-section'
    return div
  }

  updateDOM(): boolean {
    return false
  }

  isInline(): boolean {
    return false
  }

  static importJSON(serializedNode: SerializedFootnoteSectionNode): FootnoteSectionNode {
    return $createFootnoteSectionNode(serializedNode.definitions)
  }

  exportJSON(): SerializedFootnoteSectionNode {
    return {
      ...super.exportJSON(),
      type: 'footnote-section',
      definitions: this.__definitions,
      version: 1,
    }
  }

  getDefinitions(): Record<string, string> {
    return this.getLatest().__definitions
  }

  setDefinitions(definitions: Record<string, string>): void {
    const writable = this.getWritable()
    writable.__definitions = definitions
  }

  getDefinition(identifier: string): string | undefined {
    return this.getLatest().__definitions[identifier]
  }

  setDefinition(identifier: string, content: string): void {
    const writable = this.getWritable()
    writable.__definitions = { ...writable.__definitions, [identifier]: content }
  }

  removeDefinition(identifier: string): void {
    const writable = this.getWritable()
    const { [identifier]: _, ...rest } = writable.__definitions
    writable.__definitions = rest
  }

  decorate(_editor: LexicalEditor, _config: EditorConfig): ReactElement {
    return createRendererDecoration('FootnoteSection', FootnoteSectionRenderer, {
      definitions: this.__definitions,
      nodeKey: this.__key,
    })
  }
}

export function $createFootnoteSectionNode(
  definitions: Record<string, string> = {},
): FootnoteSectionNode {
  return new FootnoteSectionNode(definitions)
}

export function $isFootnoteSectionNode(
  node: LexicalNode | null | undefined,
): node is FootnoteSectionNode {
  return node instanceof FootnoteSectionNode
}
```

**Step 2: Register in config.ts**

Add `FootnoteSectionNode` to `customNodes` array in `packages/rich-editor/src/config.ts`:

```typescript
import { FootnoteSectionNode } from './nodes/FootnoteSectionNode'

// In customNodes array, add:
FootnoteSectionNode,
```

**Step 3: Add `FootnoteSection` to RendererConfig**

In `packages/rich-editor/src/types/renderer-config.ts`, add:

```typescript
import type { FootnoteSectionRendererProps } from '../components/renderers/FootnoteSectionRenderer'

// Inside RendererConfig interface:
/** Custom renderer for footnote definition section */
FootnoteSection?: ComponentType<FootnoteSectionRendererProps>
```

Also update `RendererWrapper.tsx` if it has a typed key union — check the `RendererKey` type mapping.

**Step 4: Export from index.ts**

Add to `packages/rich-editor/src/index.ts`:

```typescript
export {
  FootnoteSectionNode,
  $createFootnoteSectionNode,
  $isFootnoteSectionNode,
} from './nodes/FootnoteSectionNode'
export type { SerializedFootnoteSectionNode } from './nodes/FootnoteSectionNode'
```

**Step 5: Commit**

```bash
git add packages/rich-editor/src/nodes/FootnoteSectionNode.ts packages/rich-editor/src/config.ts packages/rich-editor/src/types/renderer-config.ts packages/rich-editor/src/index.ts
git commit -m "feat(rich-editor): add FootnoteSectionNode for footnote definitions"
```

---

### Task 3: FootnoteSectionRenderer (static)

Create the read-only renderer that displays the footnote definitions footer.

**Files:**
- Create: `packages/rich-editor/src/components/renderers/FootnoteSectionRenderer.tsx`
- Modify: `packages/rich-editor/src/styles/shared.css.ts` (add footer section styles)

**Step 1: Create FootnoteSectionRenderer**

```tsx
// packages/rich-editor/src/components/renderers/FootnoteSectionRenderer.tsx
import type { MouseEvent } from 'react'
import { useCallback } from 'react'

import { useFootnoteDefinitions } from '../../context/FootnoteDefinitionsContext'

export interface FootnoteSectionRendererProps {
  definitions: Record<string, string>
  nodeKey: string
}

export function FootnoteSectionRenderer({ definitions }: FootnoteSectionRendererProps) {
  const { displayNumberMap } = useFootnoteDefinitions()

  // Sort entries by display number
  const sortedEntries = Object.entries(definitions).sort(
    ([a], [b]) => (displayNumberMap[a] ?? 0) - (displayNumberMap[b] ?? 0),
  )

  if (sortedEntries.length === 0) return null

  return (
    <div className="rich-footnote-section-content" role="doc-endnotes">
      <hr className="rich-footnote-section-divider" />
      <ol className="rich-footnote-section-list">
        {sortedEntries.map(([identifier, content]) => {
          const displayNum = displayNumberMap[identifier] ?? identifier
          return (
            <FootnoteSectionItem
              key={identifier}
              identifier={identifier}
              content={content}
              displayNum={displayNum}
            />
          )
        })}
      </ol>
    </div>
  )
}

function FootnoteSectionItem({
  identifier,
  content,
  displayNum,
}: {
  identifier: string
  content: string
  displayNum: number | string
}) {
  const targetId = `footnote-${identifier}`
  const refId = `footnote-ref-${identifier}`

  const handleBackClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault()
      const refElement = document.getElementById(refId)
      if (!refElement) return
      refElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      refElement.classList.add('rich-footnote-highlight')
      window.setTimeout(() => {
        refElement.classList.remove('rich-footnote-highlight')
      }, 1200)
    },
    [refId],
  )

  return (
    <li id={targetId} className="rich-footnote-section-item" value={typeof displayNum === 'number' ? displayNum : undefined}>
      <span className="rich-footnote-section-item-content">
        {content}
      </span>
      <a
        href={`#${refId}`}
        onClick={handleBackClick}
        className="rich-footnote-back-ref"
        role="doc-backlink"
        aria-label={`Back to reference ${displayNum}`}
      >
        ↩
      </a>
    </li>
  )
}
```

Note: Content is plain text for now. Inline markdown rendering (bold, links, code) will be handled via a lightweight inline markdown parser in a later enhancement — or by the custom renderer injection (`RendererConfig.FootnoteSection`). The host app (Shiro web) can provide a rich renderer.

**Step 2: Add styles to shared.css.ts**

Add to `packages/rich-editor/src/styles/shared.css.ts` after the existing footnote styles:

```typescript
// ─── Footnote Section ──────────────────────────────────
globalStyle(`${richContent} .rich-footnote-section`, {
  marginTop: vars.spacing.lg,
})

globalStyle(`${richContent} .rich-footnote-section-divider`, {
  border: 'none',
  borderTop: `1px solid ${vars.color.border}`,
  margin: `${vars.spacing.lg} 0 ${vars.spacing.md}`,
})

globalStyle(`${richContent} .rich-footnote-section-list`, {
  listStyleType: 'decimal',
  paddingLeft: vars.spacing.lg,
  fontSize: vars.typography.fontSizeSmall,
  color: vars.color.textSecondary,
  lineHeight: '1.6',
})

globalStyle(`${richContent} .rich-footnote-section-item`, {
  marginBottom: vars.spacing.sm,
  paddingLeft: vars.spacing.xs,
})

globalStyle(`${richContent} .rich-footnote-back-ref`, {
  display: 'inline-flex',
  alignItems: 'center',
  marginLeft: vars.spacing.xs,
  color: vars.color.accent,
  textDecoration: 'none',
  fontSize: '0.85em',
  transition: 'opacity 0.15s ease',
})

globalStyle(`${richContent} .rich-footnote-back-ref:hover`, {
  opacity: 0.7,
})
```

**Step 3: Commit**

```bash
git add packages/rich-editor/src/components/renderers/FootnoteSectionRenderer.tsx packages/rich-editor/src/styles/shared.css.ts
git commit -m "feat(rich-editor): add FootnoteSectionRenderer with footer styles"
```

---

### Task 4: FootnotePlugin

Create the plugin that computes display-number mapping and provides the `FootnoteDefinitionsContext`.

**Files:**
- Create: `packages/rich-editor/src/plugins/FootnotePlugin.tsx`
- Modify: `packages/rich-editor/src/index.ts` (export)

**Step 1: Create FootnotePlugin**

```tsx
// packages/rich-editor/src/plugins/FootnotePlugin.tsx
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $nodesOfType } from 'lexical'
import { useEffect, useState } from 'react'

import { FootnoteDefinitionsProvider } from '../context/FootnoteDefinitionsContext'
import { $isFootnoteNode, FootnoteNode } from '../nodes/FootnoteNode'
import {
  $isFootnoteSectionNode,
  FootnoteSectionNode,
} from '../nodes/FootnoteSectionNode'

export function FootnotePlugin({ children }: { children?: React.ReactNode }) {
  const [editor] = useLexicalComposerContext()
  const [definitions, setDefinitions] = useState<Record<string, string>>({})
  const [displayNumberMap, setDisplayNumberMap] = useState<Record<string, number>>({})

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        // Compute display number map from footnote reference order
        const footnoteNodes = $nodesOfType(FootnoteNode)
        const seen = new Set<string>()
        const numberMap: Record<string, number> = {}
        let counter = 1
        for (const node of footnoteNodes) {
          const id = node.getIdentifier()
          if (!seen.has(id)) {
            seen.add(id)
            numberMap[id] = counter++
          }
        }
        setDisplayNumberMap(numberMap)

        // Read definitions from FootnoteSectionNode
        const sectionNodes = $nodesOfType(FootnoteSectionNode)
        if (sectionNodes.length > 0) {
          setDefinitions(sectionNodes[0].getDefinitions())
        } else {
          setDefinitions({})
        }
      })
    })
  }, [editor])

  return (
    <FootnoteDefinitionsProvider
      definitions={definitions}
      displayNumberMap={displayNumberMap}
    >
      {children}
    </FootnoteDefinitionsProvider>
  )
}
```

Note: This plugin wraps children with the provider. The host `RichEditor`/`RichRenderer` component needs to include this plugin so that `FootnoteNode` renderers can access the context. If wrapping children is not feasible in the current architecture, an alternative is to use a portal-based approach or have the plugin dispatch to a shared store.

Alternative simpler approach: If wrapping is awkward, the plugin can be a null-returning component that writes to a module-level store (jotai atom or simple event emitter), and the renderers subscribe to it. Evaluate during implementation which fits the existing `RichEditor`/`RichRenderer` component tree better.

**Step 2: Export from index.ts**

```typescript
export { FootnotePlugin } from './plugins/FootnotePlugin'
```

**Step 3: Commit**

```bash
git add packages/rich-editor/src/plugins/FootnotePlugin.tsx packages/rich-editor/src/index.ts
git commit -m "feat(rich-editor): add FootnotePlugin for numbering and definitions context"
```

---

### Task 5: Update FootnoteRenderer with Tooltip

Enhance the existing `FootnoteRenderer` to show tooltip on hover and display the computed number.

**Files:**
- Modify: `packages/rich-editor/src/components/renderers/FootnoteRenderer.tsx`

**Step 1: Update FootnoteRenderer**

```tsx
// packages/rich-editor/src/components/renderers/FootnoteRenderer.tsx
import type { MouseEvent } from 'react'
import { useCallback, useState } from 'react'

import {
  useFootnoteContent,
  useFootnoteDisplayNumber,
} from '../../context/FootnoteDefinitionsContext'

export interface FootnoteRendererProps {
  identifier: string
}

export function FootnoteRenderer({ identifier }: FootnoteRendererProps) {
  const content = useFootnoteContent(identifier)
  const displayNumber = useFootnoteDisplayNumber(identifier)
  const [showTooltip, setShowTooltip] = useState(false)

  const referenceId = `footnote-ref-${identifier}`
  const targetId = `footnote-${identifier}`

  const handleClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      const target =
        document.getElementById(targetId) ||
        document.getElementById(`fn-${identifier}`)
      if (!target) return

      e.preventDefault()
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      target.classList.add('rich-footnote-highlight')

      window.setTimeout(() => {
        target.classList.remove('rich-footnote-highlight')
      }, 1200)
    },
    [identifier, targetId],
  )

  const label = displayNumber ?? identifier

  return (
    <span
      className="rich-footnote-ref-wrapper"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <a
        className="rich-footnote-ref"
        href={`#${targetId}`}
        id={referenceId}
        role="doc-noteref"
        onClick={handleClick}
        data-footnote-ref={identifier}
      >
        {label}
      </a>
      {showTooltip && content && (
        <span className="rich-footnote-tooltip" role="tooltip">
          {content}
        </span>
      )}
    </span>
  )
}
```

**Step 2: Add tooltip styles to shared.css.ts**

Add after existing footnote ref styles:

```typescript
globalStyle(`${richContent} .rich-footnote-ref-wrapper`, {
  position: 'relative',
  display: 'inline',
})

globalStyle(`${richContent} .rich-footnote-tooltip`, {
  position: 'absolute',
  bottom: '100%',
  left: '50%',
  transform: 'translateX(-50%)',
  marginBottom: '6px',
  padding: '6px 10px',
  fontSize: vars.typography.fontSizeSmall,
  lineHeight: '1.4',
  color: vars.color.text,
  backgroundColor: vars.color.bgSecondary,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.borderRadius.md,
  whiteSpace: 'nowrap',
  maxWidth: '300px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  zIndex: 50,
  pointerEvents: 'none',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
})
```

**Step 3: Commit**

```bash
git add packages/rich-editor/src/components/renderers/FootnoteRenderer.tsx packages/rich-editor/src/styles/shared.css.ts
git commit -m "feat(rich-editor): add tooltip preview to FootnoteRenderer"
```

---

### Task 6: Update Footnote Transformer for Section Import/Export

Enhance the existing footnote transformer to handle `FootnoteSectionNode` import/export in markdown.

**Files:**
- Modify: `packages/rich-editor/src/transformers/footnote.ts`
- Modify: `packages/rich-editor/src/transformers/index.ts`

**Step 1: Add section export to transformer**

The inline `FOOTNOTE_TRANSFORMER` stays as-is. Add a new `ElementTransformer` for the section:

```typescript
// Add to packages/rich-editor/src/transformers/footnote.ts
import type { ElementTransformer } from '@lexical/markdown'
import { $createFootnoteSectionNode, $isFootnoteSectionNode, FootnoteSectionNode } from '../nodes/FootnoteSectionNode'

export const FOOTNOTE_SECTION_TRANSFORMER: ElementTransformer = {
  dependencies: [FootnoteSectionNode],
  export: (node) => {
    if (!$isFootnoteSectionNode(node)) return null
    const definitions = node.getDefinitions()
    return Object.entries(definitions)
      .map(([id, content]) => `[^${id}]: ${content}`)
      .join('\n')
  },
  regExp: /^\[\^(\w+)\]:\s+(.+)$/,
  replace: (parentNode, _children, match) => {
    // Accumulate into existing section node or create new one
    // This is called per-line, so we need to find or create the section
    const identifier = match[1]
    const content = match[2]

    // Look for existing FootnoteSectionNode in root
    const root = parentNode.getParent()
    if (root) {
      const children = root.getChildren()
      for (const child of children) {
        if ($isFootnoteSectionNode(child)) {
          child.setDefinition(identifier, content)
          parentNode.remove()
          return
        }
      }
    }

    // No existing section, create one
    const sectionNode = $createFootnoteSectionNode({ [identifier]: content })
    parentNode.replace(sectionNode)
  },
  type: 'element',
}
```

**Step 2: Register in transformers/index.ts**

Add `FOOTNOTE_SECTION_TRANSFORMER` to the `ALL_TRANSFORMERS` array in `packages/rich-editor/src/transformers/index.ts`, in the block transformers section (before `...TRANSFORMERS`).

**Step 3: Commit**

```bash
git add packages/rich-editor/src/transformers/footnote.ts packages/rich-editor/src/transformers/index.ts
git commit -m "feat(rich-editor): add footnote section markdown transformer"
```

---

### Task 7: FootnoteSectionEditNode + Edit Renderer

Create the edit variant of `FootnoteSectionNode` following the edit/static split pattern.

**Files:**
- Create: `packages/rich-editor/src/nodes/FootnoteSectionEditNode.ts`
- Create: `packages/rich-editor/src/components/renderers/FootnoteSectionEditRenderer.tsx`
- Modify: `packages/rich-editor/src/config-edit.ts` (register edit node)

**Step 1: Create FootnoteSectionEditRenderer**

```tsx
// packages/rich-editor/src/components/renderers/FootnoteSectionEditRenderer.tsx
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useCallback } from 'react'

import { useFootnoteDefinitions } from '../../context/FootnoteDefinitionsContext'
import { $isFootnoteSectionNode, FootnoteSectionNode } from '../../nodes/FootnoteSectionNode'
import { $nodesOfType } from 'lexical'

export interface FootnoteSectionEditRendererProps {
  definitions: Record<string, string>
  nodeKey: string
}

export function FootnoteSectionEditRenderer({
  definitions,
  nodeKey,
}: FootnoteSectionEditRendererProps) {
  const [editor] = useLexicalComposerContext()
  const { displayNumberMap } = useFootnoteDefinitions()

  const sortedEntries = Object.entries(definitions).sort(
    ([a], [b]) => (displayNumberMap[a] ?? 0) - (displayNumberMap[b] ?? 0),
  )

  const handleContentChange = useCallback(
    (identifier: string, newContent: string) => {
      editor.update(() => {
        const sectionNodes = $nodesOfType(FootnoteSectionNode)
        if (sectionNodes.length > 0) {
          sectionNodes[0].setDefinition(identifier, newContent)
        }
      })
    },
    [editor],
  )

  const handleRemove = useCallback(
    (identifier: string) => {
      editor.update(() => {
        const sectionNodes = $nodesOfType(FootnoteSectionNode)
        if (sectionNodes.length > 0) {
          sectionNodes[0].removeDefinition(identifier)
        }
      })
    },
    [editor],
  )

  if (sortedEntries.length === 0) return null

  return (
    <div className="rich-footnote-section-content rich-footnote-section-edit" role="doc-endnotes">
      <hr className="rich-footnote-section-divider" />
      <ol className="rich-footnote-section-list">
        {sortedEntries.map(([identifier, content]) => {
          const displayNum = displayNumberMap[identifier] ?? identifier
          return (
            <li key={identifier} id={`footnote-${identifier}`} className="rich-footnote-section-item rich-footnote-section-item-edit">
              <span className="rich-footnote-section-item-num">{displayNum}.</span>
              <input
                type="text"
                className="rich-footnote-section-item-input"
                value={content}
                onChange={(e) => handleContentChange(identifier, e.target.value)}
                placeholder={`Footnote content for [^${identifier}]`}
              />
              <button
                type="button"
                className="rich-footnote-section-item-remove"
                onClick={() => handleRemove(identifier)}
                aria-label={`Remove footnote ${identifier}`}
              >
                ×
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
```

**Step 2: Create FootnoteSectionEditNode**

```typescript
// packages/rich-editor/src/nodes/FootnoteSectionEditNode.ts
import type { EditorConfig, LexicalEditor } from 'lexical'
import { createElement } from 'react'
import type { ReactElement } from 'react'

import { FootnoteSectionEditRenderer } from '../components/renderers/FootnoteSectionEditRenderer'
import {
  FootnoteSectionNode,
  type SerializedFootnoteSectionNode,
  $createFootnoteSectionNode,
} from './FootnoteSectionNode'

export class FootnoteSectionEditNode extends FootnoteSectionNode {
  static clone(node: FootnoteSectionEditNode): FootnoteSectionEditNode {
    return new FootnoteSectionEditNode({ ...node.__definitions }, node.__key)
  }

  static importJSON(serializedNode: SerializedFootnoteSectionNode): FootnoteSectionEditNode {
    const node = new FootnoteSectionEditNode(serializedNode.definitions)
    return node
  }

  decorate(_editor: LexicalEditor, _config: EditorConfig): ReactElement {
    return createElement(FootnoteSectionEditRenderer, {
      definitions: this.__definitions,
      nodeKey: this.__key,
    })
  }
}
```

**Step 3: Register in config-edit.ts**

In `packages/rich-editor/src/config-edit.ts`, import and add `FootnoteSectionEditNode`:

```typescript
import { FootnoteSectionEditNode } from './nodes/FootnoteSectionEditNode'

// In customEditNodes array, add:
FootnoteSectionEditNode,
```

**Step 4: Add edit-mode styles to shared.css.ts**

```typescript
// ─── Footnote Section Edit ─────────────────────────────
globalStyle(`${richContent} .rich-footnote-section-item-edit`, {
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing.sm,
  listStyleType: 'none',
})

globalStyle(`${richContent} .rich-footnote-section-item-num`, {
  flexShrink: 0,
  color: vars.color.textSecondary,
  fontSize: vars.typography.fontSizeSmall,
  fontWeight: 600,
  minWidth: '1.5em',
})

globalStyle(`${richContent} .rich-footnote-section-item-input`, {
  flex: 1,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.borderRadius.sm,
  padding: `${vars.spacing.xs} ${vars.spacing.sm}`,
  fontSize: vars.typography.fontSizeSmall,
  color: vars.color.text,
  backgroundColor: 'transparent',
  outline: 'none',
  transition: 'border-color 0.15s ease',
})

globalStyle(`${richContent} .rich-footnote-section-item-input:focus`, {
  borderColor: vars.color.accent,
})

globalStyle(`${richContent} .rich-footnote-section-item-remove`, {
  flexShrink: 0,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '20px',
  height: '20px',
  border: 'none',
  background: 'none',
  color: vars.color.textSecondary,
  cursor: 'pointer',
  borderRadius: vars.borderRadius.sm,
  fontSize: '14px',
  transition: 'color 0.15s ease, background-color 0.15s ease',
})

globalStyle(`${richContent} .rich-footnote-section-item-remove:hover`, {
  color: '#ef4444',
  backgroundColor: 'rgba(239, 68, 68, 0.1)',
})
```

**Step 5: Export from index.ts**

```typescript
export { FootnoteSectionEditNode } from './nodes/FootnoteSectionEditNode'
```

**Step 6: Commit**

```bash
git add packages/rich-editor/src/nodes/FootnoteSectionEditNode.ts packages/rich-editor/src/components/renderers/FootnoteSectionEditRenderer.tsx packages/rich-editor/src/config-edit.ts packages/rich-editor/src/styles/shared.css.ts packages/rich-editor/src/index.ts
git commit -m "feat(rich-editor): add FootnoteSectionEditNode with editable definitions UI"
```

---

### Task 8: Wire FootnotePlugin into RichEditor and RichRenderer

Integrate the `FootnotePlugin` into the editor and renderer component trees so `FootnoteDefinitionsContext` is available to all footnote renderers.

**Files:**
- Modify: `packages/rich-editor/src/components/RichEditor.tsx` (or wherever plugins are composed)
- Modify: `packages/rich-editor/src/components/RichRenderer.tsx` (or equivalent)

**Step 1: Investigate current plugin wiring**

Read `packages/rich-editor/src/components/RichEditor.tsx` and `RichRenderer.tsx` to understand where plugins are composed. The `FootnotePlugin` wraps children with a provider, so it needs to be positioned above the `LexicalContentEditable` and any decorator nodes in the component tree.

If the architecture doesn't support wrapping plugins (most Lexical plugins return `null`), refactor `FootnotePlugin` to:
1. Return `null` (standard plugin pattern)
2. Write to a module-level store or Jotai atom
3. Have `FootnoteRenderer` and `FootnoteSectionRenderer` read from that store directly

Evaluate and implement the approach that fits the existing component tree.

**Step 2: Commit**

```bash
git add packages/rich-editor/src/components/ packages/rich-editor/src/plugins/FootnotePlugin.tsx
git commit -m "feat(rich-editor): wire FootnotePlugin into editor and renderer"
```

---

### Task 9: Update Demo Fixtures

Update the demo playground to include `FootnoteSectionNode` data alongside existing footnote references.

**Files:**
- Modify: `packages/rich-editor-demo/src/fixtures/helpers.ts` (add `footnoteSection` helper)
- Modify: `packages/rich-editor-demo/src/fixtures/markdown-test-preset.ts` (add section data)
- Modify: `packages/rich-editor-demo/src/fixtures/node-samples.ts` (update footnote sample)

**Step 1: Add helper**

In `helpers.ts`, add:
```typescript
export function footnoteSection(definitions: Record<string, string>) {
  return {
    type: 'footnote-section',
    definitions,
    version: 1,
  }
}
```

**Step 2: Update fixtures**

In `markdown-test-preset.ts`, after the footnote paragraph, add:
```typescript
footnoteSection({
  '1': 'This is the first footnote content with a **bold** word.',
  '2': 'Second footnote referencing [a link](https://example.com).',
}) as any,
```

In `node-samples.ts`, update the footnote sample to include a section node at the end.

**Step 3: Commit**

```bash
git add packages/rich-editor-demo/src/fixtures/
git commit -m "feat(rich-editor-demo): update fixtures with FootnoteSectionNode data"
```

---

### Task 10: Lint Check and Integration Verification

**Step 1: Run lint on modified files**

```bash
pnpm --filter @haklex/rich-editor lint
```

Fix any TypeScript or ESLint errors.

**Step 2: Build**

```bash
pnpm --filter @haklex/rich-editor build
```

**Step 3: Visual verification in demo**

```bash
pnpm --filter @haklex/rich-editor-demo dev
```

Open the demo in browser, verify:
- Footnote references show numbered badges
- Hover shows tooltip with content
- Click scrolls to footer
- Footer shows all definitions with back links
- In editor mode, definitions are editable
- Markdown `[^id]` shortcut still works

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix(rich-editor): resolve lint and build issues for footnote redesign"
```
