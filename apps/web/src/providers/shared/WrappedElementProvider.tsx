'use client'

import { createContextState } from 'foxact/create-context-state'
import { useIsomorphicLayoutEffect } from 'foxact/use-isomorphic-layout-effect'
import type * as React from 'react'
import { memo, useEffect, useRef } from 'react'

import { useStateToRef } from '~/hooks/common/use-state-ref'
import { clsxm } from '~/lib/helper'

import { usePageScrollDirection } from '../root/page-scroll-info-provider'

const [
  WrappedElementProviderInternal,
  useWrappedElement,
  useSetWrappedElement,
] = createContextState<HTMLDivElement | null>(undefined as any)

const [
  ElementSizeProviderInternal,
  useWrappedElementSize,
  useSetWrappedElementSize,
] = createContextState({
  h: 0,
  w: 0,
})

const [
  ElementPositionProviderInternal,
  useWrappedElementPosition,
  useSetElementPosition,
] = createContextState({
  x: 0,
  y: 0,
})

const [
  IsEOArticleElementProviderInternal,
  useIsEoFWrappedElement,
  useSetIsEOArticleElement,
] = createContextState<boolean>(false)

interface WrappedElementProviderProps {
  as?: keyof React.JSX.IntrinsicElements
  eoaDetect?: boolean
  style?: React.CSSProperties
}

export const WrappedElementProvider: Component<WrappedElementProviderProps> = ({
  children,
  className,
  style,
  ...props
}) => (
  <WrappedElementProviderInternal>
    <ElementSizeProviderInternal>
      <ElementPositionProviderInternal>
        <IsEOArticleElementProviderInternal>
          <ElementResizeObserver />
          <Content {...props} className={className} style={style}>
            {children}
          </Content>
        </IsEOArticleElementProviderInternal>
      </ElementPositionProviderInternal>
    </ElementSizeProviderInternal>
  </WrappedElementProviderInternal>
)
const ElementResizeObserver = () => {
  const setSize = useSetWrappedElementSize()
  const setPos = useSetElementPosition()
  const $element = useWrappedElement()
  useIsomorphicLayoutEffect(() => {
    if (!$element) return
    const { height, width, left, top } = $element.getBoundingClientRect()
    setSize({ h: height, w: width })

    const pageX = window.scrollX + left
    const pageY = window.scrollY + top
    setPos({ x: pageX, y: pageY })

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]

      const { height, width } = entry.contentRect
      const { left, top } = $element.getBoundingClientRect()
      const pageX = window.scrollX + left
      const pageY = window.scrollY + top

      setSize((size) => {
        if (size.h === height && size.w === width) return size
        return { h: height, w: width }
      })
      setPos((pos) => {
        if (pos.x === pageX && pos.y === pageY) return pos
        return { x: pageX, y: pageY }
      })
    })
    observer.observe($element)
    return () => {
      observer.unobserve($element)
      observer.disconnect()
    }
  }, [$element])

  return null
}

const Content: Component<WrappedElementProviderProps> = memo(
  ({ children, className, style, eoaDetect, as = 'div' }) => {
    const setElement = useSetWrappedElement()

    const As = as as any
    return (
      <As
        className={clsxm('relative', className)}
        ref={setElement}
        style={style}
      >
        {children}
        {eoaDetect && <EOADetector />}
      </As>
    )
  },
)

Content.displayName = 'ArticleElementProviderContent'

const EOADetector: Component = () => {
  const dir = usePageScrollDirection()
  const getDir = useStateToRef(dir)
  const setter = useSetIsEOArticleElement()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    const $el = ref.current
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]

        if (!entry.isIntersecting && getDir.current === 'down') {
          return
        }

        setter(entry.isIntersecting)
      },
      {
        rootMargin: '0px 0px 0px 0px',
      },
    )

    observer.observe($el)
    return () => {
      observer.unobserve($el)
      observer.disconnect()
    }
  }, [])

  return <div ref={ref} />
}

export {
  useIsEoFWrappedElement,
  useWrappedElement,
  useWrappedElementPosition,
  useWrappedElementSize,
}
