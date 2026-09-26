import type { MouseEvent, ReactNode } from 'react'
import { createElement as h } from 'react'

const icon = (cls: string) => h('i', { className: cls })

export interface IHeaderMenu {
  description?: string
  descriptionKey?: string
  do?: (e?: MouseEvent<HTMLAnchorElement>) => void
  exclude?: string[]
  icon?: ReactNode
  path: string
  search?: Record<string, string>
  subMenu?: Omit<IHeaderMenu, 'exclude'>[]
  title: string
  titleKey?: string
  type?: string
}
export const headerMenuConfig: IHeaderMenu[] = [
  {
    title: 'Home',
    titleKey: 'nav_home',
    path: '/',
    type: 'Home',
    icon: icon('i-mingcute-home-4-line'),
    subMenu: [],
  },
  {
    title: 'Posts',
    titleKey: 'nav_posts',
    path: '/posts',
    type: 'Post',
    subMenu: [],
    icon: icon('i-mingcute-news-line'),
    do() {
      window.__POST_LIST_ANIMATED__ = true
    },
  },
  {
    title: 'Notes',
    titleKey: 'nav_notes',
    type: 'Note',
    path: '/notes',
    icon: icon('i-mingcute-quill-pen-line'),
    exclude: ['/notes/series'],
  },

  {
    title: 'Timeline',
    titleKey: 'nav_timeline',
    type: 'Timeline',
    icon: icon('i-mingcute-history-line'),
    path: '/timeline',
    subMenu: [
      {
        title: 'Notes',
        titleKey: 'nav_notes',
        icon: icon('i-mingcute-quill-pen-line'),
        path: '/timeline?type=note',
      },
      {
        title: 'Posts',
        titleKey: 'nav_posts',
        icon: icon('i-mingcute-book-2-line'),
        path: '/timeline?type=post',
      },
      {
        title: 'Memories',
        titleKey: 'nav_memories',
        icon: icon('i-mingcute-heart-fill'),
        path: '/timeline?memory=1',
      },
    ],
  },

  {
    title: 'Thinking',
    titleKey: 'nav_thinking',
    type: 'Thinking',
    icon: icon('i-mingcute-bulb-line'),
    path: '/thinking',
  },

  {
    title: 'More',
    titleKey: 'nav_more',
    type: 'More',
    icon: icon('i-mingcute-more-1-line'),
    path: '#',
    subMenu: [
      {
        title: 'Friends',
        titleKey: 'nav_friends',
        icon: icon('i-mingcute-group-line'),
        path: '/friends',
        descriptionKey: 'nav_friends_desc',
      },
      {
        title: 'Projects',
        titleKey: 'nav_projects',
        icon: icon('i-mingcute-flask-line'),
        path: '/projects',
        descriptionKey: 'nav_projects_desc',
      },
      {
        title: 'Quotes',
        titleKey: 'nav_says',
        path: '/says',
        icon: icon('i-mingcute-quote-left-line'),
        descriptionKey: 'nav_says_desc',
      },
      {
        title: 'Warp',
        titleKey: 'nav_travel',
        icon: icon('i-mingcute-planet-line'),
        path: 'https://travel.moe/go.html',
        descriptionKey: 'nav_travel_desc',
      },
    ],
  },
]
