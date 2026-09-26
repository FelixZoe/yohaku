import type { MarkdownToJSX } from 'markdown-to-jsx'
import { Priority } from 'markdown-to-jsx'
import * as React from 'react'

import { parseCaptureInline, simpleInlineRegex } from '../utils/parser'

// Use simple non-backtracking pattern to prevent ReDoS
// (the complex INLINE_SKIP_R with overlapping alternatives caused catastrophic backtracking)
const INLINE_SKIP_R = '([\\s\\S]+?)'

//  ++Insert++
export const InsertRule: MarkdownToJSX.Rule<{
  children: MarkdownToJSX.ParserResult[]
}> = {
  match: simpleInlineRegex(new RegExp(`^(\\+\\+)${INLINE_SKIP_R}\\1`)),
  order: Priority.MED,
  parse: parseCaptureInline,
  render(node, output, state?) {
    return <ins key={state?.key}>{output(node.children, state!)}</ins>
  },
}
