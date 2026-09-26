# KaTeX Snippets Panel Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a searchable snippet panel to the KaTeX editor that inserts templates at the current cursor position and returns focus to the textarea.

**Architecture:** Keep snippet data and insertion behavior in a small pure helper module so the cursor-placement logic can be tested without mounting the full popover UI. Update `KaTeXEditDecorator` to render a compact command-palette-style snippet list and wire snippet clicks back into the existing textarea state and preview.

**Tech Stack:** React 19, Lexical, TypeScript, Vanilla Extract, Vitest

---

### Task 1: Snippet insertion logic

**Files:**
- Create: `haklex/rich-renderer-katex/src/snippets.ts`
- Create: `haklex/rich-renderer-katex/tests/snippets.test.ts`

**Step 1: Write the failing test**

Cover:
- inserting a snippet at the current cursor position
- replacing the current selection with snippet content
- moving the cursor to the snippet placeholder after insertion
- filtering snippets by name, keyword, or category

**Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run haklex/rich-renderer-katex/tests/snippets.test.ts`
Expected: FAIL because `src/snippets.ts` does not exist yet.

**Step 3: Write minimal implementation**

Implement:
- snippet catalog with categories and keywords
- `filterKaTeXSnippets(query)`
- `insertSnippetAtSelection(value, template, selectionStart, selectionEnd)`

Use lightweight placeholder tokens so cursor placement is deterministic.

**Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run haklex/rich-renderer-katex/tests/snippets.test.ts`
Expected: PASS

### Task 2: Snippets tab UI

**Files:**
- Modify: `haklex/rich-renderer-katex/src/KaTeXEditDecorator.tsx`
- Modify: `haklex/rich-renderer-katex/src/styles.css.ts`

**Step 1: Write the failing test**

Skip UI test scaffolding for this task and rely on Task 1 coverage for the behavior-critical insertion logic. Verify manually in the editor demo after wiring the UI.

**Step 2: Write minimal implementation**

Implement:
- search input in the `Snippets` tab
- grouped snippet list with compact rows
- click handler that inserts snippet text at the current textarea selection
- focus restoration and cursor placement back into the textarea
- empty search state

**Step 3: Run targeted verification**

Run:
- `pnpm exec vitest run haklex/rich-renderer-katex/tests/snippets.test.ts`
- `pnpm --filter @haklex/rich-renderer-katex build`

Expected:
- test file passes
- package build exits 0

### Task 3: Final verification

**Files:**
- Verify only changed files above plus this plan document

**Step 1: Lint diagnostics**

Run IDE diagnostics for:
- `haklex/rich-renderer-katex/src/KaTeXEditDecorator.tsx`
- `haklex/rich-renderer-katex/src/styles.css.ts`
- `haklex/rich-renderer-katex/src/snippets.ts`

**Step 2: Summarize constraints**

Confirm:
- snippet insertion uses current cursor position
- UI remains compact and neutral-toned
- no unrelated files are modified
