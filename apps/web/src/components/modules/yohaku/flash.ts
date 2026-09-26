const HIGHLIGHT_NAME = 'yohaku-flash'
const HIGHLIGHT_STYLE_ID = 'yohaku-flash-highlight-style'

type FlashResult = {
  /** Element nearest the range start — convenient for offset-based scrolling. */
  anchorEl: HTMLElement | null
  range: Range
}

function supportsHighlightApi(): boolean {
  return (
    typeof CSS !== 'undefined' &&
    'highlights' in CSS &&
    typeof Highlight !== 'undefined'
  )
}

// Injected at runtime: Turbopack's CSS parser rejects ::highlight() so the
// rule cannot live in a static stylesheet.
function ensureHighlightStyle() {
  if (typeof document === 'undefined') return
  if (document.getElementById(HIGHLIGHT_STYLE_ID)) return
  const style = document.createElement('style')
  style.id = HIGHLIGHT_STYLE_ID
  style.textContent = `::highlight(${HIGHLIGHT_NAME}){background-color:color-mix(in srgb,var(--color-accent,#d4a574) var(--yohaku-flash-alpha,38%),transparent);}`
  document.head.append(style)
}

function nearestElement(range: Range): HTMLElement | null {
  const node = range.startContainer
  if (node.nodeType === Node.ELEMENT_NODE) return node as HTMLElement
  return (node.parentElement as HTMLElement | null) ?? null
}

export function flashRange(
  range: Range,
  durationMs: number,
): FlashResult | null {
  if (!supportsHighlightApi()) return null
  try {
    ensureHighlightStyle()
    const highlight = new Highlight(range)
    CSS.highlights.set(HIGHLIGHT_NAME, highlight)
    setTimeout(() => {
      CSS.highlights.delete(HIGHLIGHT_NAME)
    }, durationMs)
    return { range, anchorEl: nearestElement(range) }
  } catch {
    return null
  }
}
