# Footnote Redesign Design

## Problem

`FootnoteNode` only stores `identifier` with no actual footnote content. The inline `<sup>` reference has no definition data to display.

## Decisions

- **Storage**: Document-level footnote map (not per-node duplication)
- **Content format**: Rich text (inline markdown string)
- **Hover interaction**: Tooltip preview on hover, click scrolls to footer

## Architecture: FootnoteSectionNode Approach

### Data Model

**FootnoteNode** (inline, existing - minor changes):
```typescript
{ type: 'footnote', identifier: string, version: 1 }
```

**FootnoteSectionNode** (block, new - singleton at document end):
```typescript
{
  type: 'footnote-section',
  definitions: Record<string, string>,
  // e.g. { "1": "See [RFC 7231](https://...) section **6.5**", "2": "Original paper published in 2019" }
  version: 1
}
```

Content stored as markdown strings, rendered via inline markdown parser.

### Context

```
FootnoteSectionNode.decorate()
  └─ Injects definitions into FootnoteDefinitionsContext
      └─ FootnoteNode renderer reads content for tooltip display
```

`FootnoteDefinitionsContext` provides:
- `definitions: Map<string, string>` (identifier → content)
- `displayNumberMap: Map<string, number>` (identifier → display number)

### Read Mode UI

**Inline reference (FootnoteRenderer)**:
- Accent-colored pill badge `[1]`
- Hover → tooltip with rendered footnote content
- Click → smooth scroll to footer definition, flash highlight

**Footer section (FootnoteSectionRenderer)**:
- Divider + ordered list
- Each item: number + rendered content + back button (↩)
- Back button click → scroll to inline reference

### Edit Mode UI

**Inline reference**:
- Same visual as read mode
- Click to select, delete/backspace to remove
- Insert via markdown shortcut `[^identifier]`

**Footer section (FootnoteSectionEditRenderer)**:
- Editable input per definition
- Add/remove/edit definitions
- Auto-number by document appearance order
- Auto-create empty definition when new `[^id]` reference has no definition
- Prompt to delete definition when last reference to it is removed

### Auto-numbering

Identifiers are arbitrary strings. Display numbers assigned by first-appearance order in document:
- Document has `[^rfc]` `[^note]` `[^rfc]` → displays as `[1]` `[2]` `[1]`
- Footer order: 1. rfc content, 2. note content

Computed by `FootnotePlugin` traversing document nodes.

### Markdown Import/Export

**Export**: `FootnoteNode` → `[^id]`, `FootnoteSectionNode` → `[^id]: content` lines at end.

**Import**: Inline `[^id]` → `FootnoteNode` (existing), `[^id]: content` lines → collected into `FootnoteSectionNode.definitions`.

### File Structure

```
src/nodes/FootnoteNode.ts              ← tweak: decorate passes content
src/nodes/FootnoteSectionNode.ts       ← new: block-level definitions node
src/components/renderers/FootnoteRenderer.tsx         ← enhance: add tooltip
src/components/renderers/FootnoteSectionRenderer.tsx  ← new: footer rendering
src/context/FootnoteDefinitionsContext.ts             ← new: definitions + numbering
src/plugins/FootnotePlugin.tsx                        ← new: numbering, sync
src/transformers/footnote.ts                          ← enhance: section import/export
```

### Edit/Static Split

Per project architecture:
- `FootnoteSectionNode` (static) → `RendererWrapper` + `FootnoteSectionRenderer`
- `FootnoteSectionEditNode` (edit) → extends static, overrides `decorate()` with edit renderer
- `FootnoteNode` needs no split (tooltip is display-only, no heavy edit deps)
