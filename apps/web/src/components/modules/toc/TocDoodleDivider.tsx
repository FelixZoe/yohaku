'use client'

import { useMemo } from 'react'

const WAVE_PATHS = [
  'M2 7 C4 2, 7 2, 9 5.5 C11 9, 14 9, 16 5 C18 1, 21 2, 24 6',
  'M2 6 C5 3, 8 3, 10 6 C12 9, 15 8, 18 5 C20 3, 23 4, 26 7',
  'M2 5 C4 8, 7 9, 10 6 C13 3, 15 2, 18 5.5 C20 8, 23 7, 25 5',
  'M2 7.5 C5 4, 8 3, 11 6 C13 8, 16 9, 19 5.5 C21 3, 23 4, 26 6',
  'M2 6.5 C4 3, 7 2.5, 9 5 C11 8, 14 8, 17 5 C19 2, 22 3, 25 6.5',
]

export const TocDoodleDivider = () => {
  const path = useMemo(
    () => WAVE_PATHS[Math.floor(Math.random() * WAVE_PATHS.length)],
    [],
  )

  return (
    <div className="h-8 relative">
      <svg
        className="block h-[10px] w-[150px] max-w-full absolute top-1/2 -translate-y-1/2"
        fill="none"
        preserveAspectRatio="none"
        viewBox="0 0 28 10"
      >
        <path
          className="text-neutral-10/12"
          d={path}
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.2"
          vectorEffect="nonScalingStroke"
        />
      </svg>
    </div>
  )
}
