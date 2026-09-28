import type { JSX, ReactNode } from 'react'

import { clsxm } from '~/lib/helper'

import { PaperSheet } from './PaperSheet'
import { PaperStackBackingLayers } from './PaperStackBackingLayers'

type StackSheetCount = 1 | 2 | 3

type BackLayer = {
  tz: number
  tx: number
  ty?: number
  rot: number
  z: number
  ribbed?: boolean
}

/**
 * Two backing layers when both neighbors exist (3 sheets total).
 * Small θ keeps the stack from reading as a fan; Δθ modest but non-zero, with
 * offset in X/Z so two right edges stay separable without large rotation.
 */
const STACK_BACK_FOR_THREE: readonly BackLayer[] = [
  { tz: -17, tx: 10, rot: 1.2, z: -5 },
  { tz: -8, tx: 18, rot: 2.5, ty: 5, z: -3, ribbed: true },
]

/** One backing layer when only one neighbor exists (2 sheets total). */
const STACK_BACK_FOR_TWO: readonly BackLayer[] = [
  { tz: -8, tx: 14, rot: 1.8, ty: 5, z: -3, ribbed: true },
]

/**
 * Sheet count for note detail `Paper`: 1 + (has 上一篇?) + (has 下一篇?), max 3.
 * Aligns with `NoteFooterNavigation`: 上一篇 ⇔ `payload.next`, 下一篇 ⇔ `payload.prev`.
 */
export function paperStackSheetCountFromNeighbors(
  hasPreviousNeighbor: boolean,
  hasNextNeighbor: boolean,
): StackSheetCount {
  let n = 1
  if (hasPreviousNeighbor) n++
  if (hasNextNeighbor) n++
  return n as StackSheetCount
}

function backingLayersForStackCount(
  count: StackSheetCount,
): readonly BackLayer[] {
  if (count <= 1) return []
  if (count === 2) return STACK_BACK_FOR_TWO
  return STACK_BACK_FOR_THREE
}

export const DeckleFilter = () => (
  <svg aria-hidden className="absolute" height="0" width="0">
    <defs>
      <filter id="deckle-edge">
        <feTurbulence
          baseFrequency="0.04"
          numOctaves={3}
          result="turb"
          seed={7}
          type="turbulence"
        />
        <feDisplacementMap
          in="SourceGraphic"
          in2="turb"
          scale={1.5}
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </defs>
  </svg>
)

export const Paper: Component<{
  as?: keyof JSX.IntrinsicElements | Component
  /** Stacked paper depth: 1 = no neighbors, 2 = one neighbor, 3 = both. Default 1. */
  stackSheetCount?: StackSheetCount
  /** Override the inner content padding. */
  contentClassName?: string
  /** An optional slot for things that should be layered relative to the paper (e.g. bookmarks tucked under). */
  aside?: ReactNode
}> = ({
  children,
  className,
  as: As = 'main',
  stackSheetCount = 1,
  contentClassName,
  aside,
}) => {
  const backLayers = backingLayersForStackCount(stackSheetCount)
  const useStack3d = backLayers.length > 0

  return (
    <As
      className={clsxm(
        'relative md:col-start-1 lg:col-auto',
        '-m-4 md:m-0',
        'note-layout-main',
        'min-w-0',
        useStack3d && 'lg:[perspective:2000px]',
        className,
      )}
    >
      <DeckleFilter />

      <PaperStackBackingLayers layers={backLayers} />

      <PaperSheet
        className={clsxm('-z-1', useStack3d && 'lg:[transform:translateZ(0)]')}
      />

      {aside}

      {/* Content layer — always crisp, no filter */}
      <div
        data-paper-content
        className={clsxm(
          'relative p-[2rem_1rem] md:p-[30px_45px]',
          contentClassName,
        )}
      >
        {children}
      </div>
    </As>
  )
}

export { PaperSheet } from './PaperSheet'
