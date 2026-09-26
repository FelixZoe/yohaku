'use client'

import { useRef } from 'react'

import { Paper } from './Paper'
import { usePaperEntrance } from './usePaperEntrance'

export const PaperWithEntrance: typeof Paper = ({ aside, ...props }) => {
  const ref = useRef<HTMLDivElement>(null)
  usePaperEntrance(ref)

  return (
    <div ref={ref}>
      <Paper {...(props as any)} aside={aside} />
    </div>
  )
}
