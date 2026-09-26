'use client'

import { useLayoutEffect } from 'react'

import { YOHAKU_FLASH, YOHAKU_MOTION } from '../constants'
import type { YohakuState } from '../types'

function readDebugMultiplier(): number {
  if (typeof window === 'undefined') return 1
  try {
    const params = new URLSearchParams(window.location.search)
    const fromQuery = Number.parseFloat(params.get('yohaku_slow') ?? '')
    if (Number.isFinite(fromQuery) && fromQuery > 0) return fromQuery
    const fromStorage = Number.parseFloat(
      localStorage.getItem('yohaku.debug.slow') ?? '',
    )
    if (Number.isFinite(fromStorage) && fromStorage > 0) return fromStorage
  } catch {
    // ignore
  }
  return 1
}

export function useLayoutShift(state: YohakuState) {
  useLayoutEffect(() => {
    const root = document.documentElement
    const slow = readDebugMultiplier()
    const ms = (n: number) => `${Math.round(n * slow)}ms`
    const vars: Record<string, string> = {
      '--yohaku-anim-ms': ms(YOHAKU_MOTION.ANIM_MS),
      '--yohaku-main-shift-delay-ms': ms(YOHAKU_MOTION.MAIN_SHIFT_DELAY_MS),
      '--yohaku-note-slide-delay-ms': ms(YOHAKU_MOTION.NOTE_SLIDE_DELAY_MS),
      '--yohaku-note-content-delay-ms': ms(YOHAKU_MOTION.NOTE_CONTENT_DELAY_MS),
      '--yohaku-note-content-ms': ms(YOHAKU_MOTION.NOTE_CONTENT_MS),
      '--yohaku-exit-ms': ms(YOHAKU_MOTION.EXIT_MS),
      '--yohaku-exit-main-delay-ms': ms(YOHAKU_MOTION.EXIT_MAIN_DELAY_MS),
      '--yohaku-lift-y': `${YOHAKU_MOTION.LIFT_Y}px`,
      '--yohaku-side-opacity-reading': String(
        YOHAKU_MOTION.SIDE_OPACITY_READING,
      ),
      '--yohaku-side-fade-ms': ms(YOHAKU_MOTION.SIDE_FADE_MS),
      '--yohaku-ease-paper': YOHAKU_MOTION.EASE_PAPER,
      '--yohaku-flash-ms': ms(YOHAKU_FLASH.DURATION_MS),
      '--yohaku-flash-alpha': `${YOHAKU_FLASH.ALPHA}%`,
    }
    for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v)
  }, [])

  useLayoutEffect(() => {
    document.body.dataset.yohakuState = state
    if (state === 'idle') document.body.classList.remove('yohaku-open')
    else document.body.classList.add('yohaku-open')
    return () => {
      delete document.body.dataset.yohakuState
      document.body.classList.remove('yohaku-open')
    }
  }, [state])
}
