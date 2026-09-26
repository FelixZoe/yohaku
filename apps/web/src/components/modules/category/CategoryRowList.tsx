'use client'

import { useLocale } from 'next-intl'
import { useEffect, useMemo, useRef } from 'react'

import { createTagLabeler, type TagGlossaryPair } from '~/lib/api/tag-glossary'

import type { CategoryRowMode } from './CategoryRow'
import { CategoryRow } from './CategoryRow'
import { YearAnchor } from './YearAnchor'

interface CategoryRowItem {
  category?: { name: string; slug: string }
  createdAt: string
  id: string
  slug: string
  tags?: string[]
  title: string
}

interface CategoryRowListProps {
  /** Used to build /posts/<categorySlug>/<postSlug>. Required when showCategorySource is false (category page). When showCategorySource is true, each item carries its own category. */
  categorySlug?: string
  /**
   * When true, group items by year and render `YearAnchor`s.
   * Caller decides — typically when there are >= 2 distinct years.
   */
  groupByYear: boolean
  items: CategoryRowItem[]
  /** Show source category in each row (tag page). Otherwise show post tags (category page). */
  showCategorySource: boolean
  tagGlossary?: TagGlossaryPair[]
}

const STAGGER_CAP = 20

export const CategoryRowList = ({
  items,
  groupByYear,
  showCategorySource,
  categorySlug,
  tagGlossary,
}: CategoryRowListProps) => {
  const locale = useLocale()
  const labelTag = useMemo(() => createTagLabeler(tagGlossary), [tagGlossary])
  const ulRef = useRef<HTMLUListElement>(null)

  const grouped = useMemo(() => {
    if (!groupByYear) return null
    const map = new Map<number, CategoryRowItem[]>()
    for (const item of items) {
      const year = new Date(item.createdAt).getFullYear()
      const bucket = map.get(year)
      if (bucket) bucket.push(item)
      else map.set(year, [item])
    }
    return [...map.entries()].sort(([a], [b]) => b - a)
  }, [items, groupByYear])

  useEffect(() => {
    const root = ulRef.current
    if (!root) return
    const lis = root.querySelectorAll<HTMLLIElement>(':scope > li')
    lis.forEach((li, idx) => {
      const capped = Math.min(idx, STAGGER_CAP)
      li.style.setProperty('--li-index', String(capped))
    })
  }, [items, groupByYear])

  const buildMode = (item: CategoryRowItem): CategoryRowMode =>
    showCategorySource
      ? {
          kind: 'tag',
          category: item.category ?? { name: '', slug: '' },
        }
      : { kind: 'category', tags: item.tags, labelTag }

  const resolveCategorySlug = (item: CategoryRowItem) =>
    showCategorySource ? (item.category?.slug ?? '') : (categorySlug ?? '')

  const showYearOnRow = !groupByYear

  return (
    <ul className="yohaku-category-list min-w-0" ref={ulRef}>
      {groupByYear && grouped
        ? grouped.flatMap(([year, yearItems]) => [
            <YearAnchor
              count={yearItems.length}
              key={`year-${year}`}
              year={year}
            />,
            ...yearItems.map((item) => (
              <CategoryRow
                categorySlug={resolveCategorySlug(item)}
                key={item.id}
                locale={locale}
                mode={buildMode(item)}
                post={item}
                showYear={showYearOnRow}
              />
            )),
          ])
        : items.map((item) => (
            <CategoryRow
              categorySlug={resolveCategorySlug(item)}
              key={item.id}
              locale={locale}
              mode={buildMode(item)}
              post={item}
              showYear={showYearOnRow}
            />
          ))}
    </ul>
  )
}
