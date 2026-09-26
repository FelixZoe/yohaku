# Top Toolbar + Unified Command Registry Design

## Context

The @haklex rich editor needs a Google Docs-style top toolbar that coexists with the existing FloatingToolbar. The toolbar provides block-level operations, node insertion, and formatting controls in a fixed two-row layout.

The current `slashMenuItems` discovery mechanism (static class properties on nodes) will be refactored into a shared global command registry consumed by SlashMenu, Toolbar, and BlockHandle.

## Type System

```typescript
// @haklex/rich-editor/src/types/command-item.ts

type CommandPlacement = 'slash' | 'toolbar' | 'blockHandle'

type ToolbarGroup =
  | 'history'    // undo/redo
  | 'heading'    // H1-H3 dropdown
  | 'format'     // B/I/U/S/Code
  | 'color'      // highlight, font color
  | 'list'       // UL/OL/Todo
  | 'align'      // alignment
  | 'insert'     // links, images, tables, quotes, HR + extension nodes

interface CommandItemConfig {
  // Core (from SlashMenuItemConfig)
  title: string
  icon?: ReactNode
  description?: string
  keywords?: string[]
  section?: string
  onSelect: (editor: LexicalEditor, queryString: string) => void

  // Placement control
  placement?: CommandPlacement[]  // defaults to ['slash']

  // Toolbar-specific
  group?: ToolbarGroup
  shortcut?: string
  isActive?: (editor: LexicalEditor) => boolean
  isDisabled?: (editor: LexicalEditor) => boolean
}

// Backward compat
type SlashMenuItemConfig = CommandItemConfig
```

## Registry Collection

```typescript
// collectCommandItems(editor) replaces collectNodeSlashItems(editor)
// 1. Scans editor._nodes for static commandItems AND static slashMenuItems (compat)
// 2. Returns CommandItem[]

// Each consumer filters by placement:
// SlashMenu   → placement.includes('slash')
// Toolbar     → placement.includes('toolbar') + builtins
// BlockHandle → placement.includes('blockHandle') + builtins
```

## Toolbar UI Architecture

### Package: `@haklex/rich-plugin-toolbar`

Two-row fixed toolbar above the editor:

```
Row 1: [Undo][Redo] | [Heading ▾] | [B][I][U][S][Code] | [Highlight][Color] | [UL][OL][Todo] | [Left][Center][Right][Justify]
Row 2: [Link][Image][Table][Quote][HR] | [...dynamic insert items from registry]
```

### Component structure:
- `ToolbarPlugin` - main component, renders inside LexicalComposer
- `ToolbarRow` - layout container for a row
- `ToolbarButton` - individual button with active/disabled state + tooltip
- `ToolbarDropdown` - dropdown button (heading selector, etc.)
- `ToolbarSeparator` - visual divider between groups

### Behavior:
- Row 1 built-in items are hardcoded (heading/format/list/align/undo-redo)
- Row 2 insert group: built-in insert items + dynamic items from `collectCommandItems` filtered by `placement: 'toolbar'` and `group: 'insert'`
- Buttons reflect current state via `isActive` checks on editor update
- Coexists with FloatingToolbar (FloatingToolbar for inline format on selection, Toolbar for persistent access)

## Migration Strategy

1. `CommandItemConfig` type created, `SlashMenuItemConfig` becomes alias
2. `collectCommandItems()` reads both `static commandItems` and `static slashMenuItems`
3. `SlashMenuPlugin` internally switches to `collectCommandItems`
4. Nodes gradually migrate to `static commandItems` with `placement`/`group` fields
5. Extension nodes (Excalidraw, Gallery, CodeSnippet, Embed, LinkCard) add `placement: ['slash', 'toolbar']`

## Package Dependencies

```
@haklex/rich-plugin-toolbar
├── @haklex/rich-editor (CommandItemConfig type, collectCommandItems, Lexical commands)
├── @haklex/rich-editor-ui (DropdownMenu, Tooltip)
├── @haklex/rich-style-token (theme tokens)
└── lucide-react (toolbar icons)
```

## Integration in rich-kit-shiro

```typescript
<RichEditor ...>
  <ToolbarPlugin />          // NEW
  <SlashMenuPlugin />
  <FloatingToolbarPlugin />
  <BlockHandlePlugin />
  // ... other plugins
</RichEditor>
```
