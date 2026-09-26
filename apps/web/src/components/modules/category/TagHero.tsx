import { useTranslations } from 'next-intl'

import { HeroFrame } from './HeroFrame'

interface TagHeroProps {
  /** Number of posts associated with this tag. */
  count: number
  /** Number of distinct categories these posts span. */
  crossCategoryCount: number
  label?: string
  /** Tag name (no leading #). */
  name: string
}

export const TagHero = ({
  count,
  name,
  label,
  crossCategoryCount,
}: TagHeroProps) => {
  const t = useTranslations('post')

  const subtitle =
    crossCategoryCount >= 2
      ? t('tag_subtitle_with_cross', { count, crossCategoryCount })
      : t('tag_subtitle_count_only', { count })

  return (
    <HeroFrame
      count={count}
      label={t('tag_label')}
      subtitle={subtitle}
      title={
        <span className="inline-flex items-baseline gap-1">
          <span className="font-extralight text-accent">#</span>
          <span>{label ?? name}</span>
        </span>
      }
    />
  )
}
