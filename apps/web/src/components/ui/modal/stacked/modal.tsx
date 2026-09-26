'use client'

import { Dialog } from '@base-ui/react/dialog'
import { useAtomValue, useSetAtom } from 'jotai'
import { selectAtom } from 'jotai/utils'
import type { AnimationDefinition } from 'motion/react'
import { m, useAnimationControls, useDragControls } from 'motion/react'
import type { SyntheticEvent } from 'react'
import {
  createElement,
  Fragment,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { useIsMobile } from '~/atoms/hooks/viewport'
import { CloseIcon } from '~/components/icons/close'
import { useEventCallback } from '~/hooks/common/use-event-callback'
import { useIsUnMounted } from '~/hooks/common/use-is-unmounted'
import { nextFrame, stopPropagation } from '~/lib/dom'
import { clsxm } from '~/lib/helper'
import { jotaiStore } from '~/lib/store'

import type { SheetRef } from '../../sheet'
import { PresentSheet, sheetStackAtom } from '../../sheet'
import { MODAL_STACK_Z_INDEX, modalMontionConfig } from './constants'
import type {
  CurrentModalContentProps,
  ModalContentPropsInternal,
} from './context'
import { CurrentModalContext, modalStackAtom } from './context'
import type { ModalProps } from './types'

export const ModalInternal: Component<{
  item: ModalProps & { id: string }
  index: number

  isTop: boolean
  onClose?: (open: boolean) => void
}> = memo(({ item, index, onClose: onPropsClose, children, isTop }) => {
  const setStack = useSetAtom(modalStackAtom)
  const close = useEventCallback(() => {
    setStack((p) => p.filter((modal) => modal.id !== item.id))
    onPropsClose?.(false)
  })

  const currentIsClosing = useAtomValue(
    useMemo(
      () =>
        selectAtom(modalStackAtom, (atomValue) =>
          atomValue.every((modal) => modal.id !== item.id),
        ),
      [item.id],
    ),
  )
  useEffect(() => {
    if (currentIsClosing) {
      // Radix dialog will block pointer events
      document.body.style.pointerEvents = 'auto'
    }
  }, [currentIsClosing])

  const onClose = useCallback(
    (open: boolean): void => {
      if (!open) {
        close()
      }
    },
    [close],
  )

  const {
    CustomModalComponent,
    modalClassName,
    content,
    contentClassName,
    title,
    label,
    clickOutsideToDismiss,
    modalContainerClassName,
    wrapper: Wrapper = Fragment,
    max,
  } = item
  const zIndexStyle = useMemo(
    () => ({ zIndex: MODAL_STACK_Z_INDEX + (index + 1) * 2 }),
    [index],
  )

  const dismiss = useCallback(
    (e: SyntheticEvent) => {
      stopPropagation(e)
      close()
    },
    [close],
  )
  const isMobile = useIsMobile()
  const isUnmounted = useIsUnMounted()
  const animateController = useAnimationControls()
  const dragController = useDragControls()
  useEffect(() => {
    if (isMobile) return
    nextFrame(() => {
      animateController.start(modalMontionConfig.animate as AnimationDefinition)
    })
  }, [animateController, isMobile])
  const noticeModal = useCallback(() => {
    animateController
      .start({
        scale: 1.01,
        transition: {
          duration: 0.06,
        },
      })
      .then(() => {
        if (isUnmounted.current) return
        animateController.start({
          scale: 1,
        })
      })
  }, [animateController])

  useEffect(() => {
    if (isTop) return
    animateController.start({
      scale: 0.96,
      y: -8,
      transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
    })
    return () => {
      try {
        animateController.stop()
        animateController.start({
          scale: 1,
          y: 0,
          transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
        })
      } catch {
        /* empty */
      }
    }
  }, [isTop])

  const [modalContentRef, setModalContentRef] = useState<HTMLDivElement | null>(
    null,
  )
  const ModalProps: ModalContentPropsInternal = useMemo(
    () => ({
      dismiss: () => {
        sheetRef.current?.dismiss()
        close()
      },
    }),
    [close],
  )

  const ModalContextProps = useMemo<CurrentModalContentProps>(
    () => ({
      ...ModalProps,
      ref: modalContentRef,
    }),
    [ModalProps],
  )
  const finalChildren = (
    <CurrentModalContext value={ModalContextProps}>
      {children ?? createElement(content, ModalProps)}
    </CurrentModalContext>
  )

  const edgeElementRef = useRef<HTMLDivElement>(null)

  const sheetRef = useRef<SheetRef>(null)

  if (isMobile) {
    const drawerLength = jotaiStore.get(sheetStackAtom).length

    return (
      <Wrapper>
        <PresentSheet
          defaultOpen
          content={finalChildren}
          ref={sheetRef}
          title={title}
          zIndex={1000 + drawerLength}
          onOpenChange={(open) => {
            if (!open) {
              setTimeout(() => {
                close()
              }, 1000)
            }
          }}
        />
      </Wrapper>
    )
  }

  if (CustomModalComponent) {
    return (
      <Wrapper>
        <Dialog.Root open onOpenChange={onClose}>
          <Dialog.Portal>
            <Dialog.Popup
              ref={setModalContentRef}
              style={zIndexStyle}
              className={clsxm(
                'fixed inset-0 z-20 overflow-auto',
                currentIsClosing
                  ? 'pointer-events-none!'
                  : 'pointer-events-auto',

                modalContainerClassName,
              )}
              onClick={clickOutsideToDismiss ? dismiss : undefined}
            >
              <Dialog.Title className="sr-only">{title}</Dialog.Title>
              <div className="contents" onClick={stopPropagation}>
                <CustomModalComponent>{finalChildren}</CustomModalComponent>
              </div>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
      </Wrapper>
    )
  }
  return (
    <Wrapper>
      <Dialog.Root open onOpenChange={onClose}>
        <Dialog.Portal>
          <Dialog.Popup
            ref={edgeElementRef}
            style={zIndexStyle}
            className={clsxm(
              'center fixed inset-0 z-20 flex',
              currentIsClosing ? 'pointer-events-none!' : 'pointer-events-auto',
              modalContainerClassName,
            )}
            onClick={clickOutsideToDismiss ? dismiss : noticeModal}
          >
            <m.div
              ref={setModalContentRef}
              style={{ ...zIndexStyle, transformOrigin: 'center top' }}
              {...modalMontionConfig}
              drag
              animate={animateController}
              dragConstraints={edgeElementRef}
              dragControls={dragController}
              dragElastic={0}
              dragListener={false}
              dragMomentum={false}
              className={clsxm(
                'relative flex flex-col overflow-hidden rounded-xl',
                'bg-paper',
                'shadow-[0_2px_12px_rgba(0,0,0,0.04),0_0_0_0.5px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3),0_0_0_0.5px_rgba(255,255,255,0.04)]',
                max
                  ? 'h-[90vh] w-[90vw]'
                  : 'max-h-[70vh] min-w-[300px] max-w-[90vw] lg:max-h-[calc(100vh-20rem)] lg:max-w-[70vw]',
                'border border-black/5 dark:border-white/8',
                modalClassName,
              )}
              whileDrag={{
                cursor: 'grabbing',
              }}
              onClick={stopPropagation}
            >
              <Dialog.Close
                className="absolute right-3.5 top-3.5 z-10 flex size-6 items-center justify-center rounded-md hover:bg-neutral-2 text-neutral-5 dark:hover:bg-white/6 transition-colors duration-200"
                onClick={close}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <CloseIcon />
              </Dialog.Close>
              <div
                className="px-5 pt-3 pb-2.5"
                onPointerDown={(e) => dragController.start(e)}
              >
                {label && (
                  <div className="text-caption-10 uppercase tracking-[4px] text-neutral-6">
                    {label}
                  </div>
                )}
                <Dialog.Title className="min-w-0 truncate pr-8 text-copy-15 font-medium leading-normal">
                  {title}
                </Dialog.Title>
              </div>
              <div
                className={clsxm(
                  'min-h-0 shrink grow overflow-auto px-5 pb-5 pt-4',
                  contentClassName,
                )}
              >
                {finalChildren}
              </div>
            </m.div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </Wrapper>
  )
})
