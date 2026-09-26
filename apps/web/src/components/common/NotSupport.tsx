'use client'

import { useTranslations } from 'next-intl'

import { EmptyIcon } from '~/components/icons/empty'
import { clsxm } from '~/lib/helper'

export const NotSupport: Component<{
  icon?: 'empty'
  text?: string
}> = ({ className, icon, text }) => {
  const t = useTranslations('common')
  return (
    <div
      className={clsxm(
        'flex min-h-[100px] items-center justify-center',
        className,
      )}
    >
      <div className="flex flex-col items-center gap-5 text-center">
        {icon === 'empty' ? (
          <div className="scale-[1.15] text-neutral-8 dark:text-neutral-3">
            <EmptyIcon />
          </div>
        ) : null}
        <div className="text-copy-16 font-medium">
          {text || t('not_support')}
        </div>
      </div>
    </div>
  )
}
