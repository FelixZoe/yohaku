'use client'

import { m } from 'motion/react'
import type { ReactNode } from 'react'

const transition = {
  duration: 0.4,
  ease: [0.4, 0, 0.2, 1] as const,
}

export const TocGroup = ({
  expanded,
  children,
}: {
  expanded: boolean
  children: ReactNode
}) => {
  return (
    <m.div
      initial={false}
      style={{ overflow: 'hidden' }}
      transition={transition}
      animate={{
        height: expanded ? 'auto' : 0,
        opacity: expanded ? 1 : 0,
      }}
    >
      {children}
    </m.div>
  )
}
