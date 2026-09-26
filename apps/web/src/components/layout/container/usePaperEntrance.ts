'use client'

import type { RefObject } from 'react'
import { useLayoutEffect, useState } from 'react'

import { isHydrationEnded } from '~/components/common/HydrationEndDetector'

const PAPER_UNFOLD_DURATION_MS = 390
const PAPER_STACK_DELAY_MS = 110
const PAPER_STACK_STAGGER_MS = 60
const PAPER_STACK_DURATION_MS = 340
const PAPER_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)'

const paperUnfoldKeyframes: Keyframe[] = [
  {
    offset: 0,
    opacity: 0.62,
    transform: 'perspective(1400px) rotateX(-4deg) scaleY(0.965)',
  },
  {
    offset: 0.7,
    opacity: 1,
    transform: 'perspective(1400px) rotateX(-0.35deg) scaleY(0.997)',
  },
  {
    offset: 1,
    opacity: 1,
    transform: 'perspective(1400px) rotateX(0deg) scaleY(1)',
  },
]

function airbornePaperShadow(isDark: boolean) {
  return isDark
    ? [
        '0 0 0 0.5px rgba(255,255,255,0.02)',
        '0 4px 12px 0 rgba(0,0,0,0.12)',
        '0 12px 28px 0 rgba(0,0,0,0.16)',
        '0 24px 54px -8px rgba(0,0,0,0.2)',
      ].join(', ')
    : [
        '0 0 0 0.5px rgba(0,0,0,0)',
        '0 4px 12px 0 rgba(0,0,0,0.035)',
        '0 12px 28px 0 rgba(0,0,0,0.05)',
        '0 24px 54px -8px rgba(0,0,0,0.08)',
      ].join(', ')
}

export function usePaperEntrance(ref: RefObject<HTMLElement | null>) {
  const [skipAnimation] = useState(() => !isHydrationEnded())

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || skipAnimation) return

    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    if (prefersReduced) return

    const stackLayers = Array.from(
      el.querySelectorAll<HTMLElement>('[data-paper-stack-layer]'),
    )
    const frontSheet = el.querySelector<HTMLElement>(
      '.note-layout-main > .paper-sheet-deckle',
    )
    const animations: Animation[] = []

    const previousFrontWillChange = frontSheet?.style.willChange
    const previousFrontTransformOrigin = frontSheet?.style.transformOrigin
    const previousStackWillChange = stackLayers.map(
      (layer) => layer.style.willChange,
    )

    if (frontSheet) {
      const finalShadow = getComputedStyle(frontSheet).boxShadow
      const isDark =
        document.documentElement.dataset.theme === 'dark' ||
        document.body.dataset.theme === 'dark'

      frontSheet.style.transformOrigin = 'top center'
      frontSheet.style.willChange = 'transform, opacity'

      animations.push(
        frontSheet.animate(
          paperUnfoldKeyframes.map((keyframe, index) => ({
            ...keyframe,
            boxShadow: index === 0 ? airbornePaperShadow(isDark) : finalShadow,
          })),
          {
            duration: PAPER_UNFOLD_DURATION_MS,
            easing: PAPER_EASING,
            fill: 'both',
          },
        ),
      )
    }

    stackLayers.forEach((layer, index) => {
      const finalTransform = layer.style.transform
      layer.style.willChange = 'transform, opacity'

      animations.push(
        layer.animate(
          [
            {
              opacity: index === 0 ? 0.82 : 0.75,
              transform:
                'translateZ(-1px) translateX(0px) translateY(0px) rotate(0deg)',
            },
            {
              opacity: 1,
              transform: finalTransform,
            },
          ],
          {
            delay: PAPER_STACK_DELAY_MS + index * PAPER_STACK_STAGGER_MS,
            duration: PAPER_STACK_DURATION_MS + index * 20,
            easing: PAPER_EASING,
            fill: 'both',
          },
        ),
      )
    })

    let released = false
    const release = () => {
      if (released) return
      released = true

      animations.forEach((animation) => animation.cancel())
      if (frontSheet) {
        frontSheet.style.willChange = previousFrontWillChange ?? ''
        frontSheet.style.transformOrigin = previousFrontTransformOrigin ?? ''
      }
      stackLayers.forEach((layer, index) => {
        layer.style.willChange = previousStackWillChange[index]
      })
    }

    void Promise.all(
      animations.map((animation) => animation.finished.catch(() => undefined)),
    ).then(release)

    return release
  }, [ref, skipAnimation])
}
