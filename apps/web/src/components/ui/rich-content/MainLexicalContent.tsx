'use client'

import { useCallback, useEffect, useRef } from 'react'

import { setMainMarkdownElement } from '~/atoms/hooks/reading'
import { MAIN_CONTENT_ID } from '~/constants/dom-id'
import { DOMCustomEvents } from '~/constants/event'
import { useHashAnchorScroll } from '~/hooks/common/use-hash-anchor-scroll'

import type { LexicalContentProps } from './LexicalContent'
import { LexicalContent } from './LexicalContent'

export function MainLexicalContent(props: LexicalContentProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  const ref = useCallback((element: HTMLDivElement | null) => {
    containerRef.current = element
    setMainMarkdownElement(element)
  }, [])

  useHashAnchorScroll(containerRef, props.content)

  useEffect(() => {
    document.dispatchEvent(new CustomEvent(DOMCustomEvents.RefreshToc))
  }, [props.content])

  return (
    <div className="relative" id={MAIN_CONTENT_ID} ref={ref}>
      <LexicalContent {...props} />
    </div>
  )
}
