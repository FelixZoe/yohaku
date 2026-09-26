# Comment Anchor Fuzzy Matching Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** When article content is edited after comments are created, automatically re-locate RangeAnchor highlights using fuzzy matching instead of failing silently.

**Architecture:** A pure function `resolveRangeAnchor()` sits between stored anchor data and DOM rendering. It resolves through 4 layers: exact match → quote substring → Levenshtein fuzzy → block fallback. CommentAnchorHighlight and CommentBlockGutter consume resolved results.

**Tech Stack:** TypeScript, pure functions (no external deps), Levenshtein edit distance algorithm.

**Design doc:** `docs/plans/2026-03-01-comment-anchor-fuzzy-matching-design.md`

---

### Task 1: Create `anchor-resolve.ts` — Levenshtein distance utility

**Files:**
- Create: `apps/web/src/components/modules/comment/anchor-resolve.ts`

**Step 1: Create the file with Levenshtein distance + similarity functions**

```typescript
import type { BlockInfo } from './anchor-utils'
import { computeBlockFingerprint } from './anchor-utils'
import type { RangeAnchor } from './types'

export interface ResolvedAnchor {
  status: 'exact' | 'fuzzy' | 'block-fallback'
  startOffset: number
  endOffset: number
  blockIndex: number
  similarity?: number
}

/**
 * Single-row Levenshtein distance. O(n*m) time, O(m) space.
 */
function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m

  const row = new Uint16Array(n + 1)
  for (let j = 0; j <= n; j++) row[j] = j

  for (let i = 1; i <= m; i++) {
    let prev = i - 1
    row[0] = i
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      const val = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost)
      prev = row[j]
      row[j] = val
    }
  }
  return row[n]
}

function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  return 1 - levenshtein(a, b) / maxLen
}
```

**Step 2: Lint the new file**

Run: `pnpm --filter @shiro/web lint --no-fix -- apps/web/src/components/modules/comment/anchor-resolve.ts`

If the project lint config doesn't support file-specific targeting, run typecheck instead:
`cd apps/web && npx tsc --noEmit`

---

### Task 2: Add `findBestFuzzyMatch` sliding window function

**Files:**
- Modify: `apps/web/src/components/modules/comment/anchor-resolve.ts`

**Step 1: Add the sliding window fuzzy matcher after the `similarity` function**

```typescript
interface FuzzyMatch {
  startOffset: number
  endOffset: number
  similarity: number
}

/**
 * Character frequency vector for pre-filtering.
 */
function charFreq(s: string): Map<string, number> {
  const freq = new Map<string, number>()
  for (const ch of s) {
    freq.set(ch, (freq.get(ch) ?? 0) + 1)
  }
  return freq
}

function freqDivergence(a: Map<string, number>, b: Map<string, number>): number {
  let diff = 0
  const allKeys = new Set([...a.keys(), ...b.keys()])
  for (const k of allKeys) {
    diff += Math.abs((a.get(k) ?? 0) - (b.get(k) ?? 0))
  }
  return diff
}

function findBestFuzzyMatch(
  text: string,
  quote: string,
  prefix: string,
  suffix: string,
): FuzzyMatch | null {
  const qLen = quote.length
  if (qLen === 0 || text.length === 0) return null

  // Bail out for extremely long texts with long quotes
  if (text.length > 5000 && qLen > 200) return null

  const minWin = Math.max(1, Math.floor(qLen * 0.6))
  const maxWin = Math.ceil(qLen * 1.4)
  const quoteFreq = charFreq(quote)

  let best: FuzzyMatch | null = null

  for (let winLen = minWin; winLen <= maxWin; winLen++) {
    for (let i = 0; i <= text.length - winLen; i++) {
      const window = text.slice(i, i + winLen)

      // Pre-filter: character frequency divergence
      const winFreq = charFreq(window)
      if (freqDivergence(quoteFreq, winFreq) > qLen * 0.5) continue

      const sim = similarity(window, quote)
      if (sim < 0.6) continue

      if (!best || sim > best.similarity) {
        best = { startOffset: i, endOffset: i + winLen, similarity: sim }
      } else if (sim === best.similarity) {
        // Disambiguate with prefix/suffix context
        const bestCtx = contextScore(text, best.startOffset, best.endOffset, prefix, suffix)
        const curCtx = contextScore(text, i, i + winLen, prefix, suffix)
        if (curCtx > bestCtx) {
          best = { startOffset: i, endOffset: i + winLen, similarity: sim }
        }
      }
    }
  }

  return best
}

function contextScore(
  text: string,
  start: number,
  end: number,
  prefix: string,
  suffix: string,
): number {
  let score = 0
  if (prefix) {
    const before = text.slice(Math.max(0, start - prefix.length), start)
    // Count matching chars from the end of prefix
    for (let i = 0; i < Math.min(before.length, prefix.length); i++) {
      if (before[before.length - 1 - i] === prefix[prefix.length - 1 - i]) {
        score++
      } else break
    }
  }
  if (suffix) {
    const after = text.slice(end, end + suffix.length)
    for (let i = 0; i < Math.min(after.length, suffix.length); i++) {
      if (after[i] === suffix[i]) {
        score++
      } else break
    }
  }
  return score
}
```

**Step 2: Lint/typecheck**

Run: `cd apps/web && npx tsc --noEmit`

---

### Task 3: Add `resolveRangeAnchor` main function

**Files:**
- Modify: `apps/web/src/components/modules/comment/anchor-resolve.ts`

**Step 1: Add the main resolution function (export it)**

```typescript
export function resolveRangeAnchor(
  anchor: RangeAnchor,
  blockInfos: BlockInfo[],
): ResolvedAnchor {
  // Find block by blockId
  const blockIndex = blockInfos.findIndex((b) => b.blockId === anchor.blockId)

  if (blockIndex === -1) {
    return {
      status: 'block-fallback',
      startOffset: 0,
      endOffset: 0,
      blockIndex: -1,
    }
  }

  const block = blockInfos[blockIndex]
  const currentText = block.textContent

  // Layer 1: Exact — fingerprint matches, offsets still valid
  if (
    block.fingerprint === anchor.blockFingerprint &&
    anchor.endOffset <= currentText.length
  ) {
    return {
      status: 'exact',
      startOffset: anchor.startOffset,
      endOffset: anchor.endOffset,
      blockIndex,
    }
  }

  // Layer 2: Quote substring search
  const quoteIdx = currentText.indexOf(anchor.quote)
  if (quoteIdx !== -1) {
    // Check if unique
    const secondIdx = currentText.indexOf(anchor.quote, quoteIdx + 1)
    if (secondIdx === -1) {
      return {
        status: 'fuzzy',
        startOffset: quoteIdx,
        endOffset: quoteIdx + anchor.quote.length,
        blockIndex,
        similarity: 1.0,
      }
    }
    // Multiple matches — disambiguate with context
    let bestIdx = quoteIdx
    let bestScore = contextScore(
      currentText, quoteIdx, quoteIdx + anchor.quote.length,
      anchor.prefix, anchor.suffix,
    )
    let idx = secondIdx
    while (idx !== -1) {
      const score = contextScore(
        currentText, idx, idx + anchor.quote.length,
        anchor.prefix, anchor.suffix,
      )
      if (score > bestScore) {
        bestScore = score
        bestIdx = idx
      }
      idx = currentText.indexOf(anchor.quote, idx + 1)
    }
    return {
      status: 'fuzzy',
      startOffset: bestIdx,
      endOffset: bestIdx + anchor.quote.length,
      blockIndex,
      similarity: 1.0,
    }
  }

  // Layer 3: Levenshtein fuzzy match
  const fuzzy = findBestFuzzyMatch(
    currentText,
    anchor.quote,
    anchor.prefix,
    anchor.suffix,
  )
  if (fuzzy) {
    return {
      status: 'fuzzy',
      startOffset: fuzzy.startOffset,
      endOffset: fuzzy.endOffset,
      blockIndex,
      similarity: fuzzy.similarity,
    }
  }

  // Layer 4: Block fallback
  return {
    status: 'block-fallback',
    startOffset: 0,
    endOffset: 0,
    blockIndex,
  }
}
```

**Step 2: Lint/typecheck**

Run: `cd apps/web && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add apps/web/src/components/modules/comment/anchor-resolve.ts
git commit -m "feat(comment-anchor): add resolveRangeAnchor with Levenshtein fuzzy matching"
```

---

### Task 4: Integrate into `CommentAnchorHighlight.tsx`

**Files:**
- Modify: `apps/web/src/components/modules/comment/CommentAnchorHighlight.tsx`

**Step 1: Add import**

At the top imports, add:
```typescript
import { resolveRangeAnchor } from './anchor-resolve'
```

**Step 2: Add a `useResolvedAnchors` hook that pre-resolves all range anchors**

Replace the existing `anchorGroups` useMemo with a version that resolves anchors. The key change: before grouping, resolve each RangeAnchor's offsets.

Add a new type and helper before the component:

```typescript
interface ResolvedRangeAnchor extends RangeAnchor {
  /** Resolved offsets (may differ from stored) */
  resolvedStart: number
  resolvedEnd: number
  resolvedBlockIndex: number
  resolutionStatus: 'exact' | 'fuzzy' | 'block-fallback'
}
```

**Step 3: Modify the highlight rendering effect** (the `useEffect` that creates `CSS.highlights`)

Currently at line ~293-329, the effect iterates `rangeAnchors` and uses `anchor.startOffset`/`anchor.endOffset` directly. Change to:

```typescript
useEffect(() => {
  if (!contentEl) return

  const rangeAnchors = collectRangeAnchors(comments).filter((a) =>
    langMatches(a.lang, currentLang),
  )
  if (rangeAnchors.length === 0) {
    CSS.highlights.delete('comment-highlight')
    return
  }

  ensureHighlightStyle()

  const ranges: Range[] = []
  for (const anchor of rangeAnchors) {
    const resolved = resolveRangeAnchor(anchor, blockInfos)
    if (resolved.status === 'block-fallback') continue

    const blockEl = contentEl.children[resolved.blockIndex]
    if (!blockEl) continue

    const range = createDomRange(
      blockEl as Element,
      resolved.startOffset,
      resolved.endOffset,
    )
    if (range) ranges.push(range)
  }

  if (ranges.length > 0) {
    const highlight = new Highlight(...ranges)
    CSS.highlights.set('comment-highlight', highlight)
  } else {
    CSS.highlights.delete('comment-highlight')
  }

  return () => {
    CSS.highlights.delete('comment-highlight')
  }
}, [contentEl, blockInfos, comments, currentLang])
```

**Step 4: Modify `hitTestHighlight` callback**

Currently uses `anchor.startOffset`/`anchor.endOffset` for `createDomRange`. Change to resolve first:

In the loop over `anchorGroups.values()`:
```typescript
for (const { anchor, comments: anchorComments } of anchorGroups.values()) {
  const resolved = resolveRangeAnchor(anchor, blockInfos)
  if (resolved.status === 'block-fallback') continue

  const blockEl = contentEl.children[resolved.blockIndex]
  if (!blockEl) continue

  const range = createDomRange(
    blockEl as Element,
    resolved.startOffset,
    resolved.endOffset,
  )
  if (!range) continue

  try {
    if (range.comparePoint(node, offset) === 0) {
      return { anchor, comments: anchorComments, range }
    }
  } catch {
    // comparePoint can throw if node is not in the range's document
  }
}
```

**Step 5: Lint/typecheck**

Run: `cd apps/web && npx tsc --noEmit`

**Step 6: Commit**

```bash
git add apps/web/src/components/modules/comment/CommentAnchorHighlight.tsx
git commit -m "feat(comment-anchor): integrate resolveRangeAnchor into highlight rendering"
```

---

### Task 5: Handle block-fallback in `CommentBlockGutter.tsx`

**Files:**
- Modify: `apps/web/src/components/modules/comment/CommentBlockGutter.tsx`

**Step 1: Add import**

```typescript
import { resolveRangeAnchor } from './anchor-resolve'
```

**Step 2: Modify `commentsByBlock` useMemo**

Currently (line ~181-196), range anchors that don't match `currentLang` are added to block-level map. Extend this to also include range anchors that resolve to `block-fallback`:

```typescript
const commentsByBlock = useMemo(() => {
  const map = new Map<string, CommentWithAnchor[]>()
  for (const c of comments) {
    const { anchor } = c
    if (!anchor?.blockId) continue
    const anchorLang = (anchor as CommentAnchor).lang ?? null
    const isBlock = anchor.mode === 'block'
    const langMatch = anchorLang === currentLang

    if (isBlock || !langMatch) {
      const arr = map.get(anchor.blockId) || []
      arr.push(c)
      map.set(anchor.blockId, arr)
    } else if (anchor.mode === 'range') {
      // Check if this range anchor falls back to block level
      const resolved = resolveRangeAnchor(anchor, blockInfos)
      if (resolved.status === 'block-fallback' && resolved.blockIndex !== -1) {
        const blockId = blockInfos[resolved.blockIndex]?.blockId
        if (blockId) {
          const arr = map.get(blockId) || []
          arr.push(c)
          map.set(blockId, arr)
        }
      }
    }
  }
  return map
}, [comments, currentLang, blockInfos])
```

**Step 3: Lint/typecheck**

Run: `cd apps/web && npx tsc --noEmit`

**Step 4: Commit**

```bash
git add apps/web/src/components/modules/comment/CommentBlockGutter.tsx
git commit -m "feat(comment-anchor): show block-fallback comments in gutter"
```

---

### Task 6: Final verification

**Step 1: Full typecheck**

Run: `cd apps/web && npx tsc --noEmit`

**Step 2: Lint changed files**

Run: `pnpm --filter @shiro/web lint`

**Step 3: Final commit if any lint fixes**

```bash
git add -u
git commit -m "fix: lint fixes for comment anchor fuzzy matching"
```
