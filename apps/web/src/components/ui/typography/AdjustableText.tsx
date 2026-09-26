import type * as React from 'react'
import { useEffect, useRef, useState } from 'react'

import { usePretextLayout } from '~/hooks/common/use-pretext-layout'

const REFERENCE_FONT_SIZE = 100

interface IProps {
  padding?: number
  scale?: number
  style?: React.CSSProperties
}

export const AdjustableText: React.FC<
  IProps & {
    children: string
  }
> = ({ children, style = {}, scale = 1, padding = 0 }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [fontSize, setFontSize] = useState<string | undefined>()
  const { measureTextWidth } = usePretextLayout()

  useEffect(() => {
    const el = containerRef.current
    const $container = el?.parentElement
    if (!el || !$container) return

    const calculate = () => {
      const containerWidth = $container.clientWidth - padding * 2
      if (!containerWidth) return

      const computedStyle = getComputedStyle($container)
      const fontFamily = computedStyle.fontFamily
      if (!fontFamily) return

      const parentFontSize = parseFloat(computedStyle.fontSize)
      const referenceFont = `${computedStyle.fontStyle} ${computedStyle.fontWeight} ${REFERENCE_FONT_SIZE}px ${fontFamily}`

      const textWidthAtRef = measureTextWidth(children, referenceFont)
      const textWidthAtParentFont =
        textWidthAtRef * (parentFontSize / REFERENCE_FONT_SIZE)

      if (textWidthAtParentFont > containerWidth) {
        const targetFontSize =
          (containerWidth / textWidthAtRef) * REFERENCE_FONT_SIZE * scale
        setFontSize(`${targetFontSize}px`)
      } else {
        setFontSize(undefined)
      }
    }

    calculate()

    const observer = new ResizeObserver(calculate)
    observer.observe($container)

    return () => observer.disconnect()
  }, [children, padding, scale, measureTextWidth])

  return (
    <span
      className="whitespace-nowrap"
      ref={containerRef}
      style={{ ...style, fontSize }}
    >
      {children}
    </span>
  )
}
