import { PageColorGradient } from '~/components/common/PageColorGradient'
import { CategoryHero } from '~/components/modules/category/CategoryHero'
import { CategoryRowList } from '~/components/modules/category/CategoryRowList'
import { EmptyCategoryState } from '~/components/modules/category/EmptyCategoryState'
import { PinnedFeatureBlock } from '~/components/modules/category/PinnedFeatureBlock'
import { SubTagChips } from '~/components/modules/category/SubTagChips'
import { BackToTop } from '~/components/ui/back-to-top/BackToTop'
import { BottomToUpSoftSpringTransitionView } from '~/components/ui/transition'
import { tagGlossaryPairsOf } from '~/lib/api/tag-glossary'
import { definePrerenderPage } from '~/lib/request.server'

import { getData } from './api'

export default definePrerenderPage<{ slug: string; locale: string }>()({
  fetcher(params) {
    return getData({ slug: params.slug })
  },

  Component: async ({ data, params: { slug } }) => {
    const { name, count, children, tagsSum } = data
    const tagGlossary = tagGlossaryPairsOf(data.$meta)

    const pinnedPost = children[0]?.pinAt ? children[0] : null
    const rest = pinnedPost ? children.slice(1) : children

    const years = children
      .map((c) => new Date(c.createdAt).getFullYear())
      .filter((y) => Number.isFinite(y))
    const earliestYear = years.length > 0 ? Math.min(...years) : undefined
    const multiYear = new Set(years).size >= 2

    const hasContent = pinnedPost !== null || rest.length > 0

    return (
      <>
        <PageColorGradient seed={`category|${slug}`} />
        <BottomToUpSoftSpringTransitionView>
          <CategoryHero
            count={count ?? 0}
            earliestYear={earliestYear}
            name={name}
          />
        </BottomToUpSoftSpringTransitionView>

        {pinnedPost ? (
          <BottomToUpSoftSpringTransitionView delay={60}>
            <PinnedFeatureBlock categorySlug={slug} post={pinnedPost} />
          </BottomToUpSoftSpringTransitionView>
        ) : null}

        {rest.length > 0 ? (
          <CategoryRowList
            categorySlug={slug}
            groupByYear={multiYear}
            items={rest}
            showCategorySource={false}
            tagGlossary={tagGlossary}
          />
        ) : !pinnedPost ? (
          <EmptyCategoryState />
        ) : null}

        {tagsSum && tagsSum.length > 0 ? (
          <SubTagChips tagGlossary={tagGlossary} tags={tagsSum} />
        ) : null}

        {hasContent ? <BackToTop /> : null}
      </>
    )
  },
})
