# Top Toolbar + Unified Command Registry Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a Google Docs-style top toolbar plugin and refactor the slash menu item discovery into a shared global command registry.

**Architecture:** New `CommandItemConfig` type in `@haklex/rich-editor` core extends existing `SlashMenuItemConfig` with `placement`, `group`, `isActive`, `shortcut` fields. A shared `collectCommandItems(editor)` function replaces `collectNodeSlashItems`. New `@haklex/rich-plugin-toolbar` package provides a two-row fixed toolbar consuming from the registry. SlashMenu migrated to use the same registry.

**Tech Stack:** Lexical, React, Vanilla Extract CSS-in-TS, @base-ui/react (via @haklex/rich-editor-ui), lucide-react icons

---

## Task 1: Create CommandItemConfig Type

**Files:**
- Modify: `haklex/rich-editor/src/types/slash-menu.ts`
- Modify: `haklex/rich-editor/src/index.ts`

**Step 1: Extend the type definition**

Replace contents of `haklex/rich-editor/src/types/slash-menu.ts`:

```typescript
import type { LexicalEditor } from 'lexical'
import type { ReactNode } from 'react'

export type CommandPlacement = 'slash' | 'toolbar' | 'blockHandle'

export type ToolbarGroup =
  | 'history'
  | 'heading'
  | 'format'
  | 'color'
  | 'list'
  | 'align'
  | 'insert'

export interface CommandItemConfig {
  title: string
  icon?: ReactNode
  description?: string
  keywords?: string[]
  section?: string
  onSelect: (editor: LexicalEditor, queryString: string) => void

  placement?: CommandPlacement[]
  group?: ToolbarGroup
  shortcut?: string
  isActive?: (editor: LexicalEditor) => boolean
  isDisabled?: (editor: LexicalEditor) => boolean
}

/** @deprecated Use CommandItemConfig */
export type SlashMenuItemConfig = CommandItemConfig
```

**Step 2: Update exports in `haklex/rich-editor/src/index.ts`**

Find the existing export line:
```typescript
export type { SlashMenuItemConfig } from './types/slash-menu'
```
Replace with:
```typescript
export type {
  CommandItemConfig,
  CommandPlacement,
  SlashMenuItemConfig,
  ToolbarGroup,
} from './types/slash-menu'
```

**Step 3: Verify**

Run: `pnpm --filter @haklex/rich-editor build`
Expected: Success, no type errors.

**Step 4: Commit**

```bash
git add haklex/rich-editor/src/types/slash-menu.ts haklex/rich-editor/src/index.ts
git commit -m "feat: add CommandItemConfig type extending SlashMenuItemConfig"
```

---

## Task 2: Create collectCommandItems Utility

**Files:**
- Create: `haklex/rich-editor/src/utils/collect-command-items.ts`
- Modify: `haklex/rich-editor/src/index.ts`

**Step 1: Create the shared collection function**

Create `haklex/rich-editor/src/utils/collect-command-items.ts`:

```typescript
import type { LexicalEditor } from 'lexical'

import type { CommandItemConfig } from '../types/slash-menu'

export function collectCommandItems(editor: LexicalEditor): CommandItemConfig[] {
  const items: CommandItemConfig[] = []
  const nodes: Map<string, { klass: any }> = (editor as any)._nodes
  for (const { klass } of nodes.values()) {
    const configs: CommandItemConfig[] | undefined =
      klass.commandItems ?? klass.slashMenuItems
    if (configs) {
      for (const config of configs) {
        items.push(config)
      }
    }
  }
  return items
}
```

Key: reads `commandItems` first, falls back to `slashMenuItems` for backward compat.

**Step 2: Export from rich-editor**

Add to `haklex/rich-editor/src/index.ts`:
```typescript
export { collectCommandItems } from './utils/collect-command-items'
```

**Step 3: Verify**

Run: `pnpm --filter @haklex/rich-editor build`
Expected: Success.

**Step 4: Commit**

```bash
git add haklex/rich-editor/src/utils/collect-command-items.ts haklex/rich-editor/src/index.ts
git commit -m "feat: add collectCommandItems shared utility"
```

---

## Task 3: Migrate SlashMenuPlugin to collectCommandItems

**Files:**
- Modify: `haklex/rich-plugin-slash-menu/src/SlashMenuPlugin.tsx`
- Modify: `haklex/rich-plugin-slash-menu/src/index.ts`

**Step 1: Update SlashMenuPlugin.tsx**

In `haklex/rich-plugin-slash-menu/src/SlashMenuPlugin.tsx`:

1. Replace the import and collection logic. Change `collectNodeSlashItems` to use `collectCommandItems` from `@haklex/rich-editor`:

```typescript
import { collectCommandItems } from '@haklex/rich-editor'
```

2. Replace the existing `collectNodeSlashItems` function (lines 33-45) with a wrapper that filters by placement:

```typescript
export function collectNodeSlashItems(editor: LexicalEditor): SlashMenuItem[] {
  const configs = collectCommandItems(editor)
  return configs
    .filter((c) => !c.placement || c.placement.includes('slash'))
    .map((c) => new SlashMenuItemClass(c.title, c))
}
```

This preserves the existing API while delegating to the shared registry. Items without `placement` default to appearing in slash menu (backward compat).

**Step 2: Verify**

Run: `pnpm --filter @haklex/rich-plugin-slash-menu build`
Expected: Success.

**Step 3: Commit**

```bash
git add haklex/rich-plugin-slash-menu/src/SlashMenuPlugin.tsx
git commit -m "refactor: migrate SlashMenuPlugin to use collectCommandItems"
```

---

## Task 4: Scaffold @haklex/rich-plugin-toolbar Package

**Files:**
- Create: `haklex/rich-plugin-toolbar/package.json`
- Create: `haklex/rich-plugin-toolbar/tsconfig.json`
- Create: `haklex/rich-plugin-toolbar/vite.config.ts`
- Create: `haklex/rich-plugin-toolbar/src/index.ts`

**Step 1: Create package.json**

Create `haklex/rich-plugin-toolbar/package.json`:

```json
{
  "name": "@haklex/rich-plugin-toolbar",
  "version": "0.0.1",
  "description": "Top toolbar plugin for rich editor",
  "license": "MIT",
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./style.css": "./dist/rich-plugin-toolbar.css"
  },
  "main": "./src/index.ts",
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "vite build",
    "dev:build": "vite build --watch"
  },
  "dependencies": {
    "@haklex/rich-editor": "workspace:*",
    "@haklex/rich-editor-ui": "workspace:*",
    "@haklex/rich-style-token": "workspace:*"
  },
  "devDependencies": {
    "@lexical/list": "^0.41.0",
    "@lexical/react": "^0.41.0",
    "@lexical/rich-text": "^0.41.0",
    "@lexical/selection": "^0.41.0",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vanilla-extract/css": "^1.18.0",
    "@vanilla-extract/vite-plugin": "^5.1.4",
    "lexical": "^0.41.0",
    "lucide-react": "^0.575.0",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "typescript": "^5.9.3",
    "vite": "^7.3.1",
    "vite-plugin-dts": "^4.5.4"
  },
  "peerDependencies": {
    "@lexical/list": "^0.41.0",
    "@lexical/react": "^0.41.0",
    "@lexical/rich-text": "^0.41.0",
    "@lexical/selection": "^0.41.0",
    "lexical": "^0.41.0",
    "lucide-react": "^0.574.0",
    "react": ">=19",
    "react-dom": ">=19"
  },
  "publishConfig": {
    "access": "public",
    "exports": {
      ".": {
        "import": "./dist/index.mjs",
        "types": "./dist/index.d.ts"
      },
      "./style.css": "./dist/rich-plugin-toolbar.css"
    },
    "main": "./dist/index.mjs",
    "types": "./dist/index.d.ts"
  }
}
```

**Step 2: Create tsconfig.json**

Create `haklex/rich-plugin-toolbar/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "baseUrl": "./src"
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 3: Create vite.config.ts**

Create `haklex/rich-plugin-toolbar/vite.config.ts`:

```typescript
import { createViteConfig } from '../vite.shared'

export default createViteConfig()
```

**Step 4: Create placeholder index**

Create `haklex/rich-plugin-toolbar/src/index.ts`:

```typescript
export { ToolbarPlugin } from './ToolbarPlugin'
export type { ToolbarPluginProps } from './ToolbarPlugin'
```

(Will fail until Task 6, placeholder only.)

**Step 5: Install dependencies**

Run: `pnpm install`
Expected: workspace links resolved.

**Step 6: Commit**

```bash
git add haklex/rich-plugin-toolbar/
git commit -m "feat: scaffold @haklex/rich-plugin-toolbar package"
```

---

## Task 5: Toolbar Styles (Vanilla Extract)

**Files:**
- Create: `haklex/rich-plugin-toolbar/src/styles.css.ts`

**Step 1: Create toolbar styles**

Create `haklex/rich-plugin-toolbar/src/styles.css.ts`:

```typescript
import { style, globalStyle, keyframes } from '@vanilla-extract/css'
import { vars } from '@haklex/rich-style-token'

export const toolbarContainer = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
  padding: '4px 8px',
  borderBottom: `1px solid ${vars.color.border}`,
  backgroundColor: vars.color.bg,
  userSelect: 'none',
})

export const toolbarRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: '2px',
  flexWrap: 'wrap',
  minHeight: '32px',
})

export const toolbarButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '28px',
  height: '28px',
  borderRadius: vars.borderRadius.sm,
  border: 'none',
  background: 'transparent',
  color: vars.color.textSecondary,
  cursor: 'pointer',
  flexShrink: 0,
  transition: 'background-color 120ms, color 120ms',
  selectors: {
    '&:hover': {
      backgroundColor: vars.color.fillQuaternary,
      color: vars.color.text,
    },
    '&[data-active="true"]': {
      backgroundColor: vars.color.fillTertiary,
      color: vars.color.accent,
    },
    '&:disabled': {
      opacity: 0.35,
      cursor: 'default',
      pointerEvents: 'none',
    },
  },
})

export const toolbarDropdownTrigger = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '2px',
  height: '28px',
  paddingLeft: '8px',
  paddingRight: '4px',
  borderRadius: vars.borderRadius.sm,
  border: 'none',
  background: 'transparent',
  color: vars.color.textSecondary,
  cursor: 'pointer',
  fontSize: vars.typography.fontSizeSm,
  fontFamily: vars.typography.fontFamilySans,
  whiteSpace: 'nowrap',
  transition: 'background-color 120ms, color 120ms',
  selectors: {
    '&:hover': {
      backgroundColor: vars.color.fillQuaternary,
      color: vars.color.text,
    },
  },
})

export const toolbarSeparator = style({
  width: '1px',
  height: '20px',
  backgroundColor: vars.color.border,
  margin: '0 4px',
  flexShrink: 0,
})

export const tooltipShortcut = style({
  marginLeft: '8px',
  opacity: 0.6,
  fontSize: vars.typography.fontSizeXs,
})
```

**Step 2: Commit**

```bash
git add haklex/rich-plugin-toolbar/src/styles.css.ts
git commit -m "feat: add toolbar Vanilla Extract styles"
```

---

## Task 6: Toolbar Subcomponents

**Files:**
- Create: `haklex/rich-plugin-toolbar/src/ToolbarButton.tsx`
- Create: `haklex/rich-plugin-toolbar/src/ToolbarSeparator.tsx`
- Create: `haklex/rich-plugin-toolbar/src/ToolbarDropdown.tsx`

**Step 1: Create ToolbarButton**

Create `haklex/rich-plugin-toolbar/src/ToolbarButton.tsx`:

```tsx
import { TooltipContent, TooltipRoot, TooltipTrigger } from '@haklex/rich-editor-ui/tooltip'
import type { ReactNode } from 'react'

import * as styles from './styles.css'

interface ToolbarButtonProps {
  icon: ReactNode
  title: string
  shortcut?: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
}

export function ToolbarButton({
  icon,
  title,
  shortcut,
  active,
  disabled,
  onClick,
}: ToolbarButtonProps) {
  return (
    <TooltipRoot>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={styles.toolbarButton}
          data-active={active}
          disabled={disabled}
          onClick={onClick}
          aria-label={title}
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6}>
        {title}
        {shortcut && (
          <span className={styles.tooltipShortcut}>{shortcut}</span>
        )}
      </TooltipContent>
    </TooltipRoot>
  )
}
```

**Step 2: Create ToolbarSeparator**

Create `haklex/rich-plugin-toolbar/src/ToolbarSeparator.tsx`:

```tsx
import * as styles from './styles.css'

export function ToolbarSeparator() {
  return <div className={styles.toolbarSeparator} role="separator" />
}
```

**Step 3: Create ToolbarDropdown**

Create `haklex/rich-plugin-toolbar/src/ToolbarDropdown.tsx`:

```tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@haklex/rich-editor-ui/dropdown-menu'
import { TooltipContent, TooltipRoot, TooltipTrigger } from '@haklex/rich-editor-ui/tooltip'
import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'

import * as styles from './styles.css'

interface DropdownItem {
  label: string
  icon?: ReactNode
  active?: boolean
  onSelect: () => void
}

interface ToolbarDropdownProps {
  label: string
  title: string
  items: DropdownItem[]
}

export function ToolbarDropdown({ label, title, items }: ToolbarDropdownProps) {
  return (
    <DropdownMenu>
      <TooltipRoot>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger className={styles.toolbarDropdownTrigger}>
            {label}
            <ChevronDown size={14} />
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6}>
          {title}
        </TooltipContent>
      </TooltipRoot>
      <DropdownMenuContent align="start" sideOffset={4}>
        {items.map((item) => (
          <DropdownMenuItem
            key={item.label}
            onSelect={item.onSelect}
            data-active={item.active}
          >
            {item.icon && <span>{item.icon}</span>}
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

**Step 4: Commit**

```bash
git add haklex/rich-plugin-toolbar/src/ToolbarButton.tsx haklex/rich-plugin-toolbar/src/ToolbarSeparator.tsx haklex/rich-plugin-toolbar/src/ToolbarDropdown.tsx
git commit -m "feat: add toolbar subcomponents (Button, Separator, Dropdown)"
```

---

## Task 7: ToolbarPlugin — Row 1 (Format Controls)

**Files:**
- Create: `haklex/rich-plugin-toolbar/src/ToolbarPlugin.tsx`
- Modify: `haklex/rich-plugin-toolbar/src/index.ts`

This is the core task. Row 1 includes: Undo/Redo, Heading dropdown, B/I/U/S/Code, Highlight/Color, Lists, Alignment.

**Step 1: Create ToolbarPlugin.tsx**

Create `haklex/rich-plugin-toolbar/src/ToolbarPlugin.tsx`:

```tsx
import { collectCommandItems } from '@haklex/rich-editor'
import type { CommandItemConfig } from '@haklex/rich-editor'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $isHeadingNode, $createHeadingNode } from '@lexical/rich-text'
import { $setBlocksType } from '@lexical/selection'
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  INSERT_CHECK_LIST_COMMAND,
  $isListNode,
  ListNode,
} from '@lexical/list'
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  $isRootOrShadowRoot,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
} from 'lexical'
import { $findMatchingParent } from '@lexical/utils'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  List,
  ListChecks,
  ListOrdered,
  Redo,
  Strikethrough,
  Type,
  Underline,
  Undo,
} from 'lucide-react'
import { createElement, useCallback, useEffect, useMemo, useState } from 'react'

import * as styles from './styles.css'
import { ToolbarButton } from './ToolbarButton'
import { ToolbarDropdown } from './ToolbarDropdown'
import { ToolbarSeparator } from './ToolbarSeparator'

const ICON_SIZE = 16

export interface ToolbarPluginProps {
  /** Extra command items to append to the insert row */
  extraItems?: CommandItemConfig[]
}

type BlockType = 'paragraph' | 'h1' | 'h2' | 'h3'

interface ToolbarState {
  canUndo: boolean
  canRedo: boolean
  blockType: BlockType
  isBold: boolean
  isItalic: boolean
  isUnderline: boolean
  isStrikethrough: boolean
  isCode: boolean
  isHighlight: boolean
  isBulletList: boolean
  isNumberedList: boolean
  isCheckList: boolean
}

const INITIAL_STATE: ToolbarState = {
  canUndo: false,
  canRedo: false,
  blockType: 'paragraph',
  isBold: false,
  isItalic: false,
  isUnderline: false,
  isStrikethrough: false,
  isCode: false,
  isHighlight: false,
  isBulletList: false,
  isNumberedList: false,
  isCheckList: false,
}

const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  paragraph: 'Text',
  h1: 'Heading 1',
  h2: 'Heading 2',
  h3: 'Heading 3',
}

export function ToolbarPlugin({ extraItems }: ToolbarPluginProps) {
  const [editor] = useLexicalComposerContext()
  const [state, setState] = useState<ToolbarState>(INITIAL_STATE)

  // --- State tracking ---
  useEffect(() => {
    return editor.registerCommand(
      CAN_UNDO_COMMAND,
      (payload) => {
        setState((s) => ({ ...s, canUndo: payload }))
        return false
      },
      1,
    )
  }, [editor])

  useEffect(() => {
    return editor.registerCommand(
      CAN_REDO_COMMAND,
      (payload) => {
        setState((s) => ({ ...s, canRedo: payload }))
        return false
      },
      1,
    )
  }, [editor])

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection()
        if (!$isRangeSelection(selection)) return

        const isBold = selection.hasFormat('bold')
        const isItalic = selection.hasFormat('italic')
        const isUnderline = selection.hasFormat('underline')
        const isStrikethrough = selection.hasFormat('strikethrough')
        const isCode = selection.hasFormat('code')
        const isHighlight = selection.hasFormat('highlight')

        const anchorNode = selection.anchor.getNode()
        let element =
          anchorNode.getKey() === 'root'
            ? anchorNode
            : $findMatchingParent(anchorNode, (e) => {
                const parent = e.getParent()
                return parent !== null && $isRootOrShadowRoot(parent)
              })
        if (element === null) element = anchorNode.getTopLevelElementOrThrow()

        let blockType: BlockType = 'paragraph'
        if ($isHeadingNode(element)) {
          const tag = element.getTag()
          if (tag === 'h1' || tag === 'h2' || tag === 'h3') blockType = tag
        }

        let isBulletList = false
        let isNumberedList = false
        let isCheckList = false
        if ($isListNode(element)) {
          const listType = element.getListType()
          isBulletList = listType === 'bullet'
          isNumberedList = listType === 'number'
          isCheckList = listType === 'check'
        } else {
          const parent = element.getParent()
          if ($isListNode(parent)) {
            const listType = (parent as ListNode).getListType()
            isBulletList = listType === 'bullet'
            isNumberedList = listType === 'number'
            isCheckList = listType === 'check'
          }
        }

        setState({
          canUndo: state.canUndo,
          canRedo: state.canRedo,
          blockType,
          isBold,
          isItalic,
          isUnderline,
          isStrikethrough,
          isCode,
          isHighlight,
          isBulletList,
          isNumberedList,
          isCheckList,
        })
      })
    })
  }, [editor])

  // --- Callbacks ---
  const formatText = useCallback(
    (format: 'bold' | 'italic' | 'underline' | 'strikethrough' | 'code' | 'highlight') => {
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, format)
    },
    [editor],
  )

  const setBlockType = useCallback(
    (type: BlockType) => {
      editor.update(() => {
        const selection = $getSelection()
        if (!$isRangeSelection(selection)) return
        if (type === 'paragraph') {
          $setBlocksType(selection, () => $createParagraphNode())
        } else {
          $setBlocksType(selection, () => $createHeadingNode(type))
        }
      })
    },
    [editor],
  )

  // --- Collect dynamic insert items ---
  const insertItems = useMemo(() => {
    const fromRegistry = collectCommandItems(editor).filter(
      (c) => c.placement?.includes('toolbar') && c.group === 'insert',
    )
    return extraItems ? [...fromRegistry, ...extraItems] : fromRegistry
  }, [editor, extraItems])

  // --- Render ---
  return (
    <div className={styles.toolbarContainer}>
      {/* Row 1: formatting */}
      <div className={styles.toolbarRow}>
        {/* History */}
        <ToolbarButton
          icon={createElement(Undo, { size: ICON_SIZE })}
          title="Undo"
          shortcut="⌘Z"
          disabled={!state.canUndo}
          onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
        />
        <ToolbarButton
          icon={createElement(Redo, { size: ICON_SIZE })}
          title="Redo"
          shortcut="⌘⇧Z"
          disabled={!state.canRedo}
          onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
        />

        <ToolbarSeparator />

        {/* Heading */}
        <ToolbarDropdown
          label={BLOCK_TYPE_LABELS[state.blockType]}
          title="Block type"
          items={[
            {
              label: 'Text',
              icon: createElement(Type, { size: ICON_SIZE }),
              active: state.blockType === 'paragraph',
              onSelect: () => setBlockType('paragraph'),
            },
            {
              label: 'Heading 1',
              icon: createElement(Heading1, { size: ICON_SIZE }),
              active: state.blockType === 'h1',
              onSelect: () => setBlockType('h1'),
            },
            {
              label: 'Heading 2',
              icon: createElement(Heading2, { size: ICON_SIZE }),
              active: state.blockType === 'h2',
              onSelect: () => setBlockType('h2'),
            },
            {
              label: 'Heading 3',
              icon: createElement(Heading3, { size: ICON_SIZE }),
              active: state.blockType === 'h3',
              onSelect: () => setBlockType('h3'),
            },
          ]}
        />

        <ToolbarSeparator />

        {/* Inline format */}
        <ToolbarButton
          icon={createElement(Bold, { size: ICON_SIZE })}
          title="Bold"
          shortcut="⌘B"
          active={state.isBold}
          onClick={() => formatText('bold')}
        />
        <ToolbarButton
          icon={createElement(Italic, { size: ICON_SIZE })}
          title="Italic"
          shortcut="⌘I"
          active={state.isItalic}
          onClick={() => formatText('italic')}
        />
        <ToolbarButton
          icon={createElement(Underline, { size: ICON_SIZE })}
          title="Underline"
          shortcut="⌘U"
          active={state.isUnderline}
          onClick={() => formatText('underline')}
        />
        <ToolbarButton
          icon={createElement(Strikethrough, { size: ICON_SIZE })}
          title="Strikethrough"
          active={state.isStrikethrough}
          onClick={() => formatText('strikethrough')}
        />
        <ToolbarButton
          icon={createElement(Code, { size: ICON_SIZE })}
          title="Inline Code"
          shortcut="⌘E"
          active={state.isCode}
          onClick={() => formatText('code')}
        />

        <ToolbarSeparator />

        {/* Highlight */}
        <ToolbarButton
          icon={createElement(Highlighter, { size: ICON_SIZE })}
          title="Highlight"
          active={state.isHighlight}
          onClick={() => formatText('highlight')}
        />

        <ToolbarSeparator />

        {/* Lists */}
        <ToolbarButton
          icon={createElement(List, { size: ICON_SIZE })}
          title="Bullet List"
          active={state.isBulletList}
          onClick={() =>
            editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)
          }
        />
        <ToolbarButton
          icon={createElement(ListOrdered, { size: ICON_SIZE })}
          title="Numbered List"
          active={state.isNumberedList}
          onClick={() =>
            editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)
          }
        />
        <ToolbarButton
          icon={createElement(ListChecks, { size: ICON_SIZE })}
          title="Checklist"
          active={state.isCheckList}
          onClick={() =>
            editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined)
          }
        />

        <ToolbarSeparator />

        {/* Alignment */}
        <ToolbarButton
          icon={createElement(AlignLeft, { size: ICON_SIZE })}
          title="Align left"
          onClick={() =>
            editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left')
          }
        />
        <ToolbarButton
          icon={createElement(AlignCenter, { size: ICON_SIZE })}
          title="Align center"
          onClick={() =>
            editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center')
          }
        />
        <ToolbarButton
          icon={createElement(AlignRight, { size: ICON_SIZE })}
          title="Align right"
          onClick={() =>
            editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right')
          }
        />
        <ToolbarButton
          icon={createElement(AlignJustify, { size: ICON_SIZE })}
          title="Justify"
          onClick={() =>
            editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'justify')
          }
        />
      </div>

      {/* Row 2: insert items from registry */}
      {insertItems.length > 0 && (
        <div className={styles.toolbarRow}>
          {insertItems.map((item) => (
            <ToolbarButton
              key={item.title}
              icon={item.icon}
              title={item.title}
              shortcut={item.shortcut}
              onClick={() => item.onSelect(editor, '')}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 2: Update index.ts**

Ensure `haklex/rich-plugin-toolbar/src/index.ts` has:

```typescript
export { ToolbarPlugin } from './ToolbarPlugin'
export type { ToolbarPluginProps } from './ToolbarPlugin'
```

**Step 3: Verify build**

Run: `pnpm --filter @haklex/rich-plugin-toolbar build`
Expected: Success.

**Step 4: Commit**

```bash
git add haklex/rich-plugin-toolbar/src/
git commit -m "feat: implement ToolbarPlugin with two-row layout"
```

---

## Task 8: Integrate into rich-kit-shiro

**Files:**
- Modify: `haklex/rich-kit-shiro/package.json` (add dependency)
- Modify: `haklex/rich-kit-shiro/src/editor.tsx` (or wherever ShiroEditor is assembled)
- Modify: `haklex/rich-kit-shiro/src/style.ts` (or CSS entry — add toolbar style import)

**Step 1: Add dependency**

In `haklex/rich-kit-shiro/package.json`, add to `dependencies`:
```json
"@haklex/rich-plugin-toolbar": "workspace:*"
```

Run: `pnpm install`

**Step 2: Import ToolbarPlugin into ShiroEditor**

Find the ShiroEditor component file (likely `haklex/rich-kit-shiro/src/editor.tsx` or a nearby file that renders `<RichEditor>` with all plugins). Add:

```typescript
import { ToolbarPlugin } from '@haklex/rich-plugin-toolbar'
```

Add `<ToolbarPlugin />` as the first child inside `<RichEditor>`, before `<SlashMenuPlugin />`.

**Step 3: Import toolbar CSS**

In the CSS entry file (check `haklex/rich-kit-shiro/src/style.ts` or similar), add:
```typescript
import '@haklex/rich-plugin-toolbar/style.css'
```

**Step 4: Verify**

Run: `pnpm --filter @haklex/rich-kit-shiro build`
Expected: Success.

**Step 5: Commit**

```bash
git add haklex/rich-kit-shiro/
git commit -m "feat: integrate ToolbarPlugin into ShiroEditor"
```

---

## Task 9: Migrate Key Nodes to commandItems with Toolbar Placement

**Files (each node adds `placement: ['slash', 'toolbar'], group: 'insert'`):**
- Modify: `haklex/rich-editor/src/nodes/ImageNode.ts`
- Modify: `haklex/rich-editor/src/nodes/VideoNode.ts`
- Modify: `haklex/rich-editor/src/nodes/LinkCardNode.ts`
- Modify: `haklex/rich-editor/src/nodes/MermaidNode.ts`
- Modify: `haklex/rich-editor/src/nodes/CodeBlockNode.ts` (or CodeBlockEditNode.ts)
- Modify: `haklex/rich-editor/src/nodes/AlertQuoteEditNode.ts`
- Modify: `haklex/rich-editor/src/nodes/BannerEditNode.ts`
- Modify: `haklex/rich-ext-code-snippet/src/nodes/CodeSnippetEditNode.ts`
- Modify: `haklex/rich-ext-excalidraw/src/ExcalidrawEditNode.ts`
- Modify: `haklex/rich-ext-embed/src/nodes/EmbedEditNode.ts`
- Modify: `haklex/rich-ext-gallery/src/GalleryEditNode.ts`

**Step 1: Rename and extend each node's static property**

For each node file, change `static slashMenuItems` to `static commandItems` and add placement/group. Example for ImageNode:

```typescript
// Before
static slashMenuItems: SlashMenuItemConfig[] = [
  {
    title: 'Image',
    icon: createElement(ImageIcon, { size: 20 }),
    description: 'Upload or embed an image',
    keywords: ['image', 'picture', 'photo'],
    section: 'MEDIA',
    onSelect: (editor) => { /* ... */ },
  },
]

// After
static commandItems: CommandItemConfig[] = [
  {
    title: 'Image',
    icon: createElement(ImageIcon, { size: 20 }),
    description: 'Upload or embed an image',
    keywords: ['image', 'picture', 'photo'],
    section: 'MEDIA',
    placement: ['slash', 'toolbar'],
    group: 'insert',
    onSelect: (editor) => { /* ... */ },
  },
]
```

Update the import from `SlashMenuItemConfig` to `CommandItemConfig` in each file.

**For CodeBlockEditNode** which references `CodeBlockNode.slashMenuItems`:

```typescript
// Before
static slashMenuItems = CodeBlockNode.slashMenuItems.map(...)

// After
static commandItems = CodeBlockNode.commandItems.map(...)
```

**Step 2: Verify**

Run: `pnpm --filter @haklex/rich-editor build && pnpm --filter @haklex/rich-ext-code-snippet build && pnpm --filter @haklex/rich-ext-excalidraw build && pnpm --filter @haklex/rich-ext-embed build && pnpm --filter @haklex/rich-ext-gallery build`
Expected: All succeed.

**Step 3: Commit**

```bash
git add haklex/rich-editor/src/nodes/ haklex/rich-ext-*/
git commit -m "refactor: migrate nodes from slashMenuItems to commandItems with toolbar placement"
```

---

## Task 10: Visual Verification in Demo

**Files:**
- Modify: `haklex/rich-editor-demo/src/pages/EditorPage.tsx` (or equivalent)

**Step 1: Add ToolbarPlugin to the demo editor**

Import and add `<ToolbarPlugin />` to the demo's editor page, same as the ShiroEditor integration.

**Step 2: Run dev server and verify**

Run: `pnpm --filter @haklex/rich-editor-demo dev`

Verify:
- [ ] Toolbar renders above editor with two rows
- [ ] Row 1: Undo/Redo, heading dropdown, B/I/U/S/Code, highlight, lists, alignment all functional
- [ ] Row 2: Shows insert items from registered nodes (Image, Video, LinkCard, Mermaid, etc.)
- [ ] Clicking insert items creates the correct node
- [ ] Active state reflects correctly (bold button highlights when cursor is in bold text)
- [ ] Heading dropdown label updates when cursor moves between heading levels
- [ ] FloatingToolbar still works independently on text selection
- [ ] SlashMenu still works with `/` trigger
- [ ] Theme colors and dark mode work correctly

**Step 3: Commit**

```bash
git add haklex/rich-editor-demo/
git commit -m "feat: add ToolbarPlugin to demo editor"
```

---

## Summary

| Task | Scope | Key Files |
|------|-------|-----------|
| 1 | CommandItemConfig type | `rich-editor/src/types/slash-menu.ts` |
| 2 | collectCommandItems utility | `rich-editor/src/utils/collect-command-items.ts` |
| 3 | SlashMenu migration | `rich-plugin-slash-menu/src/SlashMenuPlugin.tsx` |
| 4 | Package scaffold | `rich-plugin-toolbar/` (new) |
| 5 | Vanilla Extract styles | `rich-plugin-toolbar/src/styles.css.ts` |
| 6 | Subcomponents | `ToolbarButton`, `ToolbarSeparator`, `ToolbarDropdown` |
| 7 | ToolbarPlugin core | `rich-plugin-toolbar/src/ToolbarPlugin.tsx` |
| 8 | Integration (shiro) | `rich-kit-shiro/` |
| 9 | Node migration | 11 node files across 5 packages |
| 10 | Demo verification | `rich-editor-demo/` |
