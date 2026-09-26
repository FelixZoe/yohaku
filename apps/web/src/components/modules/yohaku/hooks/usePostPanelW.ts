'use client'

import type { PointerEvent as ReactPointerEvent } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { YOHAKU_POST_LAYOUT } from '../constants'

const clamp = (lo: number, v: number, hi: number) =>
  Math.min(hi, Math.max(lo, v))

function getMaxW(viewportW: number) {
  return Math.min(
    YOHAKU_POST_LAYOUT.PANEL_W_MAX_PX,
    viewportW * YOHAKU_POST_LAYOUT.PANEL_W_MAX_VW_RATIO,
  )
}

function getDefaultW(viewportW: number) {
  const target = Math.min(
    YOHAKU_POST_LAYOUT.PANEL_W_PREFERRED_PX,
    viewportW * YOHAKU_POST_LAYOUT.PANEL_W_PREFERRED_VW_RATIO,
  )
  return clamp(YOHAKU_POST_LAYOUT.PANEL_W_MIN, target, getMaxW(viewportW))
}

function readStored(): number | null {
  try {
    const raw = localStorage.getItem(YOHAKU_POST_LAYOUT.STORAGE_KEY)
    if (!raw) return null
    const num = Number.parseFloat(raw)
    return Number.isFinite(num) && num > 0 ? num : null
  } catch {
    return null
  }
}

function writeStored(w: number) {
  try {
    localStorage.setItem(YOHAKU_POST_LAYOUT.STORAGE_KEY, String(w))
  } catch {
    // ignore quota / privacy mode failures
  }
}

/**
 * Owns the post drawer's resizable width.
 *
 * Committed value lives in React state. During an active drag we bypass
 * React: pointer events write straight to the `--yohaku-panel-w` /
 * `--yohaku-drawer-w` custom properties on the document root so the drawer
 * and layout slot track the cursor without re-rendering. On pointer release
 * we commit once and persist to localStorage.
 */
export function usePostPanelW(viewportW: number) {
  const [panelW, setPanelW] = useState<number>(() => {
    if (typeof window === 'undefined') {
      return YOHAKU_POST_LAYOUT.PANEL_W_PREFERRED_PX
    }
    const stored = readStored()
    const max = getMaxW(window.innerWidth)
    return stored !== null
      ? clamp(YOHAKU_POST_LAYOUT.PANEL_W_MIN, stored, max)
      : getDefaultW(window.innerWidth)
  })

  const draftRef = useRef(panelW)
  useEffect(() => {
    draftRef.current = panelW
  }, [panelW])

  // Re-clamp when viewport shrinks below the previously persisted width.
  useEffect(() => {
    setPanelW((prev) =>
      clamp(YOHAKU_POST_LAYOUT.PANEL_W_MIN, prev, getMaxW(viewportW)),
    )
  }, [viewportW])

  const startResize = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()

    const root = document.documentElement
    root.dataset.yohakuDragging = '1'

    const startX = e.clientX
    const startW = draftRef.current

    const apply = (next: number) => {
      draftRef.current = next
      root.style.setProperty('--yohaku-drawer-w', `${next}px`)
      root.style.setProperty('--yohaku-panel-w', `${next}px`)
    }

    const onMove = (ev: PointerEvent) => {
      const dx = startX - ev.clientX
      const next = clamp(
        YOHAKU_POST_LAYOUT.PANEL_W_MIN,
        startW + dx,
        getMaxW(window.innerWidth),
      )
      apply(next)
    }

    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      delete root.dataset.yohakuDragging
      const finalW = draftRef.current
      writeStored(finalW)
      setPanelW(finalW)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }, [])

  return { panelW, startResize }
}
