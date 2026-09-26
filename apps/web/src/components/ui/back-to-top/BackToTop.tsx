'use client'

import { useTranslations } from 'next-intl'

import { MotionButtonBase } from '~/components/ui/button'
import { springScrollToTop } from '~/lib/scroller'

export const BackToTop = () => {
  const t = useTranslations('common')

  return (
    <div className="mt-10 flex justify-center border-t border-black/[0.06] pt-6 dark:border-white/[0.06]">
      <MotionButtonBase
        className="inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-copy-13 text-neutral-10/55 transition-colors duration-200 hover:bg-black/[0.02] hover:text-neutral-10/85 dark:hover:bg-white/4"
        onClick={springScrollToTop}
      >
        <i className="i-mingcute-arrow-up-circle-line text-copy-14 opacity-70" />
        <span>{t('back_to_top')}</span>
      </MotionButtonBase>
    </div>
  )
}
