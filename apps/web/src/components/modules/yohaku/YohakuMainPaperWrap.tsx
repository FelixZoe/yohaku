'use client'

import type { PropsWithChildren } from 'react'

import { clsxm } from '~/lib/helper'

import { useYohakuMainPaperSetter } from './YohakuMainPaperContext'

/**
 * Client wrapper for `.yohaku-main-paper-wrap`. Registers its DOM node
 * via callback ref with the ambient `YohakuMainPaperProvider` so
 * downstream components (e.g. YohakuMainClickCatcher) can portal into it.
 */
export function YohakuMainPaperWrap({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  const setEl = useYohakuMainPaperSetter()
  return (
    <div
      className={clsxm('yohaku-main-paper-wrap relative', className)}
      ref={setEl}
    >
      {children}
    </div>
  )
}
