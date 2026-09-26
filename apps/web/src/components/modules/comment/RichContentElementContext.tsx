'use client'

import { createContext, use, useEffect, useState } from 'react'

const RichContentElementContext = createContext<HTMLElement | null>(null)

export function useRichContentElement() {
  return use(RichContentElementContext)
}

export function RichContentElementProvider({
  containerRef,
  children,
  contentKey,
}: {
  containerRef: React.RefObject<HTMLElement | null>
  children: React.ReactNode
  contentKey?: string
}) {
  const [el, setEl] = useState<HTMLElement | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const bind = () => {
      const contentEl =
        (container.querySelector('[data-lexical-content]') as HTMLElement) ??
        (container.querySelector('.rich-content') as HTMLElement)
      setEl(contentEl)
    }

    bind()
    const observer = new MutationObserver(bind)
    observer.observe(container, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [containerRef, contentKey])

  return (
    <RichContentElementContext value={el}>{children}</RichContentElementContext>
  )
}
