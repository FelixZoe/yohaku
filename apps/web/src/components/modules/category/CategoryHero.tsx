import { useTranslations } from 'next-intl'

import { HeroFrame } from './HeroFrame'

interface CategoryHeroProps {
  /** Total post count under this category. */
  count: number
  /** Earliest post year — used to render "since YYYY" subtitle when applicable. */
  earliestYear?: number
  /** Category display name. */
  name: string
}

export const CategoryHero = ({
  count,
  name,
  earliestYear,
}: CategoryHeroProps) => {
  const t = useTranslations('post')
  const currentYear = new Date().getFullYear()
  const showYear =
    typeof earliestYear === 'number' && earliestYear < currentYear && count > 1

  const subtitle = showYear
    ? t('category_subtitle_with_year', { count, year: earliestYear })
    : t('category_subtitle_count_only', { count })

  return (
    <HeroFrame
      count={count}
      label={t('category_label')}
      subtitle={subtitle}
      title={name}
    />
  )
}
