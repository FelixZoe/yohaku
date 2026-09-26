import type {
  HeaderCategoryNavItem,
  HeaderPageNavItem,
  HeaderPostPreview,
  NavPostsPayload,
} from '~/components/layout/header/internal/nav-menu-data'
import { apiClient } from '~/lib/request'

import { defineQuery } from '../helper'

export const mapNavigationPages = (pages: HeaderPageNavItem[]) =>
  [...pages].sort((a, b) => a.order - b.order)

export const buildNavPostsPayload = ({
  categories,
  requestedSlug,
  selectedCategory,
}: {
  categories: HeaderCategoryNavItem[]
  requestedSlug?: string | null
  selectedCategory: null | { children?: HeaderPostPreview[] }
}): NavPostsPayload => {
  const selectedSlug = requestedSlug || categories[0]?.slug || null

  return {
    categories,
    recentPosts: (selectedCategory?.children || []).slice(0, 4),
    selectedSlug,
  }
}

export const navigation = {
  pages: (locale: string) =>
    defineQuery({
      queryKey: ['navigation', 'pages', locale],
      queryFn: async () => {
        const data = await apiClient.page.getList(1, 50, {
          select: ['id', 'slug', 'title', 'order'],
        } as any)

        return mapNavigationPages(data.data as HeaderPageNavItem[])
      },
      staleTime: 1000 * 60 * 10,
    }),

  posts: (locale: string, slug?: string | null) =>
    defineQuery({
      queryKey: ['navigation', 'posts', locale, slug || null],
      queryFn: async ({ queryKey }) => {
        const [, , , slug] = queryKey as [string, string, string, string | null]
        const categoriesResult = await apiClient.category.getAllCategories()
        const categories = categoriesResult as HeaderCategoryNavItem[]
        const selectedSlug = slug || categories[0]?.slug || null

        const selectedCategory = selectedSlug
          ? await apiClient.category.getCategoryByIdOrSlug(selectedSlug)
          : null

        return buildNavPostsPayload({
          categories,
          requestedSlug: slug,
          selectedCategory: selectedCategory
            ? {
                children: (selectedCategory.children || []).map((child) => ({
                  ...child,
                  category: {
                    name: selectedCategory.name,
                    slug: selectedCategory.slug,
                  },
                })) as HeaderPostPreview[],
              }
            : null,
        })
      },
      staleTime: 1000 * 60 * 10,
    }),
}
