'use client'

import { useLocale } from 'next-intl'

import { clsxm } from '~/lib/helper'

const EYEBROW = {
  recentWriting: 'Recent Writing',
  musings: 'Musings',
  letters: 'Letters',
} as const

export const SectionHeading = ({
  eyebrow,
  children,
}: {
  eyebrow: keyof typeof EYEBROW
  children: React.ReactNode
}) => {
  const locale = useLocale()
  const showEyebrow = locale !== 'en'

  return (
    <div className="mb-5 lg:mb-6">
      {showEyebrow && (
        <div className="text-caption-10 uppercase tracking-[1.5px] text-neutral-5">
          {EYEBROW[eyebrow]}
        </div>
      )}
      <h2
        className={clsxm(
          showEyebrow && 'mt-1.5',
          'font-serif text-title-20 tracking-[2px] text-neutral-7 lg:text-title-24',
        )}
      >
        {children}
      </h2>
    </div>
  )
}
