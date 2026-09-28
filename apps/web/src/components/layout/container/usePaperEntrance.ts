'use client'

import type { RefObject } from 'react'
import { useLayoutEffect, useState } from 'react'

import { isHydrationEnded } from '~/components/common/HydrationEndDetector'

import { isPaperSwapPending, notifyPaperMounted } from './paper-swap'

const PAPER_SHIFT_DURATION_MS = 460
const PAPER_STACK_DELAY_MS = 40
const PAPER_STACK_STAGGER_MS = 40
const PAPER_STACK_DURATION_MS = 420
const PAPER_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)'

const FLAT_POSE = 'translateZ(0) translateX(0) translateY(0) rotate(0deg)'
const NEAREST_BACK_POSE =
  'translateZ(-8px) translateX(18px) translateY(5px) rotate(2.5deg)'
const DEEPEST_BACK_POSE =
  'translateZ(-26px) translateX(16px) translateY(8px) rotate(2.4deg)'

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

type Rider = {
  el: HTMLElement
  willChange: string
  transformOrigin: string
}

export function usePaperEntrance(ref: RefObject<HTMLElement | null>) {
  const [skipAnimation] = useState(
    () => !isHydrationEnded() || isPaperSwapPending(),
  )

  useLayoutEffect(() => {
    const el = ref.current
    if (el) notifyPaperMounted(el)
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
    const content = el.querySelector<HTMLElement>(
      '.note-layout-main > [data-paper-content]',
    )
    const stackFinalPoses = stackLayers.map((layer) => layer.style.transform)
    const frontStartPose = stackFinalPoses.at(-1) || NEAREST_BACK_POSE

    const riders: Rider[] = [frontSheet, content]
      .filter((node): node is HTMLElement => !!node)
      .map((node) => ({
        el: node,
        willChange: node.style.willChange,
        transformOrigin: node.style.transformOrigin,
      }))
    const previousStackWillChange = stackLayers.map(
      (layer) => layer.style.willChange,
    )
    const animations: Animation[] = []
    const shiftTiming: KeyframeAnimationOptions = {
      duration: PAPER_SHIFT_DURATION_MS,
      easing: PAPER_EASING,
      fill: 'both',
    }

    riders.forEach(({ el: node }) => {
      node.style.transformOrigin = 'top left'
      node.style.willChange = 'transform'
    })

    if (frontSheet) {
      const finalShadow = getComputedStyle(frontSheet).boxShadow
      const isDark =
        document.documentElement.dataset.theme === 'dark' ||
        document.body.dataset.theme === 'dark'

      animations.push(
        frontSheet.animate(
          [
            {
              transform: frontStartPose,
              boxShadow: airbornePaperShadow(isDark),
            },
            { transform: FLAT_POSE, boxShadow: finalShadow },
          ],
          shiftTiming,
        ),
      )
    }

    if (content) {
      animations.push(
        content.animate(
          [{ transform: frontStartPose }, { transform: FLAT_POSE }],
          shiftTiming,
        ),
      )
    }

    stackLayers.forEach((layer, index) => {
      layer.style.willChange = 'transform, opacity'

      animations.push(
        layer.animate(
          [
            {
              opacity: index === 0 ? 0 : 1,
              transform:
                index === 0 ? DEEPEST_BACK_POSE : stackFinalPoses[index - 1],
            },
            { opacity: 1, transform: stackFinalPoses[index] },
          ],
          {
            delay: PAPER_STACK_DELAY_MS + index * PAPER_STACK_STAGGER_MS,
            duration: PAPER_STACK_DURATION_MS,
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
      riders.forEach(({ el: node, willChange, transformOrigin }) => {
        node.style.willChange = willChange
        node.style.transformOrigin = transformOrigin
      })
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
