'use client'

import { useTranslations } from 'next-intl'

export const Spoiler: React.FC<{
  children: React.ReactNode
  key?: React.Key
}> = ({ children, key }) => {
  const t = useTranslations('common')
  return (
    <del className="spoiler" key={key} title={t('spoiler_title')}>
      {children}
    </del>
  )
}
