import { AnimatePresence } from 'motion/react'
import type { FC, ReactNode } from 'react'
import * as React from 'react'
import { useId, useMemo } from 'react'

import { clsxm } from '~/lib/helper'
import { jotaiStore } from '~/lib/store'

import { modalStackAtom } from './context'
import { ModalInternal } from './modal'
import type { ModalProps } from './types'

interface DeclarativeModalProps extends Omit<ModalProps, 'content'> {
  children?: ReactNode
  id?: string
  onOpenChange?: (open: boolean) => void

  open?: boolean
}

const Noop = () => null
const DeclarativeModalImpl: FC<DeclarativeModalProps> = ({
  open,
  onOpenChange,
  children,
  ...rest
}) => {
  const index = useMemo(() => jotaiStore.get(modalStackAtom).length, [])

  const id = useId()
  const item = useMemo(
    () => ({
      ...rest,
      content: Noop,
      id,
    }),
    [id, rest],
  )
  return (
    <AnimatePresence>
      {open && (
        <ModalInternal isTop index={index} item={item} onClose={onOpenChange}>
          {children}
        </ModalInternal>
      )}
    </AnimatePresence>
  )
}

const FooterAction: Component = ({ children, className }) => (
  <div className={clsxm('mt-4 flex items-center justify-end gap-2', className)}>
    {children}
  </div>
)

export const DeclarativeModal = Object.assign(DeclarativeModalImpl, {
  FooterAction,
})
