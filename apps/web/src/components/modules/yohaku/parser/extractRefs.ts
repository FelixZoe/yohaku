/**
 * Walk text nodes under `root`, build a flat offset map, then locate
 * the first contiguous occurrence of `quote` and return a DOM Range.
 * Returns null if not found or quote is empty.
 *
 * Both the needle (trimmed) and flat text are NFC-normalized before
 * matching so NFC/NFD-inconsistent inputs still align. If NFC changes
 * the flat length (rare for real CJK + Latin text), offset mapping to
 * the original Text nodes is no longer 1:1, so we bail rather than
 * risk a misaligned Range.
 */
export function locateQuoteRange(
  root: HTMLElement,
  quote: string,
): Range | null {
  if (!quote) return null
  const needle = quote.trim().normalize('NFC')
  if (!needle) return null

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const chunks: { node: Text; start: number; end: number }[] = []
  let flat = ''
  let node: Node | null
  while ((node = walker.nextNode())) {
    const t = node as Text
    const text = t.data
    chunks.push({ node: t, start: flat.length, end: flat.length + text.length })
    flat += text
  }

  const flatNorm = flat.normalize('NFC')
  if (flatNorm.length !== flat.length) {
    // NFC changed length — chunk offsets no longer map 1:1 to Text nodes.
    return null
  }

  const hit = flatNorm.indexOf(needle)
  if (hit < 0) return null
  const hitEnd = hit + needle.length

  const startChunk = chunks.find((c) => c.start <= hit && hit < c.end)
  const endChunk = chunks.find((c) => c.start < hitEnd && hitEnd <= c.end)
  if (!startChunk || !endChunk) return null

  const range = document.createRange()
  range.setStart(startChunk.node, hit - startChunk.start)
  range.setEnd(endChunk.node, hitEnd - endChunk.start)
  return range
}
