import { PageColorGradient } from '~/components/common/PageColorGradient'
import { CategoryCrossChips } from '~/components/modules/category/CategoryCrossChips'
import { CategoryRowList } from '~/components/modules/category/CategoryRowList'
import { TagHero } from '~/components/modules/category/TagHero'
import { BackToTop } from '~/components/ui/back-to-top/BackToTop'
import { BottomToUpSoftSpringTransitionView } from '~/components/ui/transition'
import { createTagLabeler, tagGlossaryPairsOf } from '~/lib/api/tag-glossary'
import { apiClient } from '~/lib/request'
import { definePrerenderPage } from '~/lib/request.server'

export default definePrerenderPage<{
  name: string
  locale: string
}>()({
  async fetcher({ name }) {
    const res = await apiClient.category.getTagByName(name)
    return { posts: res.data, tagGlossary: tagGlossaryPairsOf(res.$meta) }
  },
  async Component({ data: { posts, tagGlossary }, params: { name } }) {
    const label = createTagLabeler(tagGlossary)(name)
    const sorted = [...posts].sort(
      (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
    )

    const categoryMap = new Map<
      string,
      { slug: string; name: string; count: number }
    >()
    for (const post of sorted) {
      const slug = post.category.slug
      const existing = categoryMap.get(slug)
      if (existing) existing.count += 1
      else
        categoryMap.set(slug, {
          slug,
          name: post.category.name,
          count: 1,
        })
    }
    const counts = [...categoryMap.values()].sort((a, b) => b.count - a.count)
    const M = counts.length

    const years = sorted
      .map((p) => new Date(p.createdAt).getFullYear())
      .filter((y) => Number.isFinite(y))
    const multiYear = new Set(years).size >= 2

    return (
      <>
        <PageColorGradient seed={`tag|${name}`} />
        <BottomToUpSoftSpringTransitionView>
          <TagHero
            count={posts.length}
            crossCategoryCount={M}
            label={label}
            name={name}
          />
        </BottomToUpSoftSpringTransitionView>

        <CategoryRowList
          showCategorySource
          groupByYear={multiYear}
          items={sorted.map((p) => ({
            id: p.id,
            title: p.title,
            slug: p.slug,
            createdAt: p.createdAt,
            tags: p.tags,
            category: { name: p.category.name, slug: p.category.slug },
          }))}
        />

        <CategoryCrossChips counts={counts} />

        <BackToTop />
      </>
    )
  },
})
