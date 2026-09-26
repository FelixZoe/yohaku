'use client'

import { createAtomsContext } from 'jojoo/react'
import { atom, useStore } from 'jotai'
import type { ReactNode, RefObject } from 'react'
import { createContext, use, useEffect, useMemo, useRef } from 'react'

import { apiClient } from '~/lib/request'
import { springScrollToElement } from '~/lib/scroller'

import {
  YOHAKU_FLASH,
  YOHAKU_MOTION,
  YOHAKU_REF,
  YOHAKU_SCROLL,
} from './constants'
import { flashRange } from './flash'
import { extractMeta } from './parser/extractMeta'
import { locateQuoteRange } from './parser/extractRefs'
import type { RefTarget, YohakuMeta, YohakuState } from './types'

// ---- atoms bundled via jojoo: value changes fan out per-key, actions stay in a separate stable context ----
const [YohakuAtomsProvider, [useYohakuAtoms, useYohakuAtomValue]] =
  createAtomsContext({
    data: atom(''),
    error: atom<Error | null>(null),
    hasFetched: atom(false),
    loading: atom(false),
    meta: atom<YohakuMeta | null>(null),
    nid: atom(''),
    state: atom<YohakuState>('idle'),
  })

interface YohakuActions {
  anchor: (target: RefTarget) => void
  close: () => void
  dropPaper: () => void
  liftPaper: () => void
  open: () => Promise<void>
  reload: () => Promise<void>
  toggle: () => Promise<void>
}

const YohakuActionsContext = createContext<YohakuActions | null>(null)

interface YohakuProviderProps {
  articleRootRef?: RefObject<HTMLElement | null>
  children: ReactNode
  lang: string
  layoutModeRef?: RefObject<'split' | 'sheet' | null>
  nid: string
}

export function YohakuProvider(props: YohakuProviderProps) {
  return (
    <YohakuAtomsProvider>
      <YohakuActionsProvider {...props} />
    </YohakuAtomsProvider>
  )
}

function YohakuActionsProvider({
  nid,
  lang,
  articleRootRef,
  layoutModeRef,
  children,
}: YohakuProviderProps) {
  const store = useStore()
  const atoms = useYohakuAtoms()

  useEffect(() => {
    store.set(atoms.nid, nid)
  }, [nid, store, atoms])

  useEffect(() => {
    return () => {
      store.set(atoms.state, 'idle')
      store.set(atoms.data, '')
      store.set(atoms.meta, null)
      store.set(atoms.loading, false)
      store.set(atoms.error, null)
      store.set(atoms.hasFetched, false)
      store.set(atoms.nid, '')
    }
  }, [store, atoms])

  const inflightRef = useRef(false)
  const closingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const actions = useMemo<YohakuActions>(() => {
    const clearClosingTimer = () => {
      if (closingTimerRef.current) {
        clearTimeout(closingTimerRef.current)
        closingTimerRef.current = null
      }
    }

    const fetchInsights = async () => {
      if (inflightRef.current) return
      inflightRef.current = true
      store.set(atoms.loading, true)
      store.set(atoms.error, null)
      try {
        const result = await apiClient.ai.getInsights({
          articleId: store.get(atoms.nid),
          lang,
        })
        if (result?.content) {
          store.set(atoms.data, result.content)
          store.set(atoms.meta, extractMeta(result.content))
        }
        store.set(atoms.hasFetched, true)
      } catch (e) {
        store.set(atoms.error, e instanceof Error ? e : new Error(String(e)))
      } finally {
        store.set(atoms.loading, false)
        inflightRef.current = false
      }
    }

    const open = async () => {
      clearClosingTimer()
      const prev = store.get(atoms.state)
      if (prev === 'idle' || prev === 'closing') {
        store.set(atoms.state, 'reading')
      }
      if (!store.get(atoms.hasFetched)) await fetchInsights()
    }

    const close = () => {
      if (closingTimerRef.current) return
      const isSheet = layoutModeRef?.current === 'sheet'
      const prefersReduced =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (isSheet || prefersReduced) {
        store.set(atoms.state, 'idle')
        return
      }
      store.set(atoms.state, 'closing')
      // Read the live CSS var so JS timing follows any debug-slow multiplier
      // applied by `useLayoutShift`. Falls back to the constant.
      const cssExitMs = Number.parseFloat(
        typeof window !== 'undefined'
          ? getComputedStyle(document.documentElement).getPropertyValue(
              '--yohaku-exit-ms',
            )
          : '',
      )
      const exitMs =
        Number.isFinite(cssExitMs) && cssExitMs > 0
          ? cssExitMs
          : YOHAKU_MOTION.EXIT_MS
      closingTimerRef.current = setTimeout(() => {
        store.set(atoms.state, 'idle')
        closingTimerRef.current = null
      }, exitMs)
    }

    const toggle = async () => {
      if (store.get(atoms.state) === 'idle') await open()
      else close()
    }

    const reload = async () => {
      store.set(atoms.data, '')
      store.set(atoms.meta, null)
      store.set(atoms.hasFetched, false)
      await fetchInsights()
    }

    const runScroll = (target: RefTarget) => {
      const root = articleRootRef?.current ?? null
      if (!root) return
      const range = locateQuoteRange(root, target.quote)
      if (!range) {
        console.warn(
          '[yohaku] ref quote not found:',
          target.quote.slice(0, YOHAKU_REF.QUOTE_WARN_PREVIEW_CHARS),
        )
        return
      }
      const flash = flashRange(range, YOHAKU_FLASH.DURATION_MS)
      const anchorEl =
        flash?.anchorEl ??
        (range.startContainer.nodeType === Node.ELEMENT_NODE
          ? (range.startContainer as HTMLElement)
          : (range.startContainer.parentElement as HTMLElement | null))
      if (anchorEl) {
        springScrollToElement(anchorEl, YOHAKU_SCROLL.ELEMENT_OFFSET)
      }
    }

    const anchor = (target: RefTarget) => {
      clearClosingTimer()
      const isSheet = layoutModeRef?.current === 'sheet'
      if (isSheet) {
        store.set(atoms.state, 'idle')
        requestAnimationFrame(() => runScroll(target))
        return
      }
      store.set(atoms.state, 'anchored')
      runScroll(target)
    }

    const liftPaper = () => {
      store.set(atoms.state, 'anchored')
    }

    const dropPaper = () => {
      store.set(atoms.state, 'reading')
    }

    return { anchor, close, dropPaper, liftPaper, open, reload, toggle }
  }, [store, atoms, lang, articleRootRef, layoutModeRef])

  return <YohakuActionsContext value={actions}>{children}</YohakuActionsContext>
}

// ---- granular read hooks (each subscribes to a single atom) ----
export const useYohakuState = () => useYohakuAtomValue('state')
export const useYohakuData = () => useYohakuAtomValue('data')
export const useYohakuMeta = () => useYohakuAtomValue('meta')
export const useYohakuLoading = () => useYohakuAtomValue('loading')
export const useYohakuError = () => useYohakuAtomValue('error')
export const useYohakuNid = () => useYohakuAtomValue('nid')

export function useYohakuActions(): YohakuActions {
  const ctx = use(YohakuActionsContext)
  if (!ctx) {
    throw new Error('useYohakuActions must be used inside <YohakuProvider>')
  }
  return ctx
}

export function useYohakuActionsOptional(): YohakuActions | null {
  return use(YohakuActionsContext)
}
