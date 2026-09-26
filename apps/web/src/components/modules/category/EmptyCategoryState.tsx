import { useTranslations } from 'next-intl'

import { EmptyIcon } from '~/components/icons/empty'

export const EmptyCategoryState = () => {
  const t = useTranslations('post')

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="text-neutral-10/30">
        <EmptyIcon />
      </div>
      <div className="h-px w-8 bg-accent/40" />
      <p className="text-copy-13 text-neutral-10/55">{t('category_empty')}</p>
    </div>
  )
}
