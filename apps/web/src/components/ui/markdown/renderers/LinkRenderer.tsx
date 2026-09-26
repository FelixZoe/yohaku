'use client'

import { clsx } from 'clsx'
import type { FC, PropsWithChildren, ReactNode } from 'react'
import { useMemo } from 'react'

import { useLinkEmbed } from '~/components/ui/link-embed'

import { MarkdownLink } from '../../link/MarkdownLink'
import {
  isPosterEnrichment,
  LinkCardVariant,
  useLinkCardEnrichment,
} from '../../link-card'

export const BlockLinkRenderer = ({
  href,
  children,
  fallback,
  accessory,
}: PropsWithChildren<{
  href: string
  fallback?: ReactNode
  accessory?: ReactNode
}>) => {
  const fallbackElement = useMemo(
    () =>
      fallback ?? (
        <p>
          <MarkdownLink href={href}>
            {children ?? <span>{href}</span>}
          </MarkdownLink>
        </p>
      ),
    [children, fallback, href],
  )

  const embedNode = useLinkEmbed(href)

  if (embedNode) {
    return (
      <>
        {embedNode}
        {accessory}
      </>
    )
  }

  return (
    <ArticleLinkCard
      accessory={accessory}
      className={undefined}
      fallback={fallbackElement}
      url={href}
    />
  )
}

const ArticleLinkCard: FC<{
  url: string
  fallback?: ReactNode
  accessory?: ReactNode
  className?: string
}> = ({ url, fallback, accessory, className }) => {
  const result = useLinkCardEnrichment(url)
  // fallback may carry its own accessory (e.g. comment action group) — rendering ours too would duplicate it
  if (!result) return <>{fallback ?? null}</>
  const isPoster = isPosterEnrichment(result)
  return (
    <>
      <div
        className={clsx(
          'not-prose mx-auto w-full',
          !isPoster && 'max-w-[36rem]',
        )}
      >
        <LinkCardVariant className={className} data={result} />
      </div>
      {accessory}
    </>
  )
}
