'use client'

import type { FC, PropsWithChildren } from 'react'
import { createContext, use, useMemo, useState } from 'react'

import type { CommentAnchor } from './types'

interface AnchorHoverContextValue {
  hoveredAnchor: CommentAnchor | null
  setHoveredAnchor: (anchor: CommentAnchor | null) => void
}

const AnchorHoverContext = createContext<AnchorHoverContextValue>({
  hoveredAnchor: null,
  setHoveredAnchor: () => {},
})

export const AnchorHoverProvider: FC<PropsWithChildren> = ({ children }) => {
  const [hoveredAnchor, setHoveredAnchor] = useState<CommentAnchor | null>(null)
  const value = useMemo(
    () => ({ hoveredAnchor, setHoveredAnchor }),
    [hoveredAnchor],
  )
  return <AnchorHoverContext value={value}>{children}</AnchorHoverContext>
}

export const useAnchorHover = () => use(AnchorHoverContext)
