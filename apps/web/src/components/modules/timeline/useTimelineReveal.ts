'use client'

import type { Ref } from 'react'
import { useCallback } from 'react'

const STAGGER_CAP = 12
const STAGGER_STEP_MS = 30
const BATCH_WINDOW_MS = 80

let sharedObserver: IntersectionObserver | null = null
let batchCounter = 0
let batchTimer: ReturnType<typeof setTimeout> | null = null

const onBatchIdle = () => {
  batchCounter = 0
  batchTimer = null
}

const reveal = (target: HTMLElement) => {
  if (target.dataset.tlIn !== undefined) return
  const i = Math.min(batchCounter++, STAGGER_CAP)
  target.style.setProperty('--tl-i', String(i))
  target.dataset.tlIn = ''
  if (batchTimer) clearTimeout(batchTimer)
  batchTimer = setTimeout(onBatchIdle, BATCH_WINDOW_MS)
}

const ensureObserver = (): IntersectionObserver | null => {
  if (sharedObserver) return sharedObserver
  if (typeof IntersectionObserver === 'undefined') return null
  sharedObserver = new IntersectionObserver(
    (entries, io) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const target = entry.target as HTMLElement
        reveal(target)
        io.unobserve(target)
      }
    },
    { rootMargin: '0px 0px -2% 0px', threshold: 0 },
  )
  return sharedObserver
}

export const useTimelineReveal = <T extends HTMLElement>(): Ref<T> =>
  useCallback((el: T | null) => {
    if (!el) return
    if (el.dataset.tlIn !== undefined) return
    const rect = el.getBoundingClientRect()
    if (rect.bottom < 0) {
      el.dataset.tlIn = ''
      el.style.setProperty('--tl-i', '0')
      return
    }
    const io = ensureObserver()
    if (!io) {
      el.dataset.tlIn = ''
      return
    }
    io.observe(el)
    return () => io.unobserve(el)
  }, [])

export const STAGGER_DELAY_CAP_MS = STAGGER_CAP * STAGGER_STEP_MS
