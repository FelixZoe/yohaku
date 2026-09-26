import type { DetailedHTMLProps, FC, InputHTMLAttributes } from 'react'
import { memo, useCallback, useId, useRef } from 'react'

import { AutoResizeHeight } from '~/components/modules/shared/AutoResizeHeight'
import { isDev } from '~/lib/env'
import { clsxm } from '~/lib/helper'

import { Input } from '../input'
import { Label } from '../label'
import { useFormConfig } from './FormContext'
import {
  useAddField,
  useCheckFieldStatus,
  useFormErrorMessage,
  useResetFieldStatus,
} from './hooks'
import type { FormFieldBaseProps } from './types'

export const FormInput: FC<
  Omit<
    DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>,
    'name'
  > &
    FormFieldBaseProps<string>
> = memo(({ className, rules, onKeyDown, transform, name, label, ...rest }) => {
  const { showErrorMessage } = useFormConfig()

  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  const errorMessage = useFormErrorMessage(name)

  const resetFieldStatus = useResetFieldStatus(name)

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (onKeyDown) onKeyDown(e)
      resetFieldStatus()
    },
    [onKeyDown, resetFieldStatus],
  )

  const validateField = useCheckFieldStatus(name)
  useAddField({
    rules: rules || [],
    transform,
    getEl: () => inputRef.current,
    name,
    setValue: useCallback(
      (value) => {
        const $el = inputRef.current
        if (!$el) {
          isDev && console.error('element not found')
          return
        }
        $el.value = value

        validateField()
      },
      [validateField],
    ),
  })

  return (
    <div className="flex w-full flex-col gap-1.5">
      {label && (
        <Label
          className="text-left text-[0.8em] font-medium text-neutral-9/70"
          htmlFor={id}
        >
          {label}
        </Label>
      )}
      <Input
        id={id}
        name={name}
        ref={inputRef}
        type="text"
        className={clsxm(
          !!errorMessage && 'ring-2 ring-red-400 dark:ring-orange-700',
          'w-full',
          className,
        )}
        onKeyDown={handleKeyDown}
        onBlur={(e) => {
          validateField()
          rest.onBlur?.(e)
        }}
        {...rest}
      />

      {showErrorMessage && (
        <AutoResizeHeight duration={0.2}>
          <p className="text-left text-copy-13 text-red-400 dark:text-orange-700">
            {errorMessage}
          </p>
        </AutoResizeHeight>
      )}
    </div>
  )
})

FormInput.displayName = 'FormInput'
