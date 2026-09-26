'use client'

import type { FC, ReactNode } from 'react'
import { memo } from 'react'

import { InlineLinkAnchor } from '~/components/ui/link-card/InlineLinkAnchor'

import { Favicon } from '../rich-link/Favicon'

export const MarkdownLink: FC<{
  href: string
  title?: string
  children?: ReactNode
  noIcon?: boolean
}> = memo(({ href, children, title, noIcon = false }) => {
  return (
    <span className="inline items-center font-sans">
      {!noIcon && <Favicon href={href} noIcon={noIcon} />}
      <InlineLinkAnchor
        className="yohaku-link--underline"
        href={href}
        rel="noreferrer"
        target="_blank"
        title={title}
      >
        {children}
      </InlineLinkAnchor>
    </span>
  )
})
MarkdownLink.displayName = 'MarkdownLink'
