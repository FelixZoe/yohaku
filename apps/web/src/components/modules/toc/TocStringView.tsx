'use client'

import { AnimatePresence, m, useAnimationFrame } from 'motion/react'
import { useMemo, useRef } from 'react'

import { useReadPercent } from '~/hooks/shared/use-read-percent'
import { clsxm } from '~/lib/helper'
import { useWrappedElement } from '~/providers/shared/WrappedElementProvider'

import type { ITocItem } from './TocItem'

const STRING_X = 8
const MAX_AMPLITUDE = 11
const BREATH_AMPLITUDE = 0.6
const BREATH_PERIOD_MS = 9000
const BULGE_SPAN = 56
const GLOW_FRACTION = 0.12
const MAX_VELOCITY_BOOST = 14
const VELOCITY_SCALE = 0.012
const BOOST_STIFFNESS = 90
const BOOST_DAMPING = 2 * Math.sqrt(BOOST_STIFFNESS) * 0.75

const stringPath = (
  height: number,
  cy: number,
  amplitude: number,
  span: number,
) => {
  const xb = STRING_X + amplitude
  const yTop = Math.max(0, cy - span)
  const yBottom = Math.min(height, cy + span)
  return [
    `M${STRING_X} 0`,
    `L${STRING_X} ${yTop}`,
    `C${STRING_X} ${cy - span * 0.45},${xb} ${cy - span * 0.3},${xb} ${cy}`,
    `C${xb} ${cy + span * 0.3},${STRING_X} ${cy + span * 0.45},${STRING_X} ${yBottom}`,
    `L${STRING_X} ${height}`,
  ].join(' ')
}

const bulgeOffsetAt = (
  y: number,
  cy: number,
  amplitude: number,
  span: number,
) => {
  const u = Math.abs(y - cy) / span
  if (u >= 1) return 0
  return amplitude * Math.cos((u * Math.PI) / 2) ** 2
}

export const TocStringView = ({
  active,
  toc,
  activeId,
  rootDepth,
  className,
}: {
  active: boolean
  toc: ITocItem[]
  activeId: string | null
  rootDepth: number
  className?: string
}) => {
  const $article = useWrappedElement()
  const readPercent = useReadPercent()

  const wrapperRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<SVGPathElement>(null)
  const glowRef = useRef<SVGPathElement>(null)
  const nodeRefs = useRef<(SVGCircleElement | null)[]>([])
  const pctRef = useRef<HTMLDivElement>(null)

  const presenceRef = useRef(0)
  const cyRef = useRef(0)
  const velocityRef = useRef(0)
  const lastScrollYRef = useRef<number | null>(null)
  const boostRef = useRef(0)
  const boostVelRef = useRef(0)
  const percentRef = useRef(readPercent)
  percentRef.current = readPercent

  const nodes = useMemo(() => {
    if (!$article) return []
    const articleTop = $article.getBoundingClientRect().top
    const articleHeight = $article.offsetHeight || 1
    return toc.map((item) => ({
      anchorId: item.anchorId,
      isRoot: item.depth === rootDepth,
      ratio: Math.min(
        1,
        Math.max(
          0,
          (item.$heading.getBoundingClientRect().top - articleTop) /
            articleHeight,
        ),
      ),
    }))
  }, [$article, toc, rootDepth])
  const nodesRef = useRef(nodes)
  nodesRef.current = nodes

  const activeRoot = useMemo(() => {
    if (!activeId) return null
    const idx = toc.findIndex((item) => item.anchorId === activeId)
    if (idx === -1) return null
    for (let i = idx; i >= 0; i--) {
      if (toc[i].depth === rootDepth) return toc[i]
    }
    return null
  }, [activeId, toc, rootDepth])

  useAnimationFrame((time, delta) => {
    const $wrapper = wrapperRef.current
    const $track = trackRef.current
    const $glow = glowRef.current
    if (!$wrapper || !$track || !$glow) return

    const height = $wrapper.clientHeight
    if (!height) return

    const target = active ? 1 : 0
    const k = 1 - Math.exp(-delta / 140)
    const presence = presenceRef.current + (target - presenceRef.current) * k
    presenceRef.current =
      Math.abs(target - presence) < 0.002 ? target : presence

    const cyTarget = (percentRef.current / 100) * height
    cyRef.current =
      presenceRef.current === 0
        ? cyTarget
        : cyRef.current + (cyTarget - cyRef.current) * Math.min(1, k * 1.4)

    if (presenceRef.current === 0 && !active) return

    const scrollY = window.scrollY
    const instVelocity =
      lastScrollYRef.current === null
        ? 0
        : ((scrollY - lastScrollYRef.current) / delta) * 1000
    lastScrollYRef.current = scrollY
    velocityRef.current +=
      (instVelocity - velocityRef.current) * Math.min(1, delta / 80)
    const targetBoost = Math.min(
      MAX_VELOCITY_BOOST,
      Math.abs(velocityRef.current) * VELOCITY_SCALE,
    )
    // Slightly underdamped spring so the bulge settles back with the inertia
    // and faint wobble of a real string being released
    const dtS = Math.min(delta, 64) / 1000
    boostVelRef.current +=
      (BOOST_STIFFNESS * (targetBoost - boostRef.current) -
        BOOST_DAMPING * boostVelRef.current) *
      dtS
    boostRef.current = Math.max(
      -4,
      boostRef.current + boostVelRef.current * dtS,
    )
    const boost = boostRef.current

    const breath =
      MAX_AMPLITUDE -
      BREATH_AMPLITUDE +
      Math.sin((time / BREATH_PERIOD_MS) * Math.PI * 2) * BREATH_AMPLITUDE
    const cy = cyRef.current
    const span = BULGE_SPAN + boost * 2.2
    // String ends are pinned: damp the bulge near the top/bottom edge so the
    // curve never pokes outside the svg and gets clipped
    const edgeDamp = Math.max(0, Math.min(1, cy / span, (height - cy) / span))
    const amplitude = presenceRef.current * (breath + boost) * edgeDamp

    const d = stringPath(height, cy, amplitude, span)
    $track.setAttribute('d', d)
    $glow.setAttribute('d', d)
    $glow.setAttribute(
      'stroke-dashoffset',
      `${GLOW_FRACTION / 2 - cy / height}`,
    )

    nodeRefs.current.forEach(($node, i) => {
      const node = nodesRef.current[i]
      if (!$node || !node) return
      const y = node.ratio * height
      $node.setAttribute('cy', `${y}`)
      $node.setAttribute(
        'cx',
        `${STRING_X + bulgeOffsetAt(y, cy, amplitude, span)}`,
      )
    })

    if (pctRef.current) {
      pctRef.current.style.transform = `translateY(${cy}px) translateY(-50%)`
    }
  })

  if (toc.length === 0) return null

  return (
    <div
      aria-hidden
      ref={wrapperRef}
      className={clsxm(
        'pointer-events-none absolute inset-y-0 left-0 w-12',
        className,
      )}
    >
      <svg
        className="absolute inset-0 size-full overflow-visible"
        style={{
          clipPath: active
            ? 'inset(-2% -50% -2% -2%)'
            : `inset(${readPercent}% -50% ${100 - readPercent}% -2%)`,
          transition: `clip-path ${active ? 550 : 450}ms cubic-bezier(0.4, 0, 0.2, 1)`,
        }}
      >
        <path
          ref={trackRef}
          strokeWidth={1.2}
          className={clsxm(
            'fill-none stroke-neutral-8/15 transition-opacity',
            active
              ? 'opacity-100 delay-100 duration-200'
              : 'opacity-0 delay-0 duration-[450ms]',
          )}
        />
        <path
          pathLength={1}
          ref={glowRef}
          strokeDasharray={`${GLOW_FRACTION} ${1 - GLOW_FRACTION}`}
          strokeLinecap="round"
          strokeWidth={1.6}
          className={clsxm(
            'fill-none stroke-accent transition-opacity',
            active
              ? 'opacity-55 delay-150 duration-300'
              : 'opacity-0 delay-0 duration-200',
          )}
          style={{
            filter:
              'drop-shadow(0 0 4px color-mix(in srgb, var(--color-accent) 35%, transparent))',
          }}
        />
        {nodes.map((node, i) => {
          const isActive = node.anchorId === activeId
          return (
            <circle
              key={node.anchorId}
              className={clsxm(
                isActive
                  ? 'fill-accent/70'
                  : node.isRoot
                    ? 'fill-neutral-8/30'
                    : 'fill-neutral-8/18',
                active ? 'opacity-100' : 'opacity-0',
              )}
              ref={(el) => {
                nodeRefs.current[i] = el
              }}
              style={{
                r: `${isActive ? 2.5 : node.isRoot ? 1.75 : 1.25}px`,
                transition: `opacity 300ms ${active ? (isActive ? 100 : 600) : 0}ms, r 350ms cubic-bezier(0.4, 0, 0.2, 1), fill 350ms`,
              }}
            />
          )
        })}
      </svg>
      <div
        ref={pctRef}
        className={clsxm(
          'absolute left-9 top-0 flex flex-col gap-0.5',
          'transition-opacity duration-300',
          active ? 'opacity-100 delay-700' : 'opacity-0 delay-0',
        )}
      >
        <AnimatePresence mode="wait">
          {activeRoot && (
            <m.span
              animate={{ opacity: 1, y: 0 }}
              className="block max-w-[140px] truncate text-[10px] leading-tight text-neutral-8/40"
              exit={{ opacity: 0, y: -3 }}
              initial={{ opacity: 0, y: 3 }}
              key={activeRoot.anchorId}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              {activeRoot.title}
            </m.span>
          )}
        </AnimatePresence>
        <span className="text-[10px] tabular-nums text-accent/50">
          {readPercent}%
        </span>
      </div>
    </div>
  )
}
