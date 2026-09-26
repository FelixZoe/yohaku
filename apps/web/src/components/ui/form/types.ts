import type { DetailedHTMLProps, InputHTMLAttributes } from 'react'

export interface Rule<T = unknown> {
  message: string
  validator: (value: T) => boolean | Promise<boolean>
}

type ValidateStatus = 'error' | 'success'
export interface Field {
  getEl: () => HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null
  rules: (Rule<any> & { status?: ValidateStatus })[]

  setValue: (value: any) => void
  /**
   * `getCurrentValues` will return the transformed value
   * @param value field value
   */
  transform?: <X, T = string>(value: T) => X
}

export interface FormFieldBaseProps<T> extends Pick<Field, 'transform'> {
  label?: string
  name: string
  rules?: Rule<T>[]
}

export type InputFieldProps<T = string> = Omit<
  DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>,
  'name'
> &
  FormFieldBaseProps<T>
