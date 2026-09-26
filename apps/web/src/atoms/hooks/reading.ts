import { createAtomHooks } from 'jojoo/react'
import { useEffect } from 'react'

import {
  immersiveReadingEnabledAtom,
  isFocusReadingAtom,
  isInReadingAtom,
  isMouseInMarkdownAtom,
  mainMarkdownElementAtom,
} from '../reading'

export const [, , useIsInReading, , , setIsInReading] =
  createAtomHooks(isInReadingAtom)

export const [, , useIsFocusReading, , , setIsFocusReading] =
  createAtomHooks(isFocusReadingAtom)

export const [, , useIsMouseInMarkdown, , , setIsMouseInMarkdown] =
  createAtomHooks(isMouseInMarkdownAtom)

export const [
  ,
  ,
  useIsImmersiveReadingEnabled,
  ,
  ,
  setIsImmersiveReadingEnabled,
] = createAtomHooks(immersiveReadingEnabledAtom)

export const [, , useMainMarkdownElement, , , setMainMarkdownElement] =
  createAtomHooks(mainMarkdownElementAtom)
export const useFocusReading = () => {
  useEffect(() => {
    setIsInReading(true)
    setIsFocusReading(true)
  }, [])
}
