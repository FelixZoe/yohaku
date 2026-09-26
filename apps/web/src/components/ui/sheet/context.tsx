import { createContext } from 'react'

interface SheetContextValue {
  dismiss: () => void
}
export const SheetContext = createContext<SheetContextValue>(null!)
