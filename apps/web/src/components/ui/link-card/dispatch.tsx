'use client'

import { HostProvider } from '@yohaku/rich-content/host'
import { LinkCardVariant as PortableLinkCardVariant } from '@yohaku/rich-content/src/lexical/portable/link-card/dispatch.tsx'
import type { FC } from 'react'

import { useWebHost } from '~/hooks/common/use-web-host'
import type { EnrichmentResult } from '~/models/enrichment'

export { isPosterEnrichment } from '@yohaku/rich-content/src/lexical/portable/link-card/dispatch.tsx'

interface Props {
  className?: string
  data: EnrichmentResult
}

// The variants live in @yohaku/rich-content (single source shared with
// mobile). SelfCard reads site/webOrigin/interceptSelfLink from the host, so
// every render path — lexical body, markdown pipeline, thinking — gets its
// own provider here instead of relying on an ancestor LexicalContent.
export const LinkCardVariant: FC<Props> = ({ data, className }) => {
  const host = useWebHost()
  return (
    <HostProvider host={host}>
      <PortableLinkCardVariant className={className} data={data} />
    </HostProvider>
  )
}
