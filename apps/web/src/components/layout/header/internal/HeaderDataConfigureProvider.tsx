'use client'

import type { AggregateTop, NoteModel } from '@mx-space/api-client'
import { useQuery } from '@tanstack/react-query'
import type { Atom } from 'jotai'
import { atom, useAtomValue, useSetAtom } from 'jotai'
import { useLocale } from 'next-intl'
import { createContext, use, useCallback, useEffect, useState } from 'react'

import { apiClient } from '~/lib/request'
import { useAppConfigSelector } from '~/providers/root/aggregation-data-provider'
import { navigation } from '~/queries/definition/navigation'

import type { IHeaderMenu } from '../config'
import { headerMenuConfig as baseHeaderMenuConfig } from '../config'
import type { HeaderCategoryNavItem } from './nav-menu-data'
import { applyDynamicHeaderMenuData } from './nav-menu-data'
import { getRecentNotesQueryOptions } from './recent-notes-query'

type MenuType = 'Home' | 'Post' | 'Note' | 'Timeline'

type RecentNoteFields = Pick<NoteModel, 'nid' | 'title' | 'createdAt' | 'slug'>

interface HeaderConfigContextValue {
  categoriesAtom: Atom<HeaderCategoryNavItem[] | null>
  configAtom: Atom<IHeaderMenu[]>
  ensureMenuData: (type: MenuType) => void
  recentNotesAtom: Atom<RecentNoteFields[] | null>
  topDataAtom: Atom<AggregateTop | null>
  topicsAtom: Atom<{ slug: string; name: string; icon?: string }[] | null>
}

const HeaderMenuConfigContext = createContext<HeaderConfigContextValue>(
  null as any,
)

export const useHeaderConfig = () => use(HeaderMenuConfigContext)

export const useHeaderConfigValue = <
  K extends keyof Omit<HeaderConfigContextValue, 'ensureMenuData'>,
>(
  key: K,
) => {
  const ctx = useHeaderConfig()
  return useAtomValue(ctx[key])
}

export const HeaderDataConfigureProvider: Component = ({ children }) => {
  const locale = useLocale()
  const postListViewMode = useAppConfigSelector(
    (appConfig) => appConfig.module?.posts?.mode,
  )
  const [shouldLoadHomeMenu, setShouldLoadHomeMenu] = useState(false)
  const [shouldLoadPostMenu, setShouldLoadPostMenu] = useState(false)
  const [shouldLoadNoteMenu, setShouldLoadNoteMenu] = useState(false)
  const [shouldLoadTimelineMenu, setShouldLoadTimelineMenu] = useState(false)

  const [atoms] = useState(() => ({
    configAtom: atom<IHeaderMenu[]>(baseHeaderMenuConfig),
    categoriesAtom: atom<HeaderCategoryNavItem[] | null>(null),
    topicsAtom: atom<{ slug: string; name: string; icon?: string }[] | null>(
      null,
    ),
    recentNotesAtom: atom<RecentNoteFields[] | null>(null),
    topDataAtom: atom<AggregateTop | null>(null),
  }))

  const { data: pages } = useQuery({
    ...navigation.pages(locale),
    enabled: shouldLoadHomeMenu,
  })

  const { data: postMenuData } = useQuery({
    ...navigation.posts(locale),
    enabled: shouldLoadPostMenu,
  })

  const { data: topicsData } = useQuery({
    queryKey: ['nav-topics'],
    queryFn: async () => {
      const data = await apiClient.topic.getAll()
      return data.$serialized as {
        slug: string
        name: string
        icon?: string
      }[]
    },
    staleTime: 1000 * 60 * 10,
    enabled: shouldLoadNoteMenu,
  })

  const { data: noteListData } = useQuery({
    ...getRecentNotesQueryOptions(locale, apiClient),
    enabled: shouldLoadNoteMenu,
  })

  const { data: topData } = useQuery({
    queryKey: ['nav-top'],
    queryFn: async () =>
      (await apiClient.aggregate.getTop(5)).$serialized as AggregateTop,
    staleTime: 1000 * 60 * 5,
    enabled: shouldLoadTimelineMenu,
  })

  const categories = postMenuData?.categories || null
  const topics = topicsData || null
  const recentNotes =
    (noteListData?.data as RecentNoteFields[] | undefined) || null

  const setConfig = useSetAtom(atoms.configAtom)
  const setCategories = useSetAtom(atoms.categoriesAtom)
  const setTopics = useSetAtom(atoms.topicsAtom)
  const setRecentNotes = useSetAtom(atoms.recentNotesAtom)
  const setTopData = useSetAtom(atoms.topDataAtom)

  useEffect(() => {
    setConfig(
      applyDynamicHeaderMenuData(baseHeaderMenuConfig, {
        categories,
        pages,
        postListViewMode,
      }),
    )
  }, [categories, pages, postListViewMode, setConfig])

  useEffect(() => {
    setCategories(categories)
  }, [categories, setCategories])

  useEffect(() => {
    setTopics(topics)
  }, [topics, setTopics])

  useEffect(() => {
    setRecentNotes(recentNotes)
  }, [recentNotes, setRecentNotes])

  useEffect(() => {
    setTopData(topData || null)
  }, [topData, setTopData])

  const ensureMenuData = useCallback((type: MenuType) => {
    switch (type) {
      case 'Home': {
        setShouldLoadHomeMenu(true)
        break
      }
      case 'Post': {
        setShouldLoadPostMenu(true)
        break
      }
      case 'Note': {
        setShouldLoadNoteMenu(true)
        break
      }
      case 'Timeline': {
        setShouldLoadTimelineMenu(true)
        break
      }
    }
  }, [])

  const [ctxValue] = useState(() => ({
    ...atoms,
    ensureMenuData,
  }))

  return (
    <HeaderMenuConfigContext value={ctxValue}>
      {children}
    </HeaderMenuConfigContext>
  )
}
