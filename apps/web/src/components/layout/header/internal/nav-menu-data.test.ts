import { describe, expect, it } from 'vitest'

import { headerMenuConfig } from '../config'
import {
  applyDynamicHeaderMenuData,
  type HeaderCategoryNavItem,
  type HeaderPageNavItem,
} from './nav-menu-data'

const pages: HeaderPageNavItem[] = [
  {
    id: 'page-about',
    slug: 'about',
    title: 'About',
    order: 1,
  },
]

const categories: HeaderCategoryNavItem[] = [
  {
    id: 'cat-dev',
    slug: 'dev',
    name: 'Dev',
    count: 12,
  },
]

describe('applyDynamicHeaderMenuData', () => {
  it('hydrates home and post sub menus from remote data', () => {
    const result = applyDynamicHeaderMenuData(headerMenuConfig, {
      categories,
      pages,
    })

    expect(result.find((item) => item.type === 'Home')?.subMenu).toEqual([
      {
        path: '/about',
        title: 'About',
      },
    ])

    expect(result.find((item) => item.type === 'Post')?.subMenu).toEqual([
      {
        path: '/categories/dev',
        title: 'Dev',
      },
    ])
  })

  it('preserves existing search settings when post list mode is injected', () => {
    const result = applyDynamicHeaderMenuData(headerMenuConfig, {
      categories,
      pages,
      postListViewMode: 'grid',
    })

    expect(result.find((item) => item.type === 'Post')?.search).toEqual({
      view_mode: 'grid',
    })
  })
})
