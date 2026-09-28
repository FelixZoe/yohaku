'use client'

import type { ReactNode, RefObject } from 'react'
import { useEffect, useLayoutEffect, useRef } from 'react'

import { Paper } from '~/components/layout/container/Paper'

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

const INK_PLATE = 'color-mix(in oklch, var(--color-accent) 55%, transparent)'

function airborneShadow() {
  const dark = document.documentElement.dataset.theme === 'dark'
  return dark
    ? '0 0 0 0.5px rgba(255,255,255,0.02), 0 4px 12px 0 rgba(0,0,0,0.12), 0 12px 28px 0 rgba(0,0,0,0.16), 0 24px 54px -8px rgba(0,0,0,0.2)'
    : '0 0 0 0.5px rgba(0,0,0,0), 0 4px 12px 0 rgba(0,0,0,0.035), 0 12px 28px 0 rgba(0,0,0,0.05), 0 24px 54px -8px rgba(0,0,0,0.08)'
}

function parts(el: HTMLElement) {
  return {
    sheet: el.querySelector<HTMLElement>(
      '.note-layout-main > .paper-sheet-deckle',
    ),
    ink: el.querySelector<HTMLElement>('[data-paper-ink]'),
    stack: Array.from(
      el.querySelectorAll<HTMLElement>('[data-paper-stack-layer]'),
    ),
  }
}

function settleShadow(sheet: HTMLElement, delay = 0) {
  return sheet.animate(
    [
      { boxShadow: airborneShadow() },
      { boxShadow: getComputedStyle(sheet).boxShadow },
    ],
    { duration: 360, delay, easing: EASE, fill: 'both' },
  )
}

function registerInk(ink: HTMLElement, delay = 0) {
  return ink.animate(
    [
      { opacity: 0.45, textShadow: `-1.5px 1px 0 ${INK_PLATE}` },
      { opacity: 1, textShadow: '0px 0px 0 transparent' },
    ],
    { duration: 560, delay, easing: EASE, fill: 'both' },
  )
}

function useEntrance(
  ref: RefObject<HTMLElement | null>,
  play: (el: HTMLElement) => Animation[],
) {
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const animations = play(el)
    const release = () => animations.forEach((a) => a.cancel())
    void Promise.all(animations.map((a) => a.finished.catch(() => {}))).then(
      release,
    )
    return release
  }, [ref, play])
}

const playInkRegister = (el: HTMLElement) => {
  const { sheet, ink } = parts(el)
  return [
    ...(sheet ? [settleShadow(sheet)] : []),
    ...(ink ? [registerInk(ink, 60)] : []),
  ]
}

const STACK_POSES = [
  'translateZ(-26px) translateX(16px) translateY(8px) rotate(2.4deg)',
  'translateZ(-17px) translateX(10px) translateY(0px) rotate(1.2deg)',
]

const SHEET_FROM =
  'translateZ(-8px) translateX(18px) translateY(5px) rotate(2.5deg)'
const SHEET_TO = 'translateZ(0) translateX(0) translateY(0) rotate(0deg)'
const SHEET_MS = 460

export type StackTextMode = 'wipe' | 'ride' | 'still' | 'fade'

const WIPE_FEATHER_PX = 48
const WIPE_MASK = `linear-gradient(to bottom, #000 calc(var(--paper-wipe) - ${WIPE_FEATHER_PX}px), transparent var(--paper-wipe))`

function registerWipeProperty() {
  try {
    CSS.registerProperty({
      name: '--paper-wipe',
      syntax: '<length>',
      inherits: false,
      initialValue: '0px',
    })
  } catch {}
}

function wipeDown(content: HTMLElement, delay: number) {
  registerWipeProperty()
  const reach =
    Math.min(content.offsetHeight, window.innerHeight) + WIPE_FEATHER_PX
  content.style.maskImage = WIPE_MASK
  content.style.webkitMaskImage = WIPE_MASK

  const animation = content.animate(
    [{ '--paper-wipe': '0px' }, { '--paper-wipe': `${reach}px` }],
    {
      duration: 420,
      delay,
      easing: 'cubic-bezier(0.3, 0.6, 0.3, 1)',
      fill: 'both',
    },
  )
  // A cancelled run settles after a remount has already re-applied the mask.
  const clear = () => {
    if (content.getAnimations().some((a) => a !== animation)) return
    content.style.maskImage = ''
    content.style.webkitMaskImage = ''
  }
  void animation.finished.then(clear, clear)
  return animation
}

const playStackShift = (textMode: StackTextMode) => (el: HTMLElement) => {
  const { sheet, stack } = parts(el)
  const content = sheet?.parentElement?.lastElementChild as HTMLElement | null
  const animations: Animation[] = []

  if (sheet) {
    sheet.style.transformOrigin = 'top left'
    animations.push(
      sheet.animate(
        [
          { transform: SHEET_FROM, boxShadow: airborneShadow() },
          {
            transform: SHEET_TO,
            boxShadow: getComputedStyle(sheet).boxShadow,
          },
        ],
        { duration: SHEET_MS, easing: EASE, fill: 'both' },
      ),
    )
  }

  stack.forEach((layer, index) => {
    animations.push(
      layer.animate(
        [
          { opacity: index === 0 ? 0 : 1, transform: STACK_POSES[index] },
          { opacity: 1, transform: layer.style.transform },
        ],
        { duration: 420, delay: 40 + index * 40, easing: EASE, fill: 'both' },
      ),
    )
  })

  if (content && textMode === 'ride') {
    content.style.transformOrigin = 'top left'
    animations.push(
      content.animate([{ transform: SHEET_FROM }, { transform: SHEET_TO }], {
        duration: SHEET_MS,
        easing: EASE,
        fill: 'both',
      }),
    )
  }

  if (content && textMode === 'fade') {
    animations.push(
      content.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 320,
        delay: 260,
        easing: 'ease-out',
        fill: 'both',
      }),
    )
  }

  if (content && textMode === 'wipe') {
    animations.push(wipeDown(content, SHEET_MS / 2))
  }

  return animations
}

const STACK_PLAYERS = {
  wipe: playStackShift('wipe'),
  ride: playStackShift('ride'),
  still: playStackShift('still'),
  fade: playStackShift('fade'),
} satisfies Record<StackTextMode, (el: HTMLElement) => Animation[]>

export function Specimen() {
  return (
    <div data-paper-ink>
      <p className="mb-2 font-mono text-caption-10 uppercase tracking-[0.2em] text-neutral-6">
        2026 年 9 月 28 日 · 晴
      </p>
      <h2 className="mb-6 text-title-24 font-medium text-neutral-10">
        秋分之后的第一场雨
      </h2>
      <div className="space-y-4 text-copy-14 leading-[1.9] text-neutral-8">
        <p>
          傍晚下了雨，窗外的桂花一下子全落了。拿出去年秋天没写完的本子，
          翻到折角那一页，字迹已经淡得有些认不出。
        </p>
        <p>
          有些事当时觉得非记不可，过了一年再看，只剩下纸页边缘被手指磨出的
          毛边，和一点说不清的潮气。
        </p>
        <p>于是又在下面接着写了一行。</p>
      </div>
    </div>
  )
}

export function InkRegisterPaper() {
  const ref = useRef<HTMLDivElement>(null)
  useEntrance(ref, playInkRegister)
  return (
    <div ref={ref}>
      <Paper as="section" stackSheetCount={3}>
        <Specimen />
      </Paper>
    </div>
  )
}

export const TEXT_MODES: { id: StackTextMode; label: string; hint: string }[] =
  [
    { id: 'wipe', label: '半程刷出', hint: '纸走到一半，字从上往下快速刷出' },
    { id: 'ride', label: '随纸', hint: '字印在这张纸上，跟纸一起滑到正面' },
    { id: 'still', label: '静止', hint: '字原地不动，只有纸在下面换' },
    { id: 'fade', label: '落定后淡入', hint: '纸先到位，字再淡出来' },
  ]

export function StackShiftPaper({
  textMode,
  children = <Specimen />,
}: {
  textMode: StackTextMode
  children?: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEntrance(ref, STACK_PLAYERS[textMode])
  return (
    <div ref={ref}>
      <Paper as="section" stackSheetCount={3}>
        {children}
      </Paper>
    </div>
  )
}

export function RatedStage({
  rate,
  children,
}: {
  rate: number
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ref.current
      ?.getAnimations({ subtree: true })
      .forEach((a) => (a.playbackRate = rate))
  }, [rate])

  return (
    <div className="min-w-0" ref={ref}>
      {children}
    </div>
  )
}
