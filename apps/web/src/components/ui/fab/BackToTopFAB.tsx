'use client'

import { useTranslations } from 'next-intl'

import { useViewport } from '~/atoms/hooks/viewport'
import { springScrollToTop } from '~/lib/scroller'
import { usePageScrollLocationSelector } from '~/providers/root/page-scroll-info-provider'

import { FABPortable } from './FABContainer'

export const BackToTopFAB = () => {
  const t = useTranslations('common')
  const windowHeight = useViewport((v) => v.h)
  const shouldShow = usePageScrollLocationSelector(
    (scrollTop) => scrollTop > windowHeight / 5,
    [windowHeight],
  )

  return (
    <FABPortable
      aria-label={t('back_to_top')}
      show={shouldShow}
      title={t('back_to_top')}
      onClick={springScrollToTop}
    >
      <i className="i-mingcute-arow-to-up-line" />
    </FABPortable>
  )
}
