'use client'

import type { Image } from '@mx-space/api-client'
import { useQuery } from '@tanstack/react-query'
import { useLocale, useTranslations } from 'next-intl'
import type { PropsWithChildren } from 'react'
import { Fragment, useMemo } from 'react'

import { useFocusReading } from '~/atoms/hooks/reading'
import { GoToAdminEditingButton } from '~/components/modules/shared/GoToAdminEditingButton'
import { WithArticleSelectionAction } from '~/components/modules/shared/WithArticleSelectionAction'
import { Link } from '~/i18n/navigation'
import { noopArr } from '~/lib/noop'
import { LexicalImageRecordProvider } from '~/providers/article/LexicalImageRecordProvider'
import { MarkdownImageRecordProvider } from '~/providers/article/MarkdownImageRecordProvider'
import { useCurrentPageDataSelector } from '~/providers/page/CurrentPageDataProvider'
import { navigation } from '~/queries/definition/navigation'

import FullPageLoading from './loading'

export const PageLoading: Component = ({ children }) => {
  const id = useCurrentPageDataSelector((p) => p?.id)

  if (!id) {
    return <FullPageLoading />
  }

  return children
}

export const FocusReadingEffect = () => {
  useFocusReading()
  return null
}

export const MarkdownImageRecordProviderInternal = (
  props: PropsWithChildren,
) => {
  const images = useCurrentPageDataSelector(
    (data) => data?.images || (noopArr as Image[]),
  )
  const lexicalContent = useCurrentPageDataSelector((data) =>
    data?.contentFormat === 'lexical' ? data.content : undefined,
  )
  if (!images) return null

  return (
    <MarkdownImageRecordProvider images={images}>
      <LexicalImageRecordProvider content={lexicalContent}>
        {props.children}
      </LexicalImageRecordProvider>
    </MarkdownImageRecordProvider>
  )
}

export const PageSubTitle = () => {
  const subtitle = useCurrentPageDataSelector((data) => data?.subtitle)
  return (
    <p className="text-center text-copy-16 mt-4 text-neutral-7 lg:text-left">
      {subtitle}
    </p>
  )
}
export const PageTitle = () => {
  const title = useCurrentPageDataSelector((data) => data?.title)
  const id = useCurrentPageDataSelector((data) => data?.id)
  return (
    <>
      <h1 className="text-balance text-center text-display-36 font-bold leading-tight lg:text-left">
        {title}
      </h1>
      <GoToAdminEditingButton
        className="absolute -top-6 right-0"
        id={id!}
        type="pages"
      />
    </>
  )
}

export const PagePaginator = () => {
  const locale = useLocale()
  const t = useTranslations('note')
  const currentPageTitle = useCurrentPageDataSelector((d) => d?.title)
  const { data: navigationPages } = useQuery(navigation.pages(locale))
  const pages = useMemo(() => navigationPages || [], [navigationPages])
  const indexInPages = pages.findIndex((i) => i.title === currentPageTitle)
  const n = pages.length
  const hasNext = indexInPages + 1 < n
  const hasPrev = indexInPages - 1 >= 0
  return (
    <div
      data-hide-print
      className="relative mt-8 grid h-20 select-none grid-cols-2"
    >
      <div className="justify-start">
        {hasPrev && (
          <Fragment>
            <Link
              className="flex flex-col justify-end text-left leading-loose"
              href={`/${pages[indexInPages - 1].slug}`}
            >
              <span className="text-accent">{t('look_back')}</span>
              <span>{pages[indexInPages - 1].title}</span>
            </Link>
          </Fragment>
        )}
      </div>
      <div className="justify-end">
        {hasNext && (
          <Fragment>
            <Link
              className="flex flex-col justify-end text-right leading-loose"
              href={`/${pages[indexInPages + 1].slug}`}
            >
              <span className="text-accent">{t('continue_reading')}</span>
              <span>{pages[indexInPages + 1].title}</span>
            </Link>
          </Fragment>
        )}
      </div>
    </div>
  )
}

export const MarkdownSelection: Component = (props) => {
  const id = useCurrentPageDataSelector((data) => data?.id)!
  const title = useCurrentPageDataSelector((data) => data?.title)!
  const canComment = true
  const contentFormat = useCurrentPageDataSelector(
    (data) => data?.contentFormat,
  )
  const content = useCurrentPageDataSelector((data) => data?.content)
  return (
    <WithArticleSelectionAction
      canComment={canComment}
      content={contentFormat === 'lexical' ? (content ?? undefined) : undefined}
      contentFormat={contentFormat}
      refId={id}
      title={title}
    >
      {props.children}
    </WithArticleSelectionAction>
  )
}
