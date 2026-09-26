'use client'

import { useTranslations } from 'next-intl'
import type { FC, ReactNode } from 'react'
import { memo } from 'react'

import { AISummary } from '~/components/modules/ai/Summary'
import { clsxm } from '~/lib/helper'

interface SummarySwitcherProps {
  action?: ReactNode
  aiSummary?: string
  className?: string
  summary?: string
  variant?: 'standalone' | 'inline'
}

export const SummarySwitcher: FC<SummarySwitcherProps> = memo((props) => {
  const {
    aiSummary,
    summary,
    variant = 'standalone',
    action,
    className,
  } = props

  if (summary && summary.trim().length > 0) {
    return (
      <ManualSummary
        action={action}
        className={clsxm(variant === 'standalone' ? 'my-4' : '', className)}
        summary={summary}
        variant={variant}
      />
    )
  }

  if (!aiSummary || aiSummary.trim().length === 0) return null

  return (
    <div className={clsxm(variant === 'standalone' ? 'my-4' : '', className)}>
      <AISummary action={action} summary={aiSummary} variant={variant} />
    </div>
  )
})

SummarySwitcher.displayName = 'SummarySwitcher'

const ManualSummary: Component<{
  summary: string
  variant?: 'standalone' | 'inline'
  action?: ReactNode
}> = ({ className, summary, variant = 'standalone', action }) => {
  const t = useTranslations('common')

  if (variant === 'inline') {
    return (
      <div
        className={clsxm(
          'text-copy-13 leading-[1.9] text-neutral-7',
          className,
        )}
      >
        {summary}
      </div>
    )
  }

  return (
    <div
      className={clsxm(
        'space-y-2 rounded-xl border border-neutral-3 p-4',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center">
          <i className="i-mingcute-sparkles-line mr-2 text-copy-16" />
          {t('summary_label')}
        </div>
        {action}
      </div>
      <div className="m-0! text-copy-13 leading-loose text-neutral-9/95">
        {summary}
      </div>
    </div>
  )
}
