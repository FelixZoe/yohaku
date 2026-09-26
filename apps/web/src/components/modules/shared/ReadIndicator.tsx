'use client'

import { AnimatePresence, m } from 'motion/react'
import { useTranslations } from 'next-intl'
import type { ElementType } from 'react'
import { useDeferredValue } from 'react'
import { useInView } from 'react-intersection-observer'

import { useIsMobile } from '~/atoms/hooks/viewport'
import {
  CircleProgress,
  MaterialSymbolsProgressActivity,
} from '~/components/icons/Progress'
import { MotionButtonBase } from '~/components/ui/button'
import { RootPortal } from '~/components/ui/portal'
import { IconSmoothTransition } from '~/components/ui/transition'
import { useReadPercent } from '~/hooks/shared/use-read-percent'
import { clsxm } from '~/lib/helper'
import { springScrollToTop } from '~/lib/scroller'
import { useIsEoFWrappedElement } from '~/providers/shared/WrappedElementProvider'

export const ReadIndicator: Component<{
  as?: ElementType
}> = ({ className, as }) => {
  const t = useTranslations('common')
  const readPercent = useReadPercent()
  const As = as || 'span'

  const { ref, inView } = useInView()

  return (
    <As className={clsxm('text-neutral-8', className)} ref={ref}>
      <div className="px-2">
        <div className="relative pl-4">
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-0 flex size-4 -translate-x-2 -translate-y-1/2 items-center justify-start"
          >
            <IconSmoothTransition
              currentState={readPercent !== 0 ? 'regular' : 'solid'}
              solidIcon={<MaterialSymbolsProgressActivity />}
              regularIcon={
                <CircleProgress
                  percent={readPercent}
                  size={14}
                  strokeWidth={2}
                />
              }
            />
          </span>
          {readPercent}%<br />
        </div>
        <MotionButtonBase
          className={clsxm(
            'relative mt-1 flex w-full flex-nowrap items-center pl-4 opacity-50 transition-all duration-500 hover:opacity-100',
            readPercent > 10 ? '' : 'pointer-events-none opacity-0',
          )}
          onClick={springScrollToTop}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-0 flex size-4 -translate-x-2 -translate-y-1/2 items-center justify-start"
          >
            <i className="i-mingcute-arrow-up-circle-line" />
          </span>
          <span className="whitespace-nowrap">{t('back_to_top')}</span>
        </MotionButtonBase>
      </div>
      {!inView && <ReadIndicatorVertical className="right-px" />}
    </As>
  )
}

export const ReadIndicatorCompact: Component<{
  as?: ElementType
}> = ({ className, as }) => {
  const t = useTranslations('common')
  const readPercent = useReadPercent()
  const As = as || 'div'

  const { ref, inView } = useInView()

  return (
    <As className={clsxm('text-neutral-8', className)} ref={ref}>
      <div className="flex min-h-7 items-center justify-between gap-2">
        <div className="relative min-w-0 flex-1 pl-4 text-copy-15">
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-0 flex size-4 -translate-x-2 -translate-y-1/2 items-center justify-start"
          >
            <IconSmoothTransition
              currentState={readPercent !== 0 ? 'regular' : 'solid'}
              solidIcon={<MaterialSymbolsProgressActivity />}
              regularIcon={
                <CircleProgress
                  percent={readPercent}
                  size={14}
                  strokeWidth={2}
                />
              }
            />
          </span>
          <span>{readPercent}%</span>
        </div>

        <div className="relative size-7 shrink-0">
          <AnimatePresence initial={false}>
            {readPercent > 10 && (
              <m.div
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0"
                exit={{ opacity: 0, scale: 0.92 }}
                initial={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.18, ease: 'easeInOut' }}
              >
                <MotionButtonBase
                  aria-label={t('back_to_top')}
                  className="center flex size-7 rounded-md text-neutral-5 transition-colors duration-200 hover:bg-black/[0.02] hover:text-neutral-9 dark:hover:bg-white/4"
                  title={t('back_to_top')}
                  onClick={springScrollToTop}
                >
                  <i className="i-mingcute-arrow-up-circle-line text-copy-14" />
                </MotionButtonBase>
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      {!inView && <ReadIndicatorVertical className="right-px" />}
    </As>
  )
}

const ReadIndicatorVertical: Component = ({ className }) => {
  const readPercent = useDeferredValue(useReadPercent())
  const isEOA = useIsEoFWrappedElement()

  // TODO new API ScrollTimeline but safari not support
  // const wrappedElement = useWrappedElement()
  // const timeline = new ScrollTimeline({
  //   source: wrappedElement,
  //   axis: "block",
  // });
  return (
    <RootPortal>
      <div
        data-hide-print
        className={clsxm(
          'fixed inset-y-0 right-0 z-[99] w-px transition-opacity duration-200 ease-in-out',
          isEOA ? 'opacity-0' : 'opacity-100',
          className,
        )}
      >
        <div
          className="absolute top-0 w-full bg-accent/80 duration-75 ease-linear"
          style={{
            height: `${readPercent}%`,
          }}
        />
      </div>
    </RootPortal>
  )
}
export const ReadIndicatorForMobile: Component = () => {
  const isMobile = useIsMobile()
  if (!isMobile) return null

  return <ReadIndicatorVertical />
}
