'use client'

import type { AggregateRoot } from '@mx-space/api-client'
import { atom } from 'jotai'
import type { FC, PropsWithChildren } from 'react'
import { useEffect, useRef } from 'react'

import { setWebUrl } from '~/atoms'
import { useBeforeMounted } from '~/hooks/common/use-before-mounted'
import { createAtomSelector } from '~/lib/atom'
import { isDev } from '~/lib/env'
import { jotaiStore } from '~/lib/store'

export type { AggregateRoot }

export const aggregationDataAtom = atom<null | AggregateRoot>(null)
const appConfigAtom = atom<AppConfig | null>(null)
const useAggregationAtomSelector = createAtomSelector(aggregationDataAtom)
const useAppConfigAtomSelector = createAtomSelector(appConfigAtom)

export const AggregationProvider: FC<
  PropsWithChildren<{
    aggregationData: AggregateRoot
    appConfig: AppConfig
  }>
> = ({ children, aggregationData, appConfig }) => {
  useBeforeMounted(() => {
    if (!aggregationData) return
    jotaiStore.set(aggregationDataAtom, aggregationData)
    setWebUrl(aggregationData.url.webUrl)
  })
  useBeforeMounted(() => {
    if (!appConfig) return
    jotaiStore.set(appConfigAtom, appConfig)
  })
  useEffect(() => {
    if (!appConfig) return
    jotaiStore.set(appConfigAtom, appConfig)
  }, [appConfig])

  useEffect(() => {
    if (!aggregationData) return
    jotaiStore.set(aggregationDataAtom, aggregationData)
    setWebUrl(aggregationData.url.webUrl)
  }, [aggregationData])

  const callOnceRef = useRef(false)

  useEffect(() => {
    if (callOnceRef.current) return
    if (!aggregationData?.user) return
    callOnceRef.current = true
  }, [aggregationData?.user])

  return children
}

export const useAggregationSelector = <T,>(
  selector: (atomValue: AggregateRoot) => T,
  deps: any[] = [],
): T | null =>
  useAggregationAtomSelector(
    (atomValue) => (!atomValue ? null : selector(atomValue)),
    deps,
  )

export const useAppConfigSelector = <T,>(
  selector: (atomValue: AppConfig) => T,
  deps: any[] = [],
): T | null =>
  useAppConfigAtomSelector(
    (atomValue) => (!atomValue ? null : noThrowFnWrapper(selector)(atomValue)),
    deps,
  )

export const getAggregationData = () => jotaiStore.get(aggregationDataAtom)

export const getAppConfig = () => jotaiStore.get(appConfigAtom)

const noThrowFnWrapper = <Args extends unknown[], R>(
  fn: (...args: Args) => R,
): ((...args: Args) => R | null) => {
  return (...args: Args) => {
    try {
      return fn(...args)
    } catch (e: any) {
      if (isDev) {
        console.error(e)
      }
      return null
    }
  }
}
