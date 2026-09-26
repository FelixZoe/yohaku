'use client'

import type { ReactNode } from 'react'
import { createContext, use } from 'react'

export interface BlockGutterActionProps {
  blockId: string
  blockIndex: number
  isHovered: boolean
}

export interface BlockGutterActionContextValue {
  activeBlockIds: Set<string>
  render: (props: BlockGutterActionProps) => ReactNode | null
}

const noop = new Set<string>()
const BlockGutterActionContext =
  createContext<BlockGutterActionContextValue | null>(null)

export function BlockGutterActionProvider({
  value,
  children,
}: {
  value: BlockGutterActionContextValue
  children: ReactNode
}) {
  return (
    <BlockGutterActionContext value={value}>
      {children}
    </BlockGutterActionContext>
  )
}

export function useBlockGutterAction(): BlockGutterActionContextValue {
  const ctx = use(BlockGutterActionContext)
  return ctx ?? { activeBlockIds: noop, render: () => null }
}
