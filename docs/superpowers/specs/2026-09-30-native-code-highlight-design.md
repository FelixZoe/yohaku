# Native Code Highlighting (tree-sitter)

**Date:** 2026-09-30
**Author:** Innei
**Status:** Draft
**Scope:** `yohaku-oss/apps/mobile` (`src/rich/blocks/code-block.tsx`, `modules/yohaku/ios`, `plugins/`)
**Builds on:** native article body renderer (#48, #51); shiki removed from the native bundle in `e765506` (@haklex 0.45)

## 1. Problem

The native body renderer draws `code-block` (and `code-snippet`) through
`CodeCard`, which renders the code as one monochrome `<Text>`. Nothing in the
native path highlights code, and shiki was deliberately removed from the
native bundle.

## 2. Goal

Code blocks in Lexical posts and notes are syntax-highlighted natively, with
colors matching web (shiki `github-light` / `github-dark`), for 21 languages.
Unknown languages keep today's plain monospace rendering.

Non-goals: editing, line numbers, folding, languages outside the list below,
Markdown-format posts (they open on web and never reach `CodeCard`).

## 3. Decisions and evidence

**tree-sitter over shiki-in-Hermes.** Same 162-line `.tsx`, M-series Mac:

| Engine | First block | Warm | Thread |
| --- | --- | --- | --- |
| tree-sitter (C, tsx grammar + highlights query) | 0.75 ms | 0.55 ms | any |
| shiki JS regex engine in the app's Hermes (`hermesvm.framework` via JSI) | 470 ms | 122 ms | JS |
| shiki JS regex engine in Node/V8 (reference) | 162 ms | 5.4 ms | — |

Query compilation adds ~12 ms once per language. Full shiki in Hermes would
also be 8.1 MB of JS (242 grammars) with the same per-block cost.

**Binary cost.** Measured per grammar, `clang -Os -target arm64-apple-ios18.0`,
`__TEXT` + `__DATA`; download ≈ `gzip -9` of the objects. Parse tables are
sparse constant arrays, so they compress ~10×.

## 4. Languages

| Language | Repo @ tag (subdir) | Queries used | Installed | Download |
| --- | --- | --- | --- | --- |
| typescript | tree-sitter/tree-sitter-typescript @ v0.23.2 (`typescript`) | js `highlights` + ts `highlights`; js `injections` | 1367 KB | 133 KB |
| tsx | tree-sitter/tree-sitter-typescript @ v0.23.2 (`tsx`) | js `highlights` + js `highlights-jsx` + ts `highlights`; js `injections` | 1398 KB | 136 KB |
| javascript | tree-sitter/tree-sitter-javascript @ v0.25.0 | `highlights`, `highlights-jsx`, `injections` | 394 KB | 52 KB |
| bash | tree-sitter/tree-sitter-bash @ v0.25.1 | `highlights` | 1329 KB | 184 KB |
| json | tree-sitter/tree-sitter-json @ v0.24.8 | `highlights` | 4 KB | 2 KB |
| swift | alex-pinkus/tree-sitter-swift @ 0.7.3-with-generated-files | `highlights`, `injections` | 3640 KB | 342 KB |
| css | tree-sitter/tree-sitter-css @ v0.25.0 | `highlights` | 124 KB | 24 KB |
| yaml | tree-sitter-grammars/tree-sitter-yaml @ v0.7.2 | `highlights` | 161 KB | 28 KB |
| html | tree-sitter/tree-sitter-html @ v0.23.2 | `highlights`, `injections` | 10 KB | 4 KB |
| python | tree-sitter/tree-sitter-python @ v0.25.0 | `highlights` | 438 KB | 65 KB |
| diff | the-mikedavis/tree-sitter-diff @ v0.2.0 | `highlights`, `injections` | 51 KB | 10 KB |
| xml | tree-sitter-grammars/tree-sitter-xml @ v0.7.0 (`xml`) | `highlights` | 37 KB | 15 KB |
| toml | tree-sitter-grammars/tree-sitter-toml @ v0.7.0 | `highlights` | 21 KB | 8 KB |
| dockerfile | camdencheek/tree-sitter-dockerfile @ v0.2.0 | `highlights` | 44 KB | 19 KB |
| lua | tree-sitter-grammars/tree-sitter-lua @ v0.5.0 | `highlights`, `injections` | 49 KB | 14 KB |
| go | tree-sitter/tree-sitter-go @ v0.25.0 | `highlights` | 207 KB | 38 KB |
| java | tree-sitter/tree-sitter-java @ v0.23.5 | `highlights` | 398 KB | 52 KB |
| c | tree-sitter/tree-sitter-c @ v0.24.2 | `highlights` | 613 KB | 74 KB |
| markdown (+ inline) | tree-sitter-grammars/tree-sitter-markdown @ v0.5.3 (`tree-sitter-markdown`, `tree-sitter-markdown-inline`) | `highlights`, `injections` (both) | 747 KB | 131 KB |
| rust | tree-sitter/tree-sitter-rust @ v0.24.2 | `highlights`, `injections` | 1079 KB | 115 KB |
| php | tree-sitter/tree-sitter-php @ v0.25.0 (`php`) | `highlights`, `injections` | 1031 KB | 105 KB |
| **Total** | | | **~12.8 MB** | **~1.5 MB** |

All grammars are ABI 14 or 15; the runtime (tree-sitter 0.25.10, pulled in
by SwiftTreeSitter 0.10.0) accepts ABI 13–15.

**Aliases** (fence tag, lowercased → language): `ts`, `mts`, `cts` → typescript;
`js`, `mjs`, `cjs`, `jsx` → javascript (jsx via `highlights-jsx`);
`sh`, `shell`, `zsh` → bash; `json5`, `jsonc` → json;
`yml` → yaml; `htm` → html; `py` → python; `patch` → diff;
`svg`, `plist` → xml; `docker` → dockerfile; `golang` → go; `h` → c;
`md`, `mdx` → markdown; `rs` → rust. Everything else (including `vue`,
`scss`, `sql`) stays plain.

## 5. Architecture

### 5.1 Packaging

One podspec per upstream repo under `modules/yohaku/ios/Vendor/TreeSitter/`,
each pinned to the git tag above, following `SwiftMath.podspec`:

- `TreeSitter.podspec` — tree-sitter @ v0.25.10, `lib/src/lib.c` + `lib/include`.
- `SwiftTreeSitter.podspec` — swift-tree-sitter @ 0.10.0, sources of both the
  `SwiftTreeSitter` and `SwiftTreeSitterLayer` targets; depends on `TreeSitter`.
- One `TreeSitter<Name>.podspec` per grammar repo (typescript and tsx share
  one; markdown and markdown-inline share one). `source_files` =
  `src/parser.c` + `src/scanner.c` (+ repo-local headers such as
  typescript's `common/scanner.h`). `prepare_command` writes the concatenated
  `highlights.scm` (order as in §4) and copies `injections.scm` into a
  `queries/<language>/` resource bundle, and generates a small C header
  exposing `tree_sitter_<name>()`.

`plugins/with-ios-mermaid-pods.cjs` (renamed `with-ios-vendored-pods.cjs`)
adds the Podfile lines. `YohakuKit.podspec` depends on `SwiftTreeSitter` and
the grammar pods. Nothing from upstream is committed to the repo.

### 5.2 Swift — `modules/yohaku/ios/Code/`

- `CodeLanguages.swift` — the §4 table: canonical name → `TSLanguage`
  function, query resource names, aliases. `resolve(_ tag: String) -> CodeLanguage?`.
  Builds `LanguageConfiguration`s lazily and caches them (highlights + injections
  queries compiled once per language per process).
- `CodeHighlighter.swift` — `highlight(code:language:) -> [CodeSpan]` where
  `CodeSpan = (range: NSRange, capture: String)`. Uses a `LanguageLayer`
  (SwiftTreeSitterLayer) for the root language so injections (markdown →
  inline + fenced languages, html → css/javascript, php → html, …) resolve
  into child layers. Injections naming a language outside §4 are skipped.
  Runs the highlights query over every layer, resolves predicates, and
  flattens to non-overlapping spans (innermost/later capture wins, the
  tree-sitter highlight convention).
- `CodeTheme.swift` — capture name → color for light and dark. Lookup tries
  the full name, then strips trailing `.segment`s (`function.method.builtin`
  → `function.method` → `function`). Unmapped captures use the default
  foreground.
- `YohakuCodeView.swift` — `ExpoView` containing a horizontal `UIScrollView`
  with a non-editable, selectable, non-scrolling `UITextView`
  (`lineBreakMode = .byClipping`, container width unbounded, `usesFontLeading
  = false` per the TextKit leading note). Props: `code`, `language`,
  `fontFamily`, `fontSize`, `lineHeight`, `textColor` (default foreground).
  Event: `onContentSize { height }`.
  Flow: set plain attributed text immediately and report height; highlight on
  a shared serial background queue; apply colors on main if `code`/`language`
  are unchanged. Spans are kept so a trait change (light ↔ dark) recolors
  without re-parsing.
- `YohakuModule.swift` registers `View(YohakuCodeView.self)` as `YohakuCode`.

### 5.3 Theme (from `@shikijs/themes` github-light / github-dark)

| Captures | Light | Dark |
| --- | --- | --- |
| `comment` | #6a737d | #6a737d |
| `keyword`, `keyword.*`, `operator`, `storage` | #d73a49 | #f97583 |
| `string`, `string.special`, `string.regexp`, `character` | #032f62 | #9ecbff (regexp #dbedff) |
| `number`, `boolean`, `constant`, `constant.builtin`, `escape` | #005cc5 | #79b8ff |
| `function`, `function.method`, `function.builtin`, `constructor`, `type`, `type.builtin`, `module`, `label` | #6f42c1 | #b392f0 |
| `variable.builtin`, `variable.parameter` | #e36209 | #ffab70 |
| `property`, `attribute`, `tag.attribute` | #005cc5 | #79b8ff |
| `tag` | #22863a | #85e89d |
| `markup.heading`, `text.title`, `markup.raw`, `text.literal` | #005cc5 | #79b8ff |
| `markup.strong` / `markup.italic` | fg, bold / fg, italic | same |
| `diff.plus` / `diff.minus` | #22863a / #b31d28 | #85e89d / #fdaeb7 |
| `punctuation.*`, `variable`, everything else | default fg | default fg |

Default foreground and background stay the app's own (`palette.neutral[9]`
on `palette.neutral[1]`), so the card keeps its paper look; only tokens take
GitHub colors.

### 5.4 JS

`code-block.tsx`: `CodeCard` keeps the header (language label + copy) and
replaces the body `ScrollView > Text` with `<YohakuCode>` from `@modules/yohaku`,
height from `onContentSize` (same pattern as `math-block.tsx`). The fence tag
is passed raw; Swift resolves aliases. `code-snippet` uses `CodeCard` and
gets highlighting unchanged.

## 6. Failure handling

| Case | Result |
| --- | --- |
| Tag not in §4 / empty | Plain monospace (no parse) |
| Query fails to compile | Plain; `os_log` once per language |
| Code > 100 KB | Plain |
| Parse returns no tree / cancelled | Plain |
| Injection names an unsupported language | That range keeps parent colors |

Plain rendering is always shown first, so a failure never leaves the card
empty or changes its height.

## 7. Verification

- Rich document lab (`src/app/dev-demos/rich-document.tsx`): one block per
  language in §4, plus markdown with a fenced `ts` block and html with
  `<script>`/`<style>`. Simulator screenshots in light and dark.
- Vitest: `CodeCard` renders `YohakuCode` with the raw fence tag and wires
  height.
- Binary size: compare the app binary of the TestFlight build against the
  previous build (App Store Connect size report); expected growth ≈ §4 total.
- Real post: a Lexical post with ts/bash/swift blocks on device.

Ships in a TestFlight build (native code; OTA cannot deliver it).
