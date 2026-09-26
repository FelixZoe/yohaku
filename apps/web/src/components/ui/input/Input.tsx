'use client'

import type { DetailedHTMLProps, InputHTMLAttributes } from 'react'

import { useInputComposition } from '~/hooks/common/use-input-composition'
import { clsxm } from '~/lib/helper'

import type { inputRoundedMap } from './styles'
import {
  fieldBaseClassName,
  fieldWrapperFocusClassName,
  inputRoundedMap as roundedMap,
} from './styles'

interface InputProps extends DetailedHTMLProps<
  InputHTMLAttributes<HTMLInputElement>,
  HTMLInputElement
> {
  rounded?: keyof typeof inputRoundedMap
  wrapperClassName?: string
}

// This composition handler is not perfect
// @see https://foxact.skk.moe/use-composition-input
export const Input = ({
  ref,
  className,
  wrapperClassName,
  rounded = 'xl',
  ...props
}: InputProps) => {
  const inputProps = useInputComposition(props)
  return (
    <div
      className={clsxm(
        'relative flex items-center',
        fieldBaseClassName,
        fieldWrapperFocusClassName,
        roundedMap[rounded],
        wrapperClassName,
      )}
    >
      <input
        ref={ref as any}
        className={clsxm(
          'min-w-0 flex-auto appearance-none bg-transparent px-3.5 py-2.5 font-sans text-copy-13 text-neutral-8 outline-hidden',
          'leading-7 tracking-[0.01em] duration-200',
          'placeholder:text-neutral-5',
          'disabled:cursor-not-allowed disabled:opacity-55',
          props.type === 'password'
            ? 'font-mono placeholder:font-sans'
            : 'font-sans',
          className,
        )}
        {...props}
        {...inputProps}
      />
    </div>
  )
}
Input.displayName = 'Input'
