'use client'

import { useTranslations } from 'next-intl'
import type { FC, ReactNode } from 'react'
import { memo } from 'react'

import { Markdown } from '~/components/ui/markdown'
import { clsxm } from '~/lib/helper'

export interface AiSummaryProps {
  action?: ReactNode
  className?: string
  summary: string
  variant?: 'standalone' | 'inline'
}

export const AISummary: FC<AiSummaryProps> = memo((props) => {
  const { summary, variant = 'standalone', action, className } = props
  if (variant === 'inline') {
    return <InlineSummaryContainer className={className} summary={summary} />
  }
  return (
    <SummaryContainer action={action} className={className} summary={summary} />
  )
})

AISummary.displayName = 'AISummary'

// --- Inline variant (for NoticeCard) ---

const InlineSummaryContainer: Component<{
  summary: string
}> = (props) => {
  const { className, summary } = props

  return (
    <div
      data-hide-print
      className={clsxm('text-copy-13 leading-[1.9] text-neutral-7', className)}
      style={{ textAutospace: 'normal' }}
    >
      <Markdown disableParsingRawHTML removeWrapper>
        {summary}
      </Markdown>
    </div>
  )
}

// --- Standalone variant (existing ribbon style) ---

const SummaryContainer: Component<{
  summary: string
  action?: ReactNode
}> = (props) => {
  const { className, summary, action } = props
  const t = useTranslations('common')

  return (
    <div
      data-hide-print
      className={clsxm(
        'relative my-8 -mx-4 lg:-mx-8 overflow-hidden -mb-36',
        '[mask-image:linear-gradient(to_right,black_calc(100%-2rem),transparent)]',
        className,
      )}
    >
      <div className="relative -skew-x-2 transform bg-gradient-to-b from-accent/10 via-accent/5 to-transparent px-8 py-6 pb-32 transition-all duration-300">
        <div className="skew-x-2 transform">
          <div className="absolute right-8 top-3 flex items-center gap-2 text-label-12 text-neutral-9/50">
            <span className="size-2 animate-pulse rounded-full bg-accent/60" />
            <span className="font-mono">AI·GEN</span>
          </div>
          <div className="max-w-4xl pt-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-copy-14 font-medium leading-tight text-accent">
                <i className="i-mingcute-ai-fill text-copy-16" />
                {t('ai_key_insights')}
              </h3>
              {action}
            </div>
            <div
              className="space-y-2 text-copy-13 leading-relaxed text-neutral-9/90"
              style={{ textAutospace: 'normal' }}
            >
              <Markdown disableParsingRawHTML removeWrapper>
                {summary}
              </Markdown>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
