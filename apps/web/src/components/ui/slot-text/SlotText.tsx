'use client'

import type { ComponentProps } from 'react'
import { useEffect, useRef } from 'react'
import type { SlotOptions } from 'slot-text'
import { SlotText as BaseSlotText } from 'slot-text/react'

const numericOptions: SlotOptions = {
  bounce: 0,
  exitOffset: 0,
  duration: 320,
  easing: 'cubic-bezier(0.2, 0, 0, 1)',
}

const parseNumber = (text: string) => {
  const n = Number(text.replaceAll(/[^\d.-]/g, ''))
  return Number.isFinite(n) && /\d/.test(text) ? n : null
}

export const SlotText = ({
  ref,
  text,
  options,
  ...props
}: ComponentProps<typeof BaseSlotText> & {
  ref?: React.RefObject<HTMLSpanElement | null>
}) => {
  const prevTextRef = useRef(text)
  useEffect(() => {
    prevTextRef.current = text
  }, [text])
  const prev = parseNumber(prevTextRef.current)
  const next = parseNumber(text)
  const direction: SlotOptions['direction'] =
    prev !== null && next !== null && next < prev ? 'down' : 'up'

  return (
    <BaseSlotText
      options={{ ...numericOptions, direction, ...options }}
      ref={ref}
      text={text}
      {...props}
    />
  )
}
SlotText.displayName = 'SlotText'
