import type { ExtractAtomValue } from 'jotai'
import { useAtomValue } from 'jotai'
import { selectAtom } from 'jotai/utils'
import { useMemo } from 'react'

import { jotaiStore } from '~/lib/store'

import { viewportAtom } from '../viewport'

export const useViewport = <T>(
  selector: (value: ExtractAtomValue<typeof viewportAtom>) => T,
  deps: React.DependencyList = [],
): T => {
  const selectedAtom = useMemo(
     
    () => selectAtom(viewportAtom, selector),
    deps,
  )
  return useAtomValue(selectedAtom, { store: jotaiStore })
}

export const useIsMobile = () => useViewport(isMobile)

const isMobile = (v: ExtractAtomValue<typeof viewportAtom>) =>
  v.w !== 0 && v.w <= 1024
export const getViewport = () => jotaiStore.get(viewportAtom)

export const usePageScrollElement = () => document.documentElement
