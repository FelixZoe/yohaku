'use client'

import type { PrimitiveAtom } from 'jotai'
import { atom, useAtomValue, useSetAtom } from 'jotai'
import type { PropsWithChildren } from 'react'
import { createContext, use, useState } from 'react'

type ElementAtom = PrimitiveAtom<HTMLElement | null>

const MainPaperAtomContext = createContext<ElementAtom | null>(null)

// Fallback keeps hook calls unconditional when the provider is missing.
const fallbackAtom: ElementAtom = atom<HTMLElement | null>(null)

/**
 * Hosts a per-mount atom for the `.yohaku-main-paper-wrap` DOM node.
 * Context carries the atom identity (stable), so value consumers and
 * setter consumers subscribe independently — setter-only callers
 * never re-render when the element updates.
 */
export function YohakuMainPaperProvider({ children }: PropsWithChildren) {
  const [paperAtom] = useState<ElementAtom>(() =>
    atom<HTMLElement | null>(null),
  )
  return (
    <MainPaperAtomContext value={paperAtom}>{children}</MainPaperAtomContext>
  )
}

export function useYohakuMainPaperEl(): HTMLElement | null {
  return useAtomValue(use(MainPaperAtomContext) ?? fallbackAtom)
}

export function useYohakuMainPaperSetter(): (el: HTMLElement | null) => void {
  return useSetAtom(use(MainPaperAtomContext) ?? fallbackAtom)
}
