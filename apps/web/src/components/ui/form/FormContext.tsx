import { atom } from 'jotai'
import { createContext, use } from 'react'

import type { Field } from './types'

const initialFields = atom({} as Record<string, Field>)
export interface FormContextType {
  addField: (name: string, field: Field) => void
  fields: typeof initialFields
  getCurrentValues: () => Record<string, any>
  getField: (name: string) => Field | undefined
  removeField: (name: string) => void
  setValue: (name: string, value: any) => void
}

export const FormContext = createContext<FormContextType>(null!)

export const FormConfigContext = createContext<{
  showErrorMessage?: boolean
}>(null!)
export const useForm = () => use(FormContext)
export const useFormConfig = () => use(FormConfigContext)
