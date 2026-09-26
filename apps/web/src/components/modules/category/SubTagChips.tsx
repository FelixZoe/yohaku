import { useTranslations } from 'next-intl'

import { Link } from '~/i18n/navigation'
import { createTagLabeler, type TagGlossaryPair } from '~/lib/api/tag-glossary'
import { routeBuilder, Routes } from '~/lib/route-builder'

interface SubTagChipsProps {
  tagGlossary?: TagGlossaryPair[]
  tags: Array<{ name: string; count: number }>
}

export const SubTagChips = ({ tags, tagGlossary }: SubTagChipsProps) => {
  const t = useTranslations('post')
  if (!tags.length) return null
  const labelTag = createTagLabeler(tagGlossary)

  return (
    <section className="mt-7 border-t border-neutral-10/[0.06] pt-4">
      <div className="mb-2.5 text-caption-10 tracking-[3px] uppercase text-neutral-10/55">
        {t('category_sub_tags_label')}
      </div>
      <ul className="flex flex-wrap gap-1.5 list-none p-0">
        {tags.map((tag) => (
          <li key={tag.name}>
            <Link
              className="inline-flex items-baseline rounded-full bg-neutral-2 px-2.5 py-0.5 text-label-12 text-neutral-10/65 transition-colors duration-150 hover:bg-accent/[0.08] hover:text-accent"
              href={routeBuilder(Routes.Tag, { name: tag.name })}
            >
              <span>#{labelTag(tag.name)}</span>
              <span className="ml-1 text-neutral-10/40">{tag.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
