'use client'

import { useTranslations } from 'next-intl'
import { startTransition, useCallback, useEffect, useState } from 'react'

import { FABPortable } from '~/components/ui/fab'
import { useModalStack } from '~/components/ui/modal'
import { MAIN_CONTENT_ID } from '~/constants/dom-id'
import { DOMCustomEvents } from '~/constants/event'
import { useForceUpdate } from '~/hooks/common/use-force-update'

import { useTocHeadingStrategy } from './TocHeadingStrategy'
import { TocTree } from './TocTree'

export const TocFAB = () => {
  const t = useTranslations('common')
  const { present } = useModalStack()
  const [forceUpdate, updated] = useForceUpdate()
  const [headings, setHeadings] = useState<HTMLHeadingElement[] | undefined>()

  useEffect(() => {
    const handler = () => {
      startTransition(() => {
        forceUpdate()
      })
    }
    document.addEventListener(DOMCustomEvents.RefreshToc, handler)
    return () => {
      document.removeEventListener(DOMCustomEvents.RefreshToc, handler)
    }
  }, [forceUpdate])

  const queryHeadings = useTocHeadingStrategy()
  const refreshHeadings = useCallback(() => {
    const $mainContentRender = document.getElementById(MAIN_CONTENT_ID)
    if (!$mainContentRender) {
      setHeadings(undefined)
      return
    }

    setHeadings(queryHeadings($mainContentRender))
  }, [queryHeadings])

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      refreshHeadings()
    })

    return () => cancelAnimationFrame(frame)
  }, [refreshHeadings, updated])

  const presentToc = useCallback(() => {
    present({
      title: t('toc_title'),
      clickOutsideToDismiss: true,
      content: ({ dismiss }) => (
        <TocTree
          scrollInNextTick
          $headings={headings!}
          className="max-h-full space-y-3 overflow-y-auto [&>li]:py-1"
          grouping={false}
          onItemClick={() => {
            dismiss()
          }}
        />
      ),
    })
  }, [headings, present, t])

  if (!headings?.length) return null

  return (
    <FABPortable
      aria-label={t('aria_toc')}
      title={t('toc_title')}
      onClick={presentToc}
    >
      <i className="i-mingcute-list-expansion-line" />
    </FABPortable>
  )
}
