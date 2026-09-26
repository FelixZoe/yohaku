'use client'

import type { ReactNode } from 'react'
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { clsxm } from '~/lib/helper'

interface NoteMainContainerHeightContextValue {
  height: number
  reportHeight: (height: number) => void
}

const NoteMainContainerHeightContext =
  createContext<NoteMainContainerHeightContextValue | null>(null)

export const NoteMainContainerHeightProvider: Component = ({ children }) => {
  const [height, setHeight] = useState(0)
  const heightRef = useRef(0)
  const deferredHeightRef = useRef<number | null>(null)

  const commitHeight = useCallback((nextHeight: number) => {
    heightRef.current = nextHeight
    deferredHeightRef.current = null
    setHeight(nextHeight)
  }, [])

  const wouldClampScrollPosition = useCallback((nextHeight: number) => {
    const heightReduction = heightRef.current - nextHeight
    const scrollingElement = document.scrollingElement
    if (heightReduction <= 0 || !scrollingElement) return false

    const projectedMaxScrollY = Math.max(
      0,
      scrollingElement.scrollHeight - heightReduction - window.innerHeight,
    )
    return window.scrollY > projectedMaxScrollY + 1
  }, [])

  const reportHeight = useCallback(
    (nextHeight: number) => {
      if (nextHeight <= 0) return

      // Releasing a tall outgoing article while the scroll-to-top spring is
      // still running would clamp scrollY and make the sticky sidebar jump.
      if (wouldClampScrollPosition(nextHeight)) {
        deferredHeightRef.current = nextHeight
        return
      }

      commitHeight(nextHeight)
    },
    [commitHeight, wouldClampScrollPosition],
  )

  useEffect(() => {
    const releaseDeferredHeight = () => {
      const deferredHeight = deferredHeightRef.current
      if (deferredHeight === null || wouldClampScrollPosition(deferredHeight)) {
        return
      }
      commitHeight(deferredHeight)
    }

    window.addEventListener('scroll', releaseDeferredHeight, { passive: true })
    return () => window.removeEventListener('scroll', releaseDeferredHeight)
  }, [commitHeight, wouldClampScrollPosition])

  const value = useMemo(
    () => ({ height, reportHeight }),
    [height, reportHeight],
  )

  return (
    <NoteMainContainerHeightContext value={value}>
      {children}
    </NoteMainContainerHeightContext>
  )
}

const useNoteMainContainerHeightContext = () => {
  const context = use(NoteMainContainerHeightContext)
  if (!context) {
    throw new TypeError(
      '<NoteMainContainer /> must be used in <NoteMainContainerHeightProvider />',
    )
  }
  return context
}

export const NoteMainContainer: Component = ({ className, children }) => {
  const mainRef = useRef<HTMLDivElement>(null)
  const { reportHeight } = useNoteMainContainerHeightContext()

  useLayoutEffect(() => {
    if (!mainRef.current) return

    reportHeight(mainRef.current.offsetHeight)

    const ob = new ResizeObserver((entries) => {
      const mainHeight = (entries[0].target as HTMLElement).offsetHeight
      reportHeight(mainHeight)
    })
    ob.observe(mainRef.current)

    return () => ob.disconnect()
  }, [reportHeight])

  return (
    <main className={className} ref={mainRef}>
      {children}
    </main>
  )
}

export const useNoteMainContainerHeight = () =>
  useNoteMainContainerHeightContext().height

export const NoteMainContainerHeightPlaceholder = ({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) => {
  const height = useNoteMainContainerHeight()

  return (
    <div
      className={clsxm('min-w-0', className)}
      style={{ minHeight: height || undefined }}
    >
      {children}
    </div>
  )
}
