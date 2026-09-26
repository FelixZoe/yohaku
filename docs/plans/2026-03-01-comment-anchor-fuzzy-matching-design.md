# Comment Anchor Fuzzy Matching Design

## Problem

When article content is edited after comments with RangeAnchor are created, the stored `startOffset`/`endOffset` become invalid. The highlight either points to wrong text or fails entirely.

## Scope

- **RangeAnchor only** — BlockAnchor continues using blockId lookup as-is.
- **Frontend rendering-time resolution** — no backend changes.
- **Fallback to BlockAnchor** when fuzzy matching fails.

## Stored Anchor Data (existing)

```typescript
interface RangeAnchor {
  mode: 'range'
  blockId: string
  blockType: string
  blockFingerprint: string   // hash of first 200 chars + text length
  snapshotText: string       // block text snapshot (≤300 chars)
  quote: string              // selected text
  prefix: string             // 50 chars before selection
  suffix: string             // 50 chars after selection
  startOffset: number        // char offset in block
  endOffset: number          // char offset in block
  lang: string | null
}
```

## Resolution API

```typescript
interface ResolvedAnchor {
  status: 'exact' | 'fuzzy' | 'block-fallback'
  startOffset: number
  endOffset: number
  blockIndex: number
  similarity?: number  // 0-1, only for fuzzy
}

function resolveRangeAnchor(
  anchor: RangeAnchor,
  blockInfos: BlockInfo[],
): ResolvedAnchor | null
```

## Four-Layer Resolution

### Layer 1: Exact Match
- `blockId` found in `blockInfos` AND `blockFingerprint` matches current block
- Use original `startOffset`/`endOffset` directly
- `status: 'exact'`

### Layer 2: Quote Substring Search
- `blockFingerprint` mismatch → search `quote` in current block text via `indexOf`
- If unique match → use new offsets, `status: 'fuzzy'`, `similarity: 1.0`
- If multiple matches → disambiguate using `prefix`/`suffix` context (longest common prefix/suffix match)

### Layer 3: Levenshtein Fuzzy Match
- `quote` exact search fails → sliding window over block text
- Window sizes: `[quoteLen * 0.6, quoteLen * 1.4]`
- Calculate edit distance for each window position
- `similarity = 1 - (editDistance / max(quoteLen, windowLen))`
- Accept best match with `similarity ≥ 0.6`
- Multiple candidates → disambiguate with `prefix`/`suffix`
- `status: 'fuzzy'`

### Layer 4: Block Fallback
- All above fail OR blockId not found
- `status: 'block-fallback'`
- Comment degrades to block-level display in CommentBlockGutter

## Performance Optimizations

For Levenshtein sliding window:

1. **Window size bounds**: only `[quoteLen * 0.6, quoteLen * 1.4]` range
2. **Character frequency pre-filter**: skip windows whose char frequency diverges too much from quote
3. **Single-row DP**: O(m) space, reuse one array
4. **Long text bail-out**: if block text > 5000 chars AND quote > 200 chars, skip Layer 3 entirely (use Layer 2 or fallback)

## Similarity Thresholds

| Range | Confidence | Behavior |
|-------|-----------|----------|
| ≥ 0.8 | High | Normal highlight |
| 0.6 – 0.8 | Medium | Normal highlight (already dashed underline) |
| < 0.6 | Reject | Block fallback |

## File Changes

| File | Change |
|------|--------|
| `apps/web/src/components/modules/comment/anchor-resolve.ts` | **New file**: `resolveRangeAnchor()`, Levenshtein algorithm, disambiguation logic |
| `apps/web/src/components/modules/comment/CommentAnchorHighlight.tsx` | Call `resolveRangeAnchor()` before rendering highlights; handle `block-fallback` status |
| `apps/web/src/components/modules/comment/CommentBlockGutter.tsx` | Accept block-fallback comments into block-level comment list |

## Caching

Results cached via `useMemo` keyed on anchor identity + blockInfos reference. No recomputation unless blockInfos changes.
