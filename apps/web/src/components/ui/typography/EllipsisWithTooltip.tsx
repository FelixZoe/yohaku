import type { PropsWithChildren } from 'react'
import { useCallback, useEffect, useState } from 'react'

import { usePretextLayout } from '~/hooks/common/use-pretext-layout'
import { clsxm } from '~/lib/helper'

import { FloatPopover } from '../float-popover'

const isTextOverflowed = (element: HTMLElement) =>
  element.offsetWidth < element.scrollWidth ||
  element.offsetHeight < element.scrollHeight

type EllipsisProps = PropsWithChildren<{
  width?: string
  className?: string
  disabled?: boolean
  wrapperClassName?: string
}>

const EllipsisTextWithTooltip = (props: EllipsisProps) => {
  const { children, className, width, disabled, wrapperClassName } = props

  const [textElRef, setTextElRef] = useState<HTMLSpanElement | null>()
  const [isOverflowed, setIsOverflowed] = useState(false)
  const isStringChildren = typeof children === 'string'
  const { measureTextWidth } = usePretextLayout()

  useEffect(() => {
    if (!textElRef) return

    if (isStringChildren) {
      const checkOverflow = () => {
        const style = getComputedStyle(textElRef)
        const font = style.font
        const containerWidth = textElRef.clientWidth

        if (!containerWidth || !font) return
        const textWidth = measureTextWidth(children, font)
        setIsOverflowed(textWidth > containerWidth)
      }
      checkOverflow()

      const resizeObserver = new ResizeObserver(checkOverflow)
      resizeObserver.observe(textElRef)
      return () => resizeObserver.disconnect()
    } else {
      const judgment = () => setIsOverflowed(isTextOverflowed(textElRef))
      judgment()

      const resizeObserver = new ResizeObserver(judgment)
      resizeObserver.observe(textElRef)
      return () => resizeObserver.disconnect()
    }
  }, [textElRef, children, isStringChildren, measureTextWidth])

  return (
    <FloatPopover
      mobileAsSheet
      isDisabled={!isOverflowed || disabled}
      type="tooltip"
      wrapperClassName={clsxm('w-full min-w-0 truncate', wrapperClassName)}
      TriggerComponent={useCallback(
        () => (
          <span
            className={className}
            ref={setTextElRef}
            style={
              width
                ? {
                    maxWidth: width,
                  }
                : undefined
            }
          >
            {children}
          </span>
        ),
        [children, className, width],
      )}
    >
      <span
        className="max-w-[30vw] break-all hover:bg-transparent!"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </span>
    </FloatPopover>
  )
}

export const EllipsisHorizontalTextWithTooltip = (props: EllipsisProps) => {
  const { className, ...rest } = props
  return (
    <EllipsisTextWithTooltip
      className={clsxm('block truncate', className)}
      {...rest}
    />
  )
}
