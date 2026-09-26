import type { FC, PropsWithChildren, ReactNode } from 'react'

import type { ModalContentPropsInternal } from './context'

export interface ModalProps {
  clickOutsideToDismiss?: boolean
  content: FC<ModalContentPropsInternal>
  contentClassName?: string
  CustomModalComponent?: FC<PropsWithChildren>
  label?: string
  max?: boolean
  modalClassName?: string
  modalContainerClassName?: string

  overlay?: boolean

  title: ReactNode

  wrapper?: FC
}
