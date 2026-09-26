export type PeekOriginKind = 'card' | 'text'

export interface PeekOrigin {
  bottom: number
  height: number
  kind: PeekOriginKind
  left: number
  right: number
  top: number
  width: number
}

export const PEEK_ENTER_MS = 800
export const PEEK_EXIT_MS = 340
export const FRAME_RADIUS = 0

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'
const EASE_CONTENT = 'cubic-bezier(0.4, 0, 0.2, 1)'
const REDUCED_MS = 160

const SEAM_WIDTH = 240
const SEAM_HEIGHT = 2

export function readPeekOrigin(
  element: Element,
  kind: PeekOriginKind,
): PeekOrigin {
  // A wrapped inline <a> reports one box per line; the union box spans both
  // lines and never existed on screen, so the first line's box is the origin.
  const rect =
    kind === 'text'
      ? (element.getClientRects()[0] ?? element.getBoundingClientRect())
      : element.getBoundingClientRect()

  return {
    bottom: rect.bottom,
    height: rect.height,
    kind,
    left: rect.left,
    right: rect.right,
    top: rect.top,
    width: rect.width,
  }
}

interface Box {
  bottom: number
  height: number
  left: number
  right: number
  top: number
  width: number
}

function insetOf(rect: Box, box: Box, radius: number): string {
  const top = Math.max(0, rect.top - box.top)
  const right = Math.max(0, box.right - rect.right)
  const bottom = Math.max(0, box.bottom - rect.bottom)
  const left = Math.max(0, rect.left - box.left)
  return `inset(${top}px ${right}px ${bottom}px ${left}px round ${radius}px)`
}

function centerSeam(): Box {
  const midX = window.innerWidth / 2
  const midY = window.innerHeight / 2
  return {
    bottom: midY + SEAM_HEIGHT / 2,
    height: SEAM_HEIGHT,
    left: midX - SEAM_WIDTH / 2,
    right: midX + SEAM_WIDTH / 2,
    top: midY - SEAM_HEIGHT / 2,
    width: SEAM_WIDTH,
  }
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function playPeekEnter(
  frame: HTMLElement,
  shade: HTMLElement | null,
  origin: PeekOrigin | null,
): () => void {
  const running: Animation[] = []
  const play = (
    element: Element,
    frames: Keyframe[],
    options: KeyframeAnimationOptions,
  ) => {
    running.push(element.animate(frames, { fill: 'backwards', ...options }))
  }

  const box = frame.getBoundingClientRect()
  const content = frame.querySelector('[data-peek-content]')

  if (shade) {
    shade.style.left = `${box.left}px`
    shade.style.top = `${box.top}px`
    shade.style.width = `${box.width}px`
    shade.style.height = `${box.height}px`
  }

  if (prefersReducedMotion()) {
    play(frame, [{ opacity: 0 }, { opacity: 1 }], { duration: REDUCED_MS })
    if (shade)
      play(shade, [{ opacity: 0 }, { opacity: 1 }], { duration: REDUCED_MS })
    return () => running.forEach((animation) => animation.cancel())
  }

  if (shade) {
    play(
      shade,
      [
        { offset: 0, opacity: 0 },
        { offset: 0.55, opacity: 0 },
        { offset: 1, opacity: 1 },
      ],
      { duration: PEEK_ENTER_MS, easing: 'linear' },
    )
  }

  if (origin?.kind === 'card') {
    playCardEnter(frame, box, origin, play)
  } else if (origin) {
    playTextEnter(frame, box, origin, play)
    if (content) {
      play(
        content,
        [
          { offset: 0, opacity: 0 },
          { offset: 0.05, opacity: 0 },
          { offset: 1, opacity: 1 },
        ],
        { duration: PEEK_ENTER_MS + 120, easing: EASE_CONTENT },
      )
    }
  } else {
    playSeamEnter(frame, box, play)
    if (content) {
      play(
        content,
        [
          { offset: 0, opacity: 0 },
          { offset: 0.25, opacity: 0 },
          { offset: 1, opacity: 1 },
        ],
        { duration: PEEK_ENTER_MS + 120, easing: EASE_CONTENT },
      )
    }
  }

  return () => running.forEach((animation) => animation.cancel())
}

type Play = (
  element: Element,
  frames: Keyframe[],
  options: KeyframeAnimationOptions,
) => void

function playTextEnter(
  frame: HTMLElement,
  box: Box,
  origin: PeekOrigin,
  play: Play,
) {
  const scaleX = origin.width / box.width
  const scaleY = origin.height / box.height
  const x = origin.left - box.left
  const y = origin.top - box.top

  play(
    frame,
    [
      {
        // Radius is applied pre-transform, so each axis must be divided by its
        // own scale factor for the rendered corner to come out as an h/2 pill.
        borderRadius: originRadius(origin, scaleX, scaleY),
        transform: `translate(${x}px, ${y}px) scale(${scaleX}, ${scaleY})`,
        transformOrigin: '0 0',
      },
      {
        borderRadius: `${FRAME_RADIUS}px`,
        transform: 'none',
        transformOrigin: '0 0',
      },
    ],
    { duration: PEEK_ENTER_MS, easing: EASE },
  )
}

function playSeamEnter(frame: HTMLElement, box: Box, play: Play) {
  const seam = centerSeam()
  const radius = seam.height / 2
  const right = Math.max(0, box.right - seam.right)
  const left = Math.max(0, seam.left - box.left)

  play(
    frame,
    [
      { clipPath: insetOf(seam, box, radius), offset: 0 },
      {
        clipPath: `inset(0px ${right}px 0px ${left}px round ${radius}px)`,
        offset: 0.45,
      },
      {
        clipPath: `inset(0px 0px 0px 0px round ${FRAME_RADIUS}px)`,
        offset: 1,
      },
    ],
    { duration: PEEK_ENTER_MS, easing: EASE },
  )
}

function playCardEnter(
  frame: HTMLElement,
  box: Box,
  origin: PeekOrigin,
  play: Play,
) {
  const hero = frame.querySelector<HTMLElement>('[data-peek-hero]')

  play(
    frame,
    [
      { clipPath: insetOf(origin, box, 12) },
      { clipPath: `inset(0px 0px 0px 0px round ${FRAME_RADIUS}px)` },
    ],
    { duration: PEEK_ENTER_MS * 0.78, easing: EASE },
  )

  if (hero) {
    const target = hero.getBoundingClientRect()
    // Card and page share an aspect ratio, so one uniform scale keeps the page
    // undistorted; the card's max-height crop becomes the starting clip.
    const scale = origin.width / target.width
    const hiddenBelow = Math.max(0, target.height - origin.height / scale)
    play(
      hero,
      [
        {
          clipPath: `inset(0px 0px ${hiddenBelow}px 0px)`,
          transform: `translate(${origin.left - target.left}px, ${origin.top - target.top}px) scale(${scale})`,
          transformOrigin: '0 0',
        },
        {
          clipPath: 'inset(0px 0px 0px 0px)',
          transform: 'none',
          transformOrigin: '0 0',
        },
      ],
      { duration: PEEK_ENTER_MS, easing: EASE },
    )
  }

  const head = frame.querySelector('[data-peek-chrome="head"]')
  if (head) {
    play(
      head,
      [
        { offset: 0, opacity: 0, transform: 'translateY(-8px)' },
        { offset: 0.45, opacity: 0, transform: 'translateY(-8px)' },
        { offset: 1, opacity: 1, transform: 'none' },
      ],
      { duration: PEEK_ENTER_MS, easing: EASE },
    )
  }

  const rail = frame.querySelector('[data-peek-chrome="rail"]')
  if (rail) {
    play(
      rail,
      [
        { offset: 0, opacity: 0, transform: 'translateX(-14px)' },
        { offset: 0.55, opacity: 0, transform: 'translateX(-14px)' },
        { offset: 1, opacity: 0.45, transform: 'none' },
      ],
      { duration: PEEK_ENTER_MS, easing: EASE },
    )
  }

  frame.querySelectorAll('[data-peek-stagger]').forEach((element, index) => {
    if (element === hero) return
    play(
      element,
      [
        { offset: 0, opacity: 0, transform: 'translateY(10px)' },
        {
          offset: Math.min(0.9, 0.5 + index * 0.04),
          opacity: 0,
          transform: 'translateY(10px)',
        },
        { offset: 1, opacity: 1, transform: 'none' },
      ],
      { duration: PEEK_ENTER_MS, easing: EASE },
    )
  })
}

function originRadius(origin: PeekOrigin, scaleX: number, scaleY: number) {
  const radius = origin.kind === 'text' ? origin.height / 2 : 12
  return `${radius / scaleX}px / ${radius / scaleY}px`
}

export function peekExitProps(box: Box | null, origin: PeekOrigin | null) {
  if (!box || !origin) return { opacity: [1, 1, 0] }
  const scaleX = origin.width / box.width
  const scaleY = origin.height / box.height
  return {
    borderRadius: [
      `${FRAME_RADIUS}px / ${FRAME_RADIUS}px`,
      originRadius(origin, scaleX, scaleY),
    ],
    opacity: [1, 1, 0],
    scaleX,
    scaleY,
    x: origin.left - box.left,
    y: origin.top - box.top,
  }
}
