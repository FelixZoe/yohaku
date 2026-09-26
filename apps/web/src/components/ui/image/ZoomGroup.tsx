'use client'

import type { ReactNode } from 'react'
import { createContext, use, useId } from 'react'

const ZoomGroupContext = createContext<string | null>(null)

export const useZoomGroupId = (): string | null => use(ZoomGroupContext)

export const ZoomGroup = ({ children }: { children: ReactNode }) => {
  const id = useId()
  return <ZoomGroupContext value={id}>{children}</ZoomGroupContext>
}
