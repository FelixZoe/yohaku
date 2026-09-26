import { m } from 'motion/react'

import { useIsDark } from '~/hooks/common/use-is-dark'

import { RootPortal } from '../../portal'

export const ModalOverlay = ({
  zIndex,
  stackSize = 1,
}: {
  zIndex?: number
  stackSize?: number
}) => {
  const isDark = useIsDark()
  const opacity = stackSize > 1 ? (isDark ? 0.45 : 0.3) : isDark ? 0.15 : 0.12

  return (
    <RootPortal>
      <m.div
        animate={{ opacity: 1 }}
        className="pointer-events-none fixed inset-0 z-[11] transition-[background-color] duration-300"
        exit={{ opacity: 0 }}
        id="modal-overlay"
        initial={{ opacity: 0 }}
        style={{ zIndex, backgroundColor: `rgba(0,0,0,${opacity})` }}
      />
    </RootPortal>
  )
}
