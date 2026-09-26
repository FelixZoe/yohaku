'use client'

import { useViewportWidth } from '~/hooks/common/use-viewport-width'

import { YOHAKU_POST_LAYOUT } from '../constants'

interface PostLayoutResult {
  mode: 'split' | 'sheet'
  viewportW: number
}

export function useYohakuPostLayout(): PostLayoutResult {
  const vw = useViewportWidth()
  return {
    mode: vw < YOHAKU_POST_LAYOUT.BREAKPOINT_SHEET_PX ? 'sheet' : 'split',
    viewportW: vw,
  }
}
