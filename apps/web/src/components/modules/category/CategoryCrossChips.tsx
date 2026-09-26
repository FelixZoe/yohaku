import { useTranslations } from 'next-intl'

import { Link } from '~/i18n/navigation'
import { routeBuilder, Routes } from '~/lib/route-builder'

interface CategoryCrossChipsProps {
  counts: Array<{ slug: string; name: string; count: number }>
}

export const CategoryCrossChips = ({ counts }: CategoryCrossChipsProps) => {
  const t = useTranslations('post')
  if (counts.length < 2) return null

  return (
    <section className="mt-7 border-t border-neutral-10/[0.06] pt-4">
      <div className="mb-2.5 text-caption-10 tracking-[3px] uppercase text-neutral-10/55">
        {t('tag_cross_categories_label')}
      </div>
      <ul className="flex flex-wrap gap-1.5 list-none p-0">
        {counts.map((c) => (
          <li key={c.slug}>
            <Link
              className="inline-flex items-baseline rounded-full bg-neutral-2 px-2.5 py-0.5 text-label-12 text-neutral-10/65 transition-colors duration-150 hover:bg-accent/[0.08] hover:text-accent"
              href={routeBuilder(Routes.Category, { slug: c.slug })}
            >
              <span>{c.name}</span>
              <span className="ml-1 text-neutral-10/40">{c.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
