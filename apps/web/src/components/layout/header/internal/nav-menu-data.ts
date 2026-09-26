import type { IHeaderMenu } from '../config'

export interface HeaderPageNavItem {
  id: string
  order: number
  slug: string
  title: string
}

export interface HeaderCategoryNavItem {
  count: number
  id: string
  name: string
  slug: string
}

export interface HeaderPostPreview {
  category: {
    name: string
    slug: string
  }
  createdAt: string
  id: string
  slug: string
  title: string
}

export interface NavPostsPayload {
  categories: HeaderCategoryNavItem[]
  recentPosts: HeaderPostPreview[]
  selectedSlug: null | string
}

const cloneHeaderMenuConfig = (items: IHeaderMenu[]): IHeaderMenu[] =>
  items.map((item) => ({
    ...item,
    icon: item.icon,
    titleKey: item.titleKey,
    search: item.search ? { ...item.search } : undefined,
    exclude: item.exclude ? [...item.exclude] : undefined,
    subMenu: item.subMenu ? cloneHeaderMenuConfig(item.subMenu) : undefined,
  }))

const toHomeSubMenu = (items: HeaderPageNavItem[]) =>
  [...items]
    .sort((a, b) => a.order - b.order)
    .map((item) => ({
      path: `/${item.slug}`,
      title: item.title,
    }))

const toPostSubMenu = (items: HeaderCategoryNavItem[]) =>
  items.map((item) => ({
    path: `/categories/${item.slug}`,
    title: item.name,
  }))

export const applyDynamicHeaderMenuData = (
  baseConfig: IHeaderMenu[],
  {
    categories,
    pages,
    postListViewMode,
  }: {
    categories?: HeaderCategoryNavItem[] | null
    pages?: HeaderPageNavItem[] | null
    postListViewMode?: string | null
  },
) => {
  const nextMenuConfig = cloneHeaderMenuConfig(baseConfig)

  const homeIndex = nextMenuConfig.findIndex((item) => item.type === 'Home')
  if (homeIndex !== -1 && pages) {
    nextMenuConfig[homeIndex].subMenu = toHomeSubMenu(pages)
  }

  const postIndex = nextMenuConfig.findIndex((item) => item.type === 'Post')
  if (postIndex !== -1) {
    if (categories) {
      nextMenuConfig[postIndex].subMenu = toPostSubMenu(categories)
    }

    if (postListViewMode) {
      nextMenuConfig[postIndex] = {
        ...nextMenuConfig[postIndex],
        search: {
          ...nextMenuConfig[postIndex].search,
          view_mode: postListViewMode,
        },
      }
    }
  }

  return nextMenuConfig
}
