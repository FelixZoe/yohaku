import type { MarkdownVariant } from '~/components/ui/markdown'
import { Markdown } from '~/components/ui/markdown'

import { YohakuImage } from './YohakuImage'
import { YohakuRefAnchor } from './YohakuRefAnchor'

type YohakuContentVariant = Extract<MarkdownVariant, 'yohaku' | 'yohaku-note'>

function stripMetaTrailer(md: string): string {
  return md.replaceAll(/<!--\s*insights-meta:.*?-->/gs, '').trimEnd()
}

export function YohakuContent({
  markdown,
  variant = 'yohaku',
}: {
  markdown: string
  variant?: YohakuContentVariant
}) {
  const clean = stripMetaTrailer(markdown)
  return (
    <Markdown
      overrides={{ ref: YohakuRefAnchor, img: YohakuImage }}
      removeWrapper={false}
      value={clean}
      variant={variant}
    />
  )
}
