'use client'

import type { KeyboardEvent } from 'react'

import { useYohakuActions } from './YohakuProvider'

export function YohakuRefAnchor({
  quote,
  section,
}: {
  quote: string
  section?: string
}) {
  const { anchor } = useYohakuActions()
  const onActivate = () => anchor({ quote, section })
  const onKey = (e: KeyboardEvent<HTMLSpanElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onActivate()
    }
  }
  return (
    <span
      aria-label={section ? `跳至原文 ${section}` : '跳至原文'}
      className="yohaku-ref-anchor mx-[1px] inline-flex size-[1.15em] shrink-0 cursor-pointer select-none items-center justify-center rounded-full border border-current/30 align-text-top text-[0.72em] text-neutral-6 transition-[color,border-color,background-color] duration-150 hover:border-accent/60 hover:bg-accent/10 hover:text-accent focus-visible:border-accent/60 focus-visible:bg-accent/10 focus-visible:text-accent focus-visible:outline-none"
      data-yohaku-ref=""
      role="link"
      tabIndex={0}
      onClick={onActivate}
      onKeyDown={onKey}
    >
      <i aria-hidden className="i-mingcute-arrow-left-up-line text-[0.9em]" />
    </span>
  )
}
