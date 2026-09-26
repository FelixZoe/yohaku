'use client'

import { m } from 'motion/react'

import { ErrorBoundary } from '~/components/common/ErrorBoundary'

import { useHomeQueryData } from '../useHomeQueryData'
import { BottomSection } from './BottomSection'
import { RecentWriting } from './RecentWriting'

const EASING = [0.22, 1, 0.36, 1] as const

const rise = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-12%' as const },
  transition: { duration: 0.5, ease: EASING, delay },
})

export const SecondScreen = () => {
  const { notes, posts } = useHomeQueryData()
  const hasWriting = (notes?.length ?? 0) + (posts?.length ?? 0) > 0

  return (
    <section className="mx-auto mt-10 max-w-[1400px] px-4 font-serif lg:px-12">
      {hasWriting ? (
        <div className="grid grid-cols-1 gap-y-12 lg:grid-cols-[1.6fr_1fr]">
          <m.div className="lg:pr-10" {...rise(0)}>
            <RecentWriting />
          </m.div>
          <m.div
            className="lg:border-l lg:border-border lg:pl-10"
            {...rise(0.12)}
          >
            <ErrorBoundary variant="inline">
              <BottomSection />
            </ErrorBoundary>
          </m.div>
        </div>
      ) : (
        <m.div {...rise(0)}>
          <ErrorBoundary variant="inline">
            <BottomSection />
          </ErrorBoundary>
        </m.div>
      )}
    </section>
  )
}
