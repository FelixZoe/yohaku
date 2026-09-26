'use client'

import { useTranslations } from 'next-intl'

import { EmptyIcon } from '~/components/icons/empty'
import { NormalContainer } from '~/components/layout/container/Normal'

export const NothingFound: Component = () => {
  const t = useTranslations('common')

  return (
    <NormalContainer className="center flex h-[500px] flex-col text-center">
      <EmptyIcon />
      <div className="mt-5 space-y-4 [&_p]:m-0">
        <p>{t('empty_nothing')}</p>
        <p>{t('empty_comeback')}</p>
      </div>
    </NormalContainer>
  )
}
