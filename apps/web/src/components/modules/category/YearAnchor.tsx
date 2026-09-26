import { useTranslations } from 'next-intl'

interface YearAnchorProps {
  count: number
  year: number
}

export const YearAnchor = ({ year, count }: YearAnchorProps) => {
  const t = useTranslations('common')

  return (
    <li className="flex items-baseline gap-2.5 pt-5 pb-2 first:pt-1 list-none">
      <span className="text-title-28 font-extralight tracking-tight leading-none text-neutral-10/30 tabular-nums">
        {year}
      </span>
      <span className="text-caption-10 tracking-wider text-neutral-10/35">
        {t('entries_count', { count })}
      </span>
    </li>
  )
}
