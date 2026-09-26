'use client'

import type { ReactNode, RefObject } from 'react'
import { createContext, use, useLayoutEffect, useMemo, useRef } from 'react'

import { useEscapeExit } from './hooks/useEscapeExit'
import { useLayoutShift } from './hooks/useLayoutShift'
import { usePostPanelW } from './hooks/usePostPanelW'
import { useYohakuPostLayout } from './hooks/useYohakuPostLayout'
import { YohakuDrawerPaper } from './YohakuDrawerPaper'
import {
  useYohakuActions,
  useYohakuState,
  YohakuProvider,
} from './YohakuProvider'
import { YohakuSheet } from './YohakuSheet'

interface ArticleRefCtx {
  articleRef: RefObject<HTMLElement | null>
}

const ArticleRefContext = createContext<ArticleRefCtx | null>(null)

export function useYohakuArticleRef() {
  const ctx = use(ArticleRefContext)
  return ctx?.articleRef
}

type YohakuArticleVariant = 'note' | 'post'

interface YohakuArticleShellProps {
  articleId: string
  children: ReactNode
  lang?: string
  variant: YohakuArticleVariant
}

export function YohakuArticleShell({
  variant,
  articleId,
  lang,
  children,
}: YohakuArticleShellProps) {
  const articleRef = useRef<HTMLElement | null>(null)
  const layoutModeRef = useRef<'split' | 'sheet' | null>('split')
  const refCtxValue = useMemo(() => ({ articleRef }), [])
  return (
    <YohakuProvider
      articleRootRef={articleRef}
      lang={lang ?? 'zh'}
      layoutModeRef={layoutModeRef}
      nid={articleId}
    >
      <ArticleRefContext value={refCtxValue}>
        {children}
        <YohakuIntegrations layoutModeRef={layoutModeRef} variant={variant} />
      </ArticleRefContext>
    </YohakuProvider>
  )
}

function YohakuIntegrations({
  variant,
  layoutModeRef,
}: {
  variant: YohakuArticleVariant
  layoutModeRef: RefObject<'split' | 'sheet' | null>
}) {
  const state = useYohakuState()
  const { close } = useYohakuActions()
  const layout = useYohakuPostLayout()
  layoutModeRef.current = layout.mode

  const { panelW, startResize } = usePostPanelW(layout.viewportW)

  useLayoutShift(state)
  useEscapeExit(state !== 'idle', close)

  useLayoutEffect(() => {
    return () => {
      const root = document.documentElement
      root.style.removeProperty('--yohaku-panel-w')
      root.style.removeProperty('--yohaku-drawer-w')
    }
  }, [])

  if (layout.mode === 'sheet') {
    return state === 'idle' ? null : <YohakuSheet paperW={0} />
  }
  return (
    <YohakuDrawerPaper
      panelW={panelW}
      startResize={startResize}
      variant={variant}
    />
  )
}
