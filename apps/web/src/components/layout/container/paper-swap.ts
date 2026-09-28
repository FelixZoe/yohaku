'use client'

import { flushSync } from 'react-dom'

const SWAP_NAME = 'paper-content'
const FEATHER_PX = 48
const WIPE_MS = 520
const WIPE_EASING = 'cubic-bezier(0.3, 0.6, 0.3, 1)'
const ARRIVAL_TIMEOUT_MS = 2500

let swapping = false
let onPaperMounted: ((content: HTMLElement) => void) | null = null

const findPaperContent = () =>
  document.querySelector<HTMLElement>(
    '.note-layout-main > [data-paper-content]',
  )

const canAnimate = () =>
  typeof document.startViewTransition === 'function' &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const isPaperSwapPending = () => swapping

export function notifyPaperMounted(root: HTMLElement) {
  const content = root.querySelector<HTMLElement>(
    '.note-layout-main > [data-paper-content]',
  )
  if (content) onPaperMounted?.(content)
}

function wipe(content: HTMLElement, previousHeight: number) {
  const { top } = content.getBoundingClientRect()
  const height = Math.max(content.offsetHeight, previousHeight)
  const from = Math.min(Math.max(0, -top), height)
  const to = Math.max(
    from,
    Math.min(height, window.innerHeight - top) + FEATHER_PX,
  )
  const keyframes = [
    { '--paper-swap': `${from}px` },
    { '--paper-swap': `${to}px` },
  ]

  return ['old', 'new'].map((image) =>
    document.documentElement.animate(keyframes, {
      duration: WIPE_MS,
      easing: WIPE_EASING,
      fill: 'both',
      pseudoElement: `::view-transition-${image}(${SWAP_NAME})`,
    }),
  )
}

function runSwap(update: () => void | Promise<void>) {
  const previous = findPaperContent()
  if (!previous || !canAnimate()) {
    void update()
    return
  }

  swapping = true
  const previousHeight = previous.offsetHeight
  previous.style.viewTransitionName = SWAP_NAME

  const transition = document.startViewTransition(async () => {
    previous.style.viewTransitionName = ''
    await update()
    const next = findPaperContent()
    if (next) next.style.viewTransitionName = SWAP_NAME
  })

  let wipes: Animation[] = []
  transition.ready
    .then(() => {
      const next = findPaperContent()
      if (next) wipes = wipe(next, previousHeight)
    })
    .catch(() => {})

  void transition.finished.finally(() => {
    wipes.forEach((animation) => animation.cancel())
    swapping = false
    const next = findPaperContent()
    if (next) next.style.viewTransitionName = ''
  })
}

export function swapPaperContentInPlace(update: () => void) {
  runSwap(() => flushSync(update))
}

export function swapPaperContentAcrossRoute(navigate: () => void) {
  const previous = findPaperContent()
  if (!previous) return false

  runSwap(
    () =>
      new Promise<void>((resolve) => {
        const settle = () => {
          clearTimeout(timer)
          onPaperMounted = null
          resolve()
        }
        const timer = setTimeout(settle, ARRIVAL_TIMEOUT_MS)
        onPaperMounted = (content) => {
          // Rendering is paused inside a view transition update, so rAF never
          // fires here; a macrotask lets the new paper's children commit.
          if (content !== previous) setTimeout(settle, 0)
        }
        navigate()
      }),
  )
  return true
}
