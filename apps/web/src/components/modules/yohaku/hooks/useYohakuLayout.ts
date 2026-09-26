'use client'

import { useViewportWidth } from '~/hooks/common/use-viewport-width'

import { YOHAKU_LAYOUT } from '../constants'

type LayoutResult =
  | {
      mode: 'split'
      noteW: number
      overlap: number
      leftGutter: number
      shift: number
      unitW: number
    }
  | {
      mode: 'sheet'
      noteW: 0
      overlap: 0
      leftGutter: 0
      shift: 0
      unitW: 0
    }

const clamp = (lo: number, v: number, hi: number) =>
  Math.min(hi, Math.max(lo, v))

function computeLayout({
  viewportW,
  paperW,
}: {
  viewportW: number
  paperW: number
}): LayoutResult {
  const {
    NOTE_TARGET_W,
    NOTE_MIN_W,
    OVERLAP_MIN,
    OVERLAP_MAX,
    PEEK_MIN,
    SIDE_PAD,
    BREAKPOINT_SHEET_PX,
  } = YOHAKU_LAYOUT

  if (viewportW < BREAKPOINT_SHEET_PX) {
    return {
      mode: 'sheet',
      noteW: 0,
      overlap: 0,
      leftGutter: 0,
      shift: 0,
      unitW: 0,
    }
  }

  const V = viewportW
  const M = paperW

  const nFit = V + OVERLAP_MAX - M - 2 * SIDE_PAD
  const N = clamp(NOTE_MIN_W, Math.min(NOTE_TARGET_W, nFit), NOTE_TARGET_W)

  const oMaxEff = Math.min(OVERLAP_MAX, N - PEEK_MIN)
  const required = M + N - V + 2 * SIDE_PAD
  const O = clamp(OVERLAP_MIN, required, oMaxEff)

  const unitW = M + N - O
  const leftGutter = (V - unitW) / 2
  const shift = (N - O) / 2

  return { mode: 'split', noteW: N, overlap: O, leftGutter, shift, unitW }
}

export function useYohakuLayout(paperW: number): LayoutResult {
  const vw = useViewportWidth()
  return computeLayout({ viewportW: vw, paperW })
}
