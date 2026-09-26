import clsx from 'clsx'
import type { ContextType, FC, PropsWithChildren } from 'react'
import * as React from 'react'
import { createContext, use, useEffect, useId } from 'react'
import { tv } from 'tailwind-variants'

import { clsxm } from '~/lib/helper'
import { isUndefined, merge } from '~/lib/lodash'

import { MotionButtonBase } from '../button'
import { ErrorLabelLine, Label } from '../label'
import { Spinner } from '../loading/Spinner'

const InputPropsContext = createContext<
  Pick<
    AdvancedInputProps,
    'labelPlacement' | 'inputClassName' | 'labelClassName'
  >
>({})

const useAdvancedInputPropsContext = () => use(InputPropsContext)

export const AdvancedInputProvider: FC<
  ContextType<typeof InputPropsContext> & PropsWithChildren
> = ({ children, ...props }) => (
  <InputPropsContext value={props}>{children}</InputPropsContext>
)

export interface AdvancedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  bindValue?: string
  endContent?: React.ReactNode
  errorMessage?: string
  inputClassName?: string
  isInvalid?: boolean
  isLoading?: boolean

  label?: string
  labelClassName?: string

  labelPlacement?: 'top' | 'left' | 'inside'
}

export const AdvancedInput = ({
  ref,
  ...props
}: AdvancedInputProps & { ref?: React.RefObject<HTMLInputElement | null> }) => {
  const {
    className,
    type,
    label,

    isLoading,
    errorMessage,
    isInvalid,
    endContent,

    labelPlacement: _,
    inputClassName: __,

    bindValue,

    ...inputProps
  } = props
  const id = useId()

  const ctxProps = useAdvancedInputPropsContext()

  const { value, onChange, onBlur, onFocus, labelClassName, ...rest } =
    inputProps

  const [isFocused, setIsFocused] = React.useState(false)
  const handleFocus = React.useCallback(() => {
    setIsFocused(true)
  }, [])
  const handleBlur = React.useCallback(() => {
    setIsFocused(false)
  }, [])

  const [inputValue, setValue] = React.useState(inputProps.value)

  useEffect(() => {
    setValue(inputProps.value)
  }, [inputProps.value])

  const [isPasswordVisible, setIsPasswordVisible] = React.useState(false)

  const mergedProps = merge({}, ctxProps, props)
  const { labelPlacement = 'top' } = mergedProps

  const labelClassNames = clsxm(ctxProps.inputClassName, props.labelClassName)
  const inputClassNames = clsxm(ctxProps.inputClassName, props.inputClassName)

  return (
    <div className="flex w-full flex-col">
      <div
        className={clsxm(
          {
            'flex flex-col': labelPlacement === 'top',
            'flex grow flex-row items-center': labelPlacement === 'left',
          },
          'peer relative',
          className,
        )}
      >
        {label && (
          <Label
            htmlFor={id}
            className={clsx(
              {
                'mr-4': labelPlacement === 'left',
                'mb-2 flex': labelPlacement === 'top',
              },
              labelPlacement === 'inside' && {
                'absolute left-3 top-2 z-[1] select-none duration-200': true,
                'text-accent': isFocused,
                'bottom-2 top-2 flex items-center text-copy-16':
                  !value && !isFocused,
              },
              labelClassNames,
            )}
          >
            {label}
          </Label>
        )}
        <div className="relative grow">
          <input
            id={id}
            ref={ref}
            value={isUndefined(bindValue) ? inputValue : bindValue}
            className={clsxm(
              'flex h-10 w-full rounded-md border px-3 py-2 text-copy-13',
              'focus-visible:outline-hidden focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50',
              'border-neutral-3 bg-neutral-1 placeholder:text-neutral-7 focus-visible:border-accent',
              // 'placeholder:text-muted-foreground border-neutral-4 bg-neutral-1 focus-visible:border-accent',
              labelPlacement === 'inside' && 'h-auto pb-2 pt-8',
              type === 'password' && [
                'pr-6',
                !isPasswordVisible && 'font-mono',
              ],
              isLoading && 'pr-6',
              isInvalid && 'border-red-400! bg-red-600/50!',

              inputClassNames,
            )}
            type={
              type === 'password' && !isPasswordVisible ? 'password' : 'text'
            }
            onBlur={(e) => {
              handleBlur()
              onBlur?.(e)
            }}
            onChange={(e) => {
              setValue(e.target.value)
              onChange?.(e)
            }}
            onFocus={(e) => {
              handleFocus()
              onFocus?.(e)
            }}
            {...rest}
          />
          {type === 'password' && !isLoading && (
            <MotionButtonBase
              className={rightContentVariants({
                placement: labelPlacement,
              })}
              onClick={() => {
                setIsPasswordVisible(!isPasswordVisible)
              }}
            >
              <i
                className={clsx(
                  'text-copy-16 text-neutral-7',

                  isPasswordVisible
                    ? 'i-mingcute-eye-line'
                    : 'i-mingcute-eye-close-line',
                )}
              />
            </MotionButtonBase>
          )}

          {!isLoading && endContent && (
            <div
              className={rightContentVariants({
                placement: labelPlacement,
              })}
            >
              {endContent}
            </div>
          )}

          {isLoading && (
            <div
              className={rightContentVariants({
                placement: labelPlacement,
              })}
            >
              <Spinner className="text-accent/80" size={18} />
            </div>
          )}
        </div>
      </div>
      {isInvalid && errorMessage && (
        <ErrorLabelLine errorMessage={errorMessage} id={id} />
      )}
    </div>
  )
}

const rightContentVariants = tv({
  base: 'absolute right-2',
  variants: {
    placement: {
      inside: 'bottom-2',
      left: 'bottom-0 top-0 flex items-center',
      top: 'bottom-0 top-0 flex items-center',
    },
  },
})

AdvancedInput.displayName = 'Input'
