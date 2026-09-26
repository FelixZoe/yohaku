# Dropdown Menu Restyle Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restyle the dropdown menu primitives to visually match the provided reference while keeping the current API and behavior intact.

**Architecture:** Reuse the existing Base UI primitive composition and portal/theme wrapper. Limit implementation to in-place visual refinements in the dropdown component file and its Vanilla Extract stylesheet, with no external call-site changes.

**Tech Stack:** React 19, `@base-ui/react`, Vanilla Extract CSS-in-TS, `@haklex/rich-style-token`, `lucide-react`.

---

### Task 1: Refine dropdown popup styling

**Files:**
- Modify: `haklex/rich-editor-ui/src/components/dropdown-menu/styles.css.ts`

**Step 1: Update popup surface styling**

Adjust the popup surface so it feels closer to the reference:

- slightly larger radius
- refined border + softer shadow
- cleaner inner padding
- improved open/close opacity and scale timing
- preserve `--available-height` and `--transform-origin`

**Step 2: Verify build**

Run: `pnpm --filter @haklex/rich-editor-ui build`

Expected: SUCCESS, no type errors.

---

### Task 2: Refine row, label, separator, and indicator styling

**Files:**
- Modify: `haklex/rich-editor-ui/src/components/dropdown-menu/styles.css.ts`

**Step 1: Update row rhythm and states**

Adjust item, label, separator, checkbox, and radio styles:

- `text-sm` style density with slightly roomier horizontal padding
- rounded highlighted row background
- neutral muted label color
- full-width icon sizing and alignment consistency
- right-aligned checkbox/radio indicators

**Step 2: Verify build**

Run: `pnpm --filter @haklex/rich-editor-ui build`

Expected: SUCCESS.

---

### Task 3: Add minimal markup hooks in dropdown component

**Files:**
- Modify: `haklex/rich-editor-ui/src/components/dropdown-menu/index.tsx`

**Step 1: Add lightweight data/class hooks only where needed**

If styling benefits from them, add `data-slot` attributes or wrapper class hooks without changing exported props, render tree structure, or behavior.

**Step 2: Verify build**

Run: `pnpm --filter @haklex/rich-editor-ui build`

Expected: SUCCESS.

---

### Task 4: Validate edited files

**Files:**
- Modify: `haklex/rich-editor-ui/src/components/dropdown-menu/index.tsx`
- Modify: `haklex/rich-editor-ui/src/components/dropdown-menu/styles.css.ts`

**Step 1: Run lint/build checks**

Run:

- `pnpm --filter @haklex/rich-editor-ui build`
- read IDE lints for the edited files

Expected:

- no new lint errors in edited files
- no TypeScript or build regressions caused by the restyle
