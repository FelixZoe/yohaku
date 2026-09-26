'use client'

import type {
  DetailedHTMLProps,
  PropsWithChildren,
  TextareaHTMLAttributes,
} from 'react'
import { useCallback } from 'react'

import { useInputComposition } from '~/hooks/common/use-input-composition'
import { clsxm } from '~/lib/helper'

import type { inputRoundedMap } from './styles'
import {
  fieldWrapperBaseClassName,
  fieldWrapperFocusClassName,
  inputRoundedMap as roundedMap,
} from './styles'

interface TextAreaProps
  extends
    DetailedHTMLProps<
      TextareaHTMLAttributes<HTMLTextAreaElement>,
      HTMLTextAreaElement
    >,
    PropsWithChildren {
  bordered?: boolean
  onCmdEnter?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  rounded?: keyof typeof inputRoundedMap
  wrapperClassName?: string
}

export const TextArea = ({ ref, ...props }: TextAreaProps) => {
  const {
    className,
    wrapperClassName,
    children,
    rounded = 'xl',
    bordered = true,
    onCmdEnter,
    onKeyDown,
    ...rest
  } = props
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        onCmdEnter?.(e)
      }
      onKeyDown?.(e)
    },
    [onCmdEnter, onKeyDown],
  )
  const inputProps = useInputComposition(
    Object.assign({}, props, { onKeyDown: handleKeyDown }),
  )
  return (
    <div
      className={clsxm(
        'relative',
        roundedMap[rounded],
        bordered && [fieldWrapperBaseClassName, fieldWrapperFocusClassName],
        !bordered && 'border-transparent bg-transparent shadow-none',
        wrapperClassName,
      )}
    >
      <textarea
        ref={ref as any}
        className={clsxm(
          'size-full resize-none bg-transparent font-sans text-copy-13 text-neutral-8',
          'overflow-auto px-3.5 py-3.5 outline-hidden',
          'leading-7 tracking-[0.01em] duration-200',
          'placeholder:text-neutral-5',
          className,
        )}
        {...rest}
        {...inputProps}
      />

      {children}
    </div>
  )
}
TextArea.displayName = 'TextArea'
