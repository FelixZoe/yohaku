'use client'

import type { Image } from '@mx-space/api-client'
import type { QueryClient } from '@tanstack/react-query'
import { useQueryClient } from '@tanstack/react-query'
import { useLocale } from 'next-intl'
import type { FC } from 'react'
import { useEffect, useMemo, useRef } from 'react'

import { appStaticConfig } from '~/app.static.config'
import { withClientOnly } from '~/components/common/ClientOnly'
import { logger } from '~/lib/logger'
import { MarkdownImageRecordProvider as ArticleMarkdownImageRecordProvider } from '~/providers/article/MarkdownImageRecordProvider'

import { WithArticleSelectionAction } from './WithArticleSelectionAction'

export const MarkdownImageRecordProvider: Component<{
  images: Image[]
}> = ({ children, images }) => (
  <ArticleMarkdownImageRecordProvider images={images}>
    {children}
  </ArticleMarkdownImageRecordProvider>
)

export const MarkdownSelection: Component<{
  refId: string
  title: string
  canComment: boolean
  contentFormat?: string
  content?: string | null
  translationLang?: string | null
}> = ({
  children,
  canComment,
  content,
  contentFormat,
  refId,
  title,
  translationLang,
}) => (
  <WithArticleSelectionAction
    canComment={canComment}
    content={contentFormat === 'lexical' ? (content ?? undefined) : undefined}
    contentFormat={contentFormat}
    refId={refId}
    title={title}
    translationLang={translationLang}
  >
    {children}
  </WithArticleSelectionAction>
)

export const DataReValidate: FC<{
  fetchedAt: string
  enabled: boolean
  fetchData: (locale: string, queryClient: QueryClient) => Promise<unknown>
  onData: (data: unknown) => void
  logMessage: string
}> = withClientOnly(({ enabled, fetchedAt, fetchData, logMessage, onData }) => {
  const isOutdated = useMemo(
    () =>
      Date.now() - new Date(fetchedAt).getTime() > appStaticConfig.revalidate,
    [fetchedAt],
  )
  const locale = useLocale()
  const onceRef = useRef(false)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (onceRef.current) return

    onceRef.current = true
    if (!isOutdated) return

    if (!enabled) return

    fetchData(locale, queryClient).then((data) => {
      onData(data)
      logger.log(logMessage, data)
    })
  }, [enabled, fetchData, isOutdated, locale, logMessage, onData, queryClient])
  return null
})
