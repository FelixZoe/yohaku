# Note Letter Bottom Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the plain "read full note" link at the bottom of `NoteLatestRender` with a hand-journal (手帐便笺) styled area featuring washi tape, handwritten link, postmark stamp, and tape accent.

**Architecture:** Add a `LetterBottom` server component in the same file as `NoteLatestRender`. It receives `topicName?: string`, `href: string`, and `linkText: string` (extension beyond spec for i18n), renders four decorative layers (washi tape, handwritten link, postmark, tape accent) using pure CSS/inline styles. Dynamic washi tape color derived from `topicStringToHue`. Dark mode washi tape uses two divs toggled via Tailwind `dark:hidden` / `hidden dark:block` since inline styles cannot respond to `dark:` variant.

**Tech Stack:** React Server Component, Tailwind CSS, inline styles for dynamic colors, existing `topicStringToHue` utility.

**Spec:** `docs/superpowers/specs/2026-03-14-note-letter-bottom-design.md`

---

## Chunk 1: Implementation

### File Structure

- **Modify:** `apps/web/src/components/modules/note/NoteLatestRender.tsx`
  - Replace lines 81-88 (the `<div className="mt-1 text-center">...</div>` block) with `<LetterBottom>` usage
  - Add `LetterBottom` function at bottom of file (alongside existing `MobileTopicTag`)

No new files needed. Single-file change.

---

### Task 1: Add `LetterBottom` component and integrate it

**Files:**
- Modify: `apps/web/src/components/modules/note/NoteLatestRender.tsx:81-88` (replace read-full-note block)
- Modify: `apps/web/src/components/modules/note/NoteLatestRender.tsx` (add `LetterBottom` function at end of file)

- [ ] **Step 1: Add the `LetterBottom` component function**

Add after the existing `MobileTopicTag` function (after line 106):

```tsx
function LetterBottom({
  topicName,
  href,
  linkText,
}: {
  topicName?: string
  href: string
  linkText: string
}) {
  const hue = topicName ? topicStringToHue(topicName) : null

  // Washi tape stripe colors — light mode
  const washiC1 =
    hue !== null
      ? `hsla(${hue}, 35%, 50%, 0.18)`
      : 'rgba(170, 160, 140, 0.2)'
  const washiC2 =
    hue !== null
      ? `hsla(${hue}, 35%, 50%, 0.10)`
      : 'rgba(170, 160, 140, 0.12)'
  // Washi tape stripe colors — dark mode (lower alpha)
  const washiC1Dark =
    hue !== null
      ? `hsla(${hue}, 35%, 50%, 0.14)`
      : 'rgba(170, 160, 140, 0.14)'
  const washiC2Dark =
    hue !== null
      ? `hsla(${hue}, 35%, 50%, 0.07)`
      : 'rgba(170, 160, 140, 0.08)'

  const washiMask = {
    maskImage:
      'linear-gradient(90deg, transparent 0%, black 5%, black 95%, transparent 100%)',
    WebkitMaskImage:
      'linear-gradient(90deg, transparent 0%, black 5%, black 95%, transparent 100%)',
  }

  return (
    <div className="relative mt-1 pb-12">
      {/* Washi tape — light mode */}
      <div
        className="mx-auto h-5 w-[65%] -rotate-[1.2deg] dark:hidden"
        style={{
          background: `repeating-linear-gradient(45deg, ${washiC1} 0px, ${washiC1} 4px, ${washiC2} 4px, ${washiC2} 8px)`,
          ...washiMask,
        }}
      />
      {/* Washi tape — dark mode */}
      <div
        className="mx-auto hidden h-5 w-[65%] -rotate-[1.2deg] dark:block"
        style={{
          background: `repeating-linear-gradient(45deg, ${washiC1Dark} 0px, ${washiC1Dark} 4px, ${washiC2Dark} 4px, ${washiC2Dark} 8px)`,
          ...washiMask,
        }}
      />

      {/* Handwritten-style link */}
      <div className="mt-4 text-center">
        <Link
          className="text-sm italic tracking-wide text-[#b07a4a] transition-opacity hover:opacity-70 dark:text-[#d4a574]"
          href={href}
          style={{
            fontFamily: "Georgia, 'Noto Serif SC', serif",
            letterSpacing: '0.5px',
          }}
        >
          {linkText} →
        </Link>
      </div>

      {/* Postmark stamp — hidden on mobile */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-2.5 right-5 hidden size-12 -rotate-[18deg] items-center justify-center rounded-full border-[1.5px] border-[rgba(160,80,70,0.22)] dark:border-[rgba(180,110,100,0.25)] sm:flex"
      >
        <span
          className="text-center text-[7.5px] uppercase leading-tight text-[rgba(160,80,70,0.3)] dark:text-[rgba(180,110,100,0.3)]"
          style={{ fontFamily: "'Courier New', monospace" }}
        >
          Letter
          <br />
          Post
        </span>
      </div>

      {/* Tape accent piece — hidden on mobile */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-13 right-3 hidden h-3.5 w-13 rotate-[4deg] rounded-[1px] bg-[rgba(200,185,150,0.25)] dark:bg-[rgba(200,185,150,0.1)] sm:block"
      />
    </div>
  )
}
```

- [ ] **Step 2: Replace the old read-full-note block with `LetterBottom`**

Replace lines 81-88 in `NoteLatestRender`:

```tsx
// OLD (remove):
      <div className="mt-1 text-center">
        <Link
          className="text-sm font-medium text-accent transition-colors hover:text-accent/80"
          href={href}
        >
          {t('read_full_note')} →
        </Link>
      </div>

// NEW (replace with):
      <LetterBottom
        href={href}
        linkText={t('read_full_note')}
        topicName={note.topic?.name}
      />
```

- [ ] **Step 3: Verify no unused imports**

The file already imports `topicStringToHue` from `~/lib/color` (line 6) and `Link` from `~/i18n/navigation` (line 5). No new imports needed.

- [ ] **Step 4: Lint the modified file**

Run: `pnpm --filter @shiro/web lint -- --fix apps/web/src/components/modules/note/NoteLatestRender.tsx`

Expected: No errors. If ESLint reports issues, fix them.

- [ ] **Step 5: Visual verification**

Run: `pnpm --filter @shiro/web dev`

Open `http://localhost:2323/notes` in the browser. Verify:
1. Washi tape stripe appears centered with topic color (or neutral if no topic)
2. "阅读全文 →" displays in serif italic, warm brown color
3. Postmark circle appears in bottom-right with "Letter Post" text
4. Tape accent piece visible near postmark
5. On mobile viewport (< 640px): postmark and tape accent hidden, washi tape and link remain
6. Dark mode: all colors adapt per spec

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/modules/note/NoteLatestRender.tsx
git commit -m "feat(notes): add hand-journal styled letter bottom to latest note"
```
