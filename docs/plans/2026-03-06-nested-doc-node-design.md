# NestedDocNode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a NestedDocNode to haklex rich-editor that embeds a full nested document, collapsed by default (400px preview with gradient mask), expandable in-place with CSS transition. Edit mode opens a Modal for full editing.

**Architecture:** DecoratorNode with SerializedEditorState content, following the AlertQuoteNode static/edit split pattern. Static decorator handles collapse/expand with truncated node rendering. Edit decorator adds Modal-based editing via `@haklex/rich-editor-ui` Dialog. No RendererConfig entry needed — rendering logic is self-contained in decorators.

**Tech Stack:** Lexical DecoratorNode, React, Vanilla Extract CSS, `@haklex/rich-editor-ui` Dialog (edit only)

---

### Task 1: Static Node (`NestedDocNode`)

**Files:**
- Create: `haklex/rich-editor/src/nodes/NestedDocNode.ts`

**Step 1: Create the static node class**

```typescript
import type {
  EditorConfig,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  SerializedEditorState,
  SerializedLexicalNode,
  Spread,
} from 'lexical'
import { DecoratorNode } from 'lexical'
import type { ReactElement } from 'react'
import { createElement } from 'react'

import { NestedDocStaticDecorator } from '../components/renderers/NestedDocStaticDecorator'
import { extractTextContent } from '../utils/extractTextContent'

export type SerializedNestedDocNode = Spread<
  {
    content: SerializedEditorState
  },
  SerializedLexicalNode
>

const EMPTY_STATE = {
  root: {
    children: [
      {
        type: 'paragraph',
        children: [],
        direction: null,
        format: '',
        indent: 0,
        textFormat: 0,
        textStyle: '',
        version: 1,
      },
    ],
    direction: null,
    format: '',
    indent: 0,
    type: 'root',
    version: 1,
  },
} as unknown as SerializedEditorState

export class NestedDocNode extends DecoratorNode<ReactElement> {
  __contentState: SerializedEditorState

  static getType(): string {
    return 'nested-doc'
  }

  static clone(node: NestedDocNode): NestedDocNode {
    return new NestedDocNode(node.__contentState, node.__key)
  }

  constructor(contentState?: SerializedEditorState, key?: NodeKey) {
    super(key)
    this.__contentState = contentState || EMPTY_STATE
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const div = document.createElement('div')
    div.className = 'rich-nested-doc'
    return div
  }

  updateDOM(): boolean {
    return false
  }

  isInline(): boolean {
    return false
  }

  getContentState(): SerializedEditorState {
    return this.getLatest().__contentState
  }

  setContentState(state: SerializedEditorState): void {
    const writable = this.getWritable()
    writable.__contentState = state
  }

  getTextContent(): string {
    return extractTextContent(this.__contentState)
  }

  static importJSON(serializedNode: SerializedNestedDocNode): NestedDocNode {
    return new NestedDocNode(serializedNode.content)
  }

  exportJSON(): SerializedNestedDocNode {
    return {
      ...super.exportJSON(),
      type: 'nested-doc',
      content: this.__contentState,
      version: 1,
    }
  }

  decorate(_editor: LexicalEditor, _config: EditorConfig): ReactElement {
    return createElement(NestedDocStaticDecorator, {
      contentState: this.__contentState,
    })
  }
}

export function $createNestedDocNode(
  contentState?: SerializedEditorState,
): NestedDocNode {
  return new NestedDocNode(contentState)
}

export function $isNestedDocNode(
  node: LexicalNode | null | undefined,
): node is NestedDocNode {
  return node instanceof NestedDocNode
}
```

**Step 2: Commit**

```bash
git add haklex/rich-editor/src/nodes/NestedDocNode.ts
git commit -m "feat(rich-editor): add NestedDocNode static node class"
```

---

### Task 2: Styles (`nested-doc.css.ts`)

**Files:**
- Create: `haklex/rich-editor/src/styles/nested-doc.css.ts`

**Step 1: Create Vanilla Extract styles**

```typescript
import { vars } from '@haklex/rich-style-token'
import { globalStyle } from '@vanilla-extract/css'

import { richContent } from './shared.css'

// ─── Container ─────────────────────────────────────────
globalStyle(`${richContent} .rich-nested-doc`, {
  margin: `${vars.spacing.md} 0`,
  position: 'relative',
  borderRadius: vars.borderRadius.md,
  border: `1px solid ${vars.color.border}`,
  overflow: 'hidden',
  interpolateSize: 'allow-keywords',
})

// ─── Content wrapper ───────────────────────────────────
globalStyle(`${richContent} .rich-nested-doc-content`, {
  padding: vars.spacing.md,
  maxHeight: '400px',
  overflow: 'hidden',
  transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
})

globalStyle(`${richContent} .rich-nested-doc-content[data-expanded="true"]`, {
  maxHeight: 'none',
})

// ─── Gradient mask ─────────────────────────────────────
globalStyle(`${richContent} .rich-nested-doc-mask`, {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  height: '120px',
  background: `linear-gradient(to bottom, transparent, ${vars.color.bg})`,
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'center',
  paddingBottom: vars.spacing.md,
  transition: 'opacity 0.3s ease',
  pointerEvents: 'none',
})

globalStyle(`${richContent} .rich-nested-doc-mask[data-expanded="true"]`, {
  opacity: 0,
  pointerEvents: 'none',
})

// ─── Expand/Collapse button ────────────────────────────
globalStyle(`${richContent} .rich-nested-doc-toggle`, {
  pointerEvents: 'auto',
  cursor: 'pointer',
  border: 'none',
  borderRadius: vars.borderRadius.sm,
  padding: `${vars.spacing.xs} ${vars.spacing.md}`,
  fontSize: '0.8125rem',
  fontWeight: 500,
  color: vars.color.textSecondary,
  backgroundColor: vars.color.bgSecondary,
  transition: 'color 0.2s ease, background-color 0.2s ease',
})

globalStyle(`${richContent} .rich-nested-doc-toggle:hover`, {
  color: vars.color.text,
  backgroundColor: vars.color.bgTertiary,
})

// ─── Edit mode: clickable indicator ────────────────────
globalStyle(`[contenteditable="true"] .rich-nested-doc`, {
  cursor: 'pointer',
})

globalStyle(`[contenteditable="true"] .rich-nested-doc:hover`, {
  borderColor: vars.color.accent,
})
```

**Step 2: Import styles in the styles barrel**

Check `haklex/rich-editor/src/styles/index.ts` and add import for `nested-doc.css`.

**Step 3: Commit**

```bash
git add haklex/rich-editor/src/styles/nested-doc.css.ts
git commit -m "feat(rich-editor): add NestedDocNode styles"
```

---

### Task 3: Static Decorator (`NestedDocStaticDecorator`)

**Files:**
- Create: `haklex/rich-editor/src/components/renderers/NestedDocStaticDecorator.tsx`

**Step 1: Create the static decorator**

The decorator truncates the `SerializedEditorState` to the first ~10 root children for performance, then renders with `useNestedContentRenderer`. It manages collapsed/expanded state locally.

```tsx
import type { SerializedEditorState } from 'lexical'
import { useCallback, useMemo, useState } from 'react'

import { useNestedContentRenderer } from '../../context/NestedContentRendererContext'

interface NestedDocStaticDecoratorProps {
  contentState: SerializedEditorState
}

const MAX_PREVIEW_NODES = 10

function truncateState(
  state: SerializedEditorState,
  maxNodes: number,
): SerializedEditorState {
  const root = state.root
  if (!root?.children || root.children.length <= maxNodes) return state
  return {
    ...state,
    root: {
      ...root,
      children: root.children.slice(0, maxNodes),
    },
  } as SerializedEditorState
}

export function NestedDocStaticDecorator({
  contentState,
}: NestedDocStaticDecoratorProps) {
  const renderContent = useNestedContentRenderer()
  const [expanded, setExpanded] = useState(false)

  const needsTruncation = (contentState.root?.children?.length ?? 0) > MAX_PREVIEW_NODES
  const previewState = useMemo(
    () => (needsTruncation ? truncateState(contentState, MAX_PREVIEW_NODES) : contentState),
    [contentState, needsTruncation],
  )

  const handleToggle = useCallback(() => {
    setExpanded((prev) => !prev)
  }, [])

  const displayState = expanded ? contentState : previewState

  return (
    <>
      <div
        className="rich-nested-doc-content"
        data-expanded={expanded}
      >
        {renderContent(displayState)}
      </div>
      {(needsTruncation || expanded) && (
        <div className="rich-nested-doc-mask" data-expanded={expanded}>
          <button
            type="button"
            className="rich-nested-doc-toggle"
            onClick={handleToggle}
          >
            {expanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
      )}
    </>
  )
}
```

**Step 2: Commit**

```bash
git add haklex/rich-editor/src/components/renderers/NestedDocStaticDecorator.tsx
git commit -m "feat(rich-editor): add NestedDocStaticDecorator with collapse/expand"
```

---

### Task 4: Edit Node (`NestedDocEditNode`)

**Files:**
- Create: `haklex/rich-editor/src/nodes/NestedDocEditNode.ts`

**Step 1: Create the edit node class**

The edit node extends `NestedDocNode`, adds `__contentEditor` (a nested Lexical editor instance), overrides `decorate()` to use the edit decorator, and registers `commandItems` for the slash menu.

**Important:** Unlike AlertQuoteEditNode which uses `NESTED_EDITOR_NODES` (limited set), NestedDocEditNode uses the full set of edit nodes via `getResolvedEditNodes()` from `node-registry.ts`.

```typescript
import type {
  EditorConfig,
  LexicalEditor,
  SerializedEditorState,
} from 'lexical'
import { $insertNodes, createEditor } from 'lexical'
import { FileText } from 'lucide-react'
import type { ReactElement } from 'react'
import { createElement } from 'react'

import { NestedDocEditDecorator } from '../components/decorators/NestedDocEditDecorator'
import { getResolvedEditNodes } from '../node-registry'
import { editorTheme } from '../styles/theme'
import type { CommandItemConfig } from '../types/slash-menu'
import {
  NestedDocNode,
  type SerializedNestedDocNode,
} from './NestedDocNode'

function createContentEditor(): LexicalEditor {
  return createEditor({
    namespace: 'NestedDocContent',
    nodes: getResolvedEditNodes(),
    theme: editorTheme,
    onError: (error: Error) => {
      console.error('[NestedDocContent]', error)
    },
  })
}

export class NestedDocEditNode extends NestedDocNode {
  __contentEditor: LexicalEditor

  static commandItems: CommandItemConfig[] = [
    {
      title: 'Nested Document',
      icon: createElement(FileText, { size: 20 }),
      description: 'Embed a collapsible nested document',
      keywords: ['nested', 'document', 'nested-doc', 'embed'],
      section: 'ADVANCED',
      placement: ['slash', 'toolbar'],
      group: 'insert',
      onSelect: (editor) => {
        editor.update(() => {
          $insertNodes([$createNestedDocEditNode()])
        })
      },
    },
  ]

  static clone(node: NestedDocEditNode): NestedDocEditNode {
    const cloned = new NestedDocEditNode(
      node.__contentState,
      node.__key,
    )
    cloned.__contentEditor = node.__contentEditor
    return cloned
  }

  constructor(contentState?: SerializedEditorState, key?: string) {
    super(contentState, key)
    this.__contentEditor = createContentEditor()
    if (contentState) {
      const editorState = this.__contentEditor.parseEditorState(contentState)
      this.__contentEditor.setEditorState(editorState)
    }
  }

  getContentEditor(): LexicalEditor {
    return this.__contentEditor
  }

  static importJSON(
    serializedNode: SerializedNestedDocNode,
  ): NestedDocEditNode {
    return new NestedDocEditNode(serializedNode.content)
  }

  exportJSON(): SerializedNestedDocNode {
    return {
      ...super.exportJSON(),
      type: 'nested-doc',
      content: this.__contentEditor.getEditorState().toJSON(),
      version: 1,
    }
  }

  decorate(_editor: LexicalEditor, _config: EditorConfig): ReactElement {
    return createElement(NestedDocEditDecorator, {
      nodeKey: this.__key,
      contentEditor: this.__contentEditor,
      contentState: this.__contentState,
    })
  }
}

export function $createNestedDocEditNode(
  contentState?: SerializedEditorState,
): NestedDocEditNode {
  return new NestedDocEditNode(contentState)
}
```

**Step 2: Commit**

```bash
git add haklex/rich-editor/src/nodes/NestedDocEditNode.ts
git commit -m "feat(rich-editor): add NestedDocEditNode with slash menu registration"
```

---

### Task 5: Edit Decorator (`NestedDocEditDecorator`)

**Files:**
- Create: `haklex/rich-editor/src/components/decorators/NestedDocEditDecorator.tsx`

**Step 1: Create the edit decorator**

The edit decorator renders the same collapsed preview as the static decorator, but adds a click-to-edit interaction. Clicking opens a Dialog (from `@haklex/rich-editor-ui`) containing a `LexicalNestedComposer` with full editing capability.

**Circular dependency note:** Cannot import `RichEditor` directly (it imports config-edit → NestedDocEditNode → this file). Instead, use `LexicalNestedComposer` with the content editor, same as AlertEditDecorator but rendered inside a Dialog.

```tsx
import { presentDialog } from '@haklex/rich-editor-ui'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { LexicalNestedComposer } from '@lexical/react/LexicalNestedComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import type { LexicalEditor, SerializedEditorState } from 'lexical'
import { $getNodeByKey } from 'lexical'
import { useCallback, useMemo, useState } from 'react'

import { useNestedContentRenderer } from '../../context/NestedContentRendererContext'
import { $isNestedDocNode } from '../../nodes/NestedDocNode'

const MAX_PREVIEW_NODES = 10

function truncateState(
  state: SerializedEditorState,
  maxNodes: number,
): SerializedEditorState {
  const root = state.root
  if (!root?.children || root.children.length <= maxNodes) return state
  return {
    ...state,
    root: { ...root, children: root.children.slice(0, maxNodes) },
  } as SerializedEditorState
}

interface NestedDocEditDecoratorProps {
  nodeKey: string
  contentEditor: LexicalEditor
  contentState: SerializedEditorState
}

function NestedDocEditorDialog({
  contentEditor,
}: {
  contentEditor: LexicalEditor
}) {
  return (
    <div className="rich-nested-doc-editor-dialog">
      <LexicalNestedComposer initialEditor={contentEditor}>
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              className="rich-nested-doc-editor-editable"
              style={{ outline: 'none', minHeight: '300px' }}
              aria-placeholder=""
              placeholder={<span style={{ display: 'none' }} />}
            />
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <ListPlugin />
        <LinkPlugin />
      </LexicalNestedComposer>
    </div>
  )
}

export function NestedDocEditDecorator({
  nodeKey,
  contentEditor,
  contentState,
}: NestedDocEditDecoratorProps) {
  const [editor] = useLexicalComposerContext()
  const renderContent = useNestedContentRenderer()
  const [expanded, setExpanded] = useState(false)

  const needsTruncation =
    (contentState.root?.children?.length ?? 0) > MAX_PREVIEW_NODES
  const previewState = useMemo(
    () =>
      needsTruncation
        ? truncateState(contentState, MAX_PREVIEW_NODES)
        : contentState,
    [contentState, needsTruncation],
  )

  const handleToggle = useCallback(() => {
    setExpanded((prev) => !prev)
  }, [])

  const handleEdit = useCallback(() => {
    presentDialog({
      title: 'Edit Nested Document',
      content: <NestedDocEditorDialog contentEditor={contentEditor} />,
      onClose: () => {
        // Sync editor state back to node
        const newState = contentEditor.getEditorState().toJSON()
        editor.update(() => {
          const node = $getNodeByKey(nodeKey)
          if ($isNestedDocNode(node)) {
            node.setContentState(newState)
          }
        })
      },
    })
  }, [contentEditor, editor, nodeKey])

  const displayState = expanded ? contentState : previewState

  return (
    <>
      <div
        className="rich-nested-doc-content"
        data-expanded={expanded}
        onClick={handleEdit}
        role="button"
        tabIndex={0}
      >
        {renderContent(displayState)}
      </div>
      {(needsTruncation || expanded) && (
        <div className="rich-nested-doc-mask" data-expanded={expanded}>
          <button
            type="button"
            className="rich-nested-doc-toggle"
            onClick={(e) => {
              e.stopPropagation()
              handleToggle()
            }}
          >
            {expanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
      )}
    </>
  )
}
```

**Note:** The `presentDialog` API may need adaptation based on the actual `@haklex/rich-editor-ui` Dialog API. Check `haklex/rich-editor-ui/src/` for the exact signature. The `onClose` callback syncs the nested editor state back to the parent node.

**Step 2: Commit**

```bash
git add haklex/rich-editor/src/components/decorators/NestedDocEditDecorator.tsx
git commit -m "feat(rich-editor): add NestedDocEditDecorator with modal editing"
```

---

### Task 6: Plugin (`NestedDocPlugin`)

**Files:**
- Create: `haklex/rich-editor/src/plugins/NestedDocPlugin.tsx`

**Step 1: Create the plugin**

```typescript
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $insertNodes,
  COMMAND_PRIORITY_EDITOR,
  type SerializedEditorState,
  createCommand,
} from 'lexical'
import { useEffect } from 'react'

import { $createNestedDocEditNode } from '../nodes/NestedDocEditNode'

export const INSERT_NESTED_DOC_COMMAND =
  createCommand<SerializedEditorState | void>('INSERT_NESTED_DOC')

export function NestedDocPlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    return editor.registerCommand(
      INSERT_NESTED_DOC_COMMAND,
      (contentState) => {
        $insertNodes([
          $createNestedDocEditNode(contentState || undefined),
        ])
        return true
      },
      COMMAND_PRIORITY_EDITOR,
    )
  }, [editor])

  return null
}
```

**Step 2: Commit**

```bash
git add haklex/rich-editor/src/plugins/NestedDocPlugin.tsx
git commit -m "feat(rich-editor): add NestedDocPlugin with INSERT_NESTED_DOC_COMMAND"
```

---

### Task 7: Markdown Transformer (export-only)

**Files:**
- Create: `haklex/rich-editor/src/transformers/nested-doc.ts`

**Step 1: Create the export-only transformer**

Uses `extractTextContent` for content, wrapped in `<nested-doc>` tags. Uses `regExp: /a^/` (never matches) to disable import.

```typescript
import type { ElementTransformer } from '@lexical/markdown'
import type { LexicalNode } from 'lexical'

import { $isNestedDocNode } from '../nodes/NestedDocNode'
import { extractTextContent } from '../utils/extractTextContent'

export const NESTED_DOC_BLOCK_TRANSFORMER: ElementTransformer = {
  dependencies: [],
  export: (node: LexicalNode) => {
    if (!$isNestedDocNode(node)) return null
    const text = extractTextContent(node.getContentState())
    return `<nested-doc>\n${text}\n</nested-doc>`
  },
  regExp: /a^/,
  replace: () => {},
  type: 'element',
}
```

**Step 2: Commit**

```bash
git add haklex/rich-editor/src/transformers/nested-doc.ts
git commit -m "feat(rich-editor): add NestedDocNode export-only markdown transformer"
```

---

### Task 8: Registration (config, barrel exports, RichEditor, transformers)

**Files:**
- Modify: `haklex/rich-editor/src/nodes/index.ts`
- Modify: `haklex/rich-editor/src/config.ts`
- Modify: `haklex/rich-editor/src/config-edit.ts`
- Modify: `haklex/rich-editor/src/components/RichEditor.tsx`
- Modify: `haklex/rich-editor/src/transformers/index.ts`
- Modify: `haklex/rich-editor/src/styles/index.ts` (if exists, else import in main styles barrel)

**Step 1: Add barrel exports in `nodes/index.ts`**

Add at end:
```typescript
export type { SerializedNestedDocNode } from './NestedDocNode'
export {
  $createNestedDocNode,
  $isNestedDocNode,
  NestedDocNode,
} from './NestedDocNode'
```

**Step 2: Add to `config.ts`**

Add import:
```typescript
import { NestedDocNode } from './nodes/NestedDocNode'
```

Add `NestedDocNode` to `customNodes` array.

**Step 3: Add to `config-edit.ts`**

Add import:
```typescript
import { NestedDocEditNode } from './nodes/NestedDocEditNode'
```

Add `NestedDocEditNode` to `customEditNodes` array.

**Step 4: Add `NestedDocPlugin` to `RichEditor.tsx`**

Add import:
```typescript
import { NestedDocPlugin } from '../plugins/NestedDocPlugin'
```

Add `<NestedDocPlugin />` alongside the other plugins (after `<MermaidPlugin />`).

**Step 5: Add transformer to `transformers/index.ts`**

Add import:
```typescript
import { NESTED_DOC_BLOCK_TRANSFORMER } from './nested-doc'
```

Add `NESTED_DOC_BLOCK_TRANSFORMER` to `ALL_TRANSFORMERS` array (in block section).

Add re-export:
```typescript
export { NESTED_DOC_BLOCK_TRANSFORMER } from './nested-doc'
```

**Step 6: Import styles**

Check if `haklex/rich-editor/src/styles/index.ts` exists. If so, add:
```typescript
import './nested-doc.css'
```

**Step 7: Commit**

```bash
git add haklex/rich-editor/src/nodes/index.ts haklex/rich-editor/src/config.ts haklex/rich-editor/src/config-edit.ts haklex/rich-editor/src/components/RichEditor.tsx haklex/rich-editor/src/transformers/index.ts
git commit -m "feat(rich-editor): register NestedDocNode in configs, plugins, and transformers"
```

---

### Task 9: Headless Node & Transformer

**Files:**
- Modify: `haklex/rich-headless/src/index.ts`
- Modify: `haklex/rich-headless/src/transformers.ts`

**Step 1: Add headless NestedDocNode in `index.ts`**

Add after the `AlertQuoteNode` class (in the "Nested content nodes" section):

```typescript
export class NestedDocNode extends DecoratorNode<null> {
  __contentState: unknown = null

  static getType(): string {
    return 'nested-doc'
  }
  constructor(key?: NodeKey) {
    super(key)
  }
  static clone(node: NestedDocNode): NestedDocNode {
    const n = new NestedDocNode((node as any).__key)
    n.__contentState = node.__contentState
    return n
  }
  static importJSON(
    json: SerializedLexicalNode & { content?: unknown },
  ): NestedDocNode {
    const node = new NestedDocNode()
    node.__contentState = json.content ?? null
    return node
  }
  exportJSON(): SerializedLexicalNode {
    return {
      type: 'nested-doc',
      version: 1,
      content: this.__contentState,
    } as SerializedLexicalNode
  }
  createDOM(): HTMLElement {
    return stubDOM()
  }
  updateDOM(): boolean {
    return false
  }
  decorate(): null {
    return null
  }
  getTextContent(): string {
    return extractText(this.__contentState)
  }
}
```

Add `NestedDocNode` to `customHeadlessNodes` array.

**Step 2: Add headless transformer in `transformers.ts`**

Add after the `CONTAINER_TRANSFORMER`:

```typescript
export const NESTED_DOC_BLOCK_TRANSFORMER: ElementTransformer = {
  dependencies: [],
  export: (node) => {
    if (node.getType() !== 'nested-doc') return null
    return `<nested-doc>\n${stateText((node as any).__contentState)}\n</nested-doc>`
  },
  regExp: NEVER,
  replace: NOOP,
  type: 'element',
}
```

Add `NESTED_DOC_BLOCK_TRANSFORMER` to `allHeadlessTransformers` array.

**Step 3: Commit**

```bash
git add haklex/rich-headless/src/index.ts haklex/rich-headless/src/transformers.ts
git commit -m "feat(rich-headless): add headless NestedDocNode and transformer"
```

---

### Task 10: Build & Verify

**Step 1: Build rich-editor**

```bash
pnpm --filter @haklex/rich-editor build
```

Expected: Build succeeds with no errors.

**Step 2: Build rich-headless**

```bash
pnpm --filter @haklex/rich-headless build
```

Expected: Build succeeds.

**Step 3: Build rich-editor-demo (if available)**

```bash
pnpm --filter @haklex/rich-editor-demo dev
```

Verify in browser: slash menu shows "Nested Document" option, inserting it creates a collapsed block.

**Step 4: Lint changed files**

```bash
cd haklex/rich-editor && pnpm lint
```

**Step 5: Commit any fixes**

```bash
git add -u
git commit -m "fix(rich-editor): build and lint fixes for NestedDocNode"
```

---

### Task 11: Iterate on Edit Decorator (after verifying `presentDialog` API)

**Files:**
- Modify: `haklex/rich-editor/src/components/decorators/NestedDocEditDecorator.tsx`

**Step 1: Check `@haklex/rich-editor-ui` Dialog API**

```bash
# Find the presentDialog API
grep -r "presentDialog" haklex/rich-editor-ui/src/ --include="*.ts" --include="*.tsx" -l
```

Adapt the `NestedDocEditDecorator` to match the actual API signature. The key contract:
- Open a dialog/modal on click
- Render `LexicalNestedComposer` inside with full plugins
- On close, sync `contentEditor.getEditorState().toJSON()` back to the node

**Step 2: Commit**

```bash
git add haklex/rich-editor/src/components/decorators/NestedDocEditDecorator.tsx
git commit -m "fix(rich-editor): adapt NestedDocEditDecorator to actual Dialog API"
```
