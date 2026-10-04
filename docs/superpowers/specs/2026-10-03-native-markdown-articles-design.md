# Native Markdown Articles

**Date:** 2026-10-03
**Author:** Innei
**Status:** Approved
**Scope:** `yohaku-oss/apps/mobile` (`src/rich/markdown`, `src/screens/details`, `modules/yohaku/ios`), `yohaku-oss/patches/react-native-enriched-markdown@1.0.2.patch`
**Supersedes:** `2026-08-11-mobile-markdown-safari-view-design.md`
**UI:** https://claude.ai/artifact/C2AsGahJEKotpmrSi7ihqz

## 1. Problem

Posts, notes and pages whose `contentFormat` is `markdown` are not rendered in
the app. `openPost` / `openNote` send them to SFSafariViewController, so they
are unreadable offline and have none of the article page's features. The app
is open source and other mx-space instances keep Markdown content, so a
server-side migration to Lexical on one instance does not solve this.

## 2. Goal

A Markdown article opens in the same article page as a Lexical article, with
the same typography, blocks, table of contents, reading progress, presence
marks, print and offline reading.

Not a goal: converting Markdown to Lexical state. The renderer reads Markdown
directly.

## 3. Architecture

```
posts.text / notes.text / pages.text      Markdown, already synced to SQLite
  → prepass(text)                          TypeScript: containers, footnotes
  → parseMarkdown(chunk)                   native: md4c from enriched-markdown
  → MarkdownAst                            JSON tree
  → markdownRenderers[node.type](…)        TypeScript: AST node → marker element
  → groupSegments(markers)                 existing
  → SegmentList                            existing: RichTextView + blockRegistry
```

The Lexical path already ends in format-neutral marker elements
(`TextBlockMarker`, `ListMarker`, `ViewBlockMarker`, `RunMarker`,
`InlineMarker`, table markers) that `groupSegments` turns into
`RichSegment[]`. The Markdown path produces the same markers, so everything
from `groupSegments` down is shared and unchanged.

### 3.1 Units

| Unit | Location | Job |
|---|---|---|
| `parseMarkdown` | library patch + `modules/yohaku` | Returns the md4c AST as a JSON string. The patch adds one Objective-C class to the library; the Yohaku Expo module exposes it as a sync function. |
| `prepass` | `src/rich/markdown/prepass.ts` | Fence-aware scan. Splits the source into Markdown chunks and `:::` container chunks, and lifts out footnote definitions. |
| `markdownRenderers` | `src/rich/markdown/renderers.tsx` | One renderer per AST node type, same shape as `nativeBuiltinOverrides`: returns marker elements. |
| inline extensions | `src/rich/markdown/inline-extensions.ts` | Syntax md4c does not know, applied to text nodes: `{GH@user}` mentions, `++insert++`, `[^id]` footnote references. |
| `MarkdownDocument` | `src/rich/markdown/markdown-document.tsx` | Same handler props as `RichDocument`, same context, renders `SegmentList`. |
| `ArticleBody` | `src/screens/details/article-body.tsx` | Picks `RichDocument` or `MarkdownDocument` from the body's format. |

### 3.2 Decisions

- **Block ids:** `m<index>` from the top-level marker position. The same text
  always gives the same ids.
- **No cache:** md4c parses in milliseconds; the result is memoized per
  `text` in the component.
- **Shared code moves, it is not copied:** `SegmentList` is exported from
  `rich-document.tsx`.
- **`CalloutBlock`** gains a second input (marker children) because it reads
  nested Lexical state today. `DetailsBlock` and `TableBlock` already read
  marker children.
- **List items** hold only runs and nested lists. Code, images and tables
  inside an item are hoisted to sit after it, and the list resumes with the
  next number.
- **Soft breaks** render as a space, except between two CJK characters, where
  they are dropped.
- **Capability check:** OTA can deliver the JavaScript to a binary built
  before `parseMarkdown` existed. `markdownOpensOnWeb` keeps the Safari path
  for those binaries.
- **The Lexical renderer functions are not reused.** They read Lexical fields
  such as the `format` bitmask.

## 4. Syntax coverage

| Tier | Syntax | How |
|---|---|---|
| 1 | CommonMark, GFM tables, task lists, strikethrough, `$` / `$$` math, `\|\|spoiler\|\|`, `==mark==`, bare URLs, HTML entities | md4c parses it; a renderer maps each node |
| 2 | Fenced `mermaid`, standalone image → image block, `> [!NOTE]` alerts, lone link → link card, `{GH@user}` mentions, `++insert++` | Decided in the renderers from tier 1 nodes and text |
| 3a | Footnotes `[^id]`, `:::` containers | Pre-pass before md4c |
| 3b | Raw HTML | Not parsed; shown as source text |

Containers, following `apps/web/src/components/ui/markdown/parsers/container.tsx`:

- `gallery`, `carousel` → `gallery` block
- `grid`, `masonry` → `gallery` block in grid layout
- `banner`, `note`, `info`, `success`, `tip`, `important`, `warn`, `warning`,
  `error`, `danger`, `caution` → callout; content parsed as nested Markdown
- unknown names and unmatched `:::` → plain text

Footnotes: `[^id]` becomes a run with the existing `footnote` field; the
definitions become one `footnote-section` block at the end.

Superscript `^x^` and subscript `~x~` stay off. The web renderer does not
support them, so no existing content uses them on purpose, and enabling them
turns `^_^` and single-tilde text into markup.

The library's md4c wrapper dropped HTML entities (`&amp;`, `&lt;`, `&#x4e2d;`).
The patch decodes them, which also fixes comments and thinking.

## 5. App integration

- `open-article.ts`, `activity-href.ts`, `note-latest.tsx`: Markdown articles
  no longer go to Safari. Password-protected notes keep the Safari path.
- `post-detail.tsx`, `note-detail.tsx`, `page-detail.tsx`: the "open in
  browser" placeholder is replaced by `ArticleBody` fed by `text`. The early
  returns that skip body refresh for Markdown are removed.
- `article-print-host.tsx` accepts Markdown.
- `note-latest.tsx` shows an inline preview for a Markdown note, built from
  the same segments.
- No database migration: `text` is already stored for both formats.

## 6. Limits

| Feature | State | Reason |
|---|---|---|
| Selection comments, comment highlights | off | mx-core rejects anchors on non-Lexical content |
| TTS playback | on when the server offers it | audio is server-side |
| TTS block follow | off unless server block ids match | follow uses server block ids |
| Table of contents | on | headings come from the segments |
| Body prefetch from lists | off | the batch body endpoint path skips Markdown rows; the body is fetched when the article first opens, then cached |
| Image aspect ratio | letterboxed in a 4:3 frame | Markdown images carry no size and the API's image meta is not stored |

## 7. Errors

- md4c does not fail on malformed input.
- If `parseMarkdown` throws or returns nothing, the body shows the existing
  "open in browser" link.

## 8. Testing

- **Vitest, pure:** pre-pass, renderers and inline extensions against AST
  JSON fixtures.
- **Simulator:** a `dev-demos` screen renders a Markdown fixture through
  `MarkdownDocument`.
