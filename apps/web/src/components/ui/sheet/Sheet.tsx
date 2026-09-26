import './Sheet.css'

import { Drawer } from '@base-ui/react/drawer'
import { atom, useStore } from 'jotai'
import type { FC, PropsWithChildren, ReactNode } from 'react'
import * as React from 'react'
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react'

import { CloseIcon } from '~/components/icons/close'

import { SheetContext } from './context'

export interface PresentSheetProps {
  content: ReactNode | FC
  defaultOpen?: boolean
  dismissible?: boolean
  onOpenChange?: (value: boolean) => void
  open?: boolean
  title?: ReactNode
  triggerAsChild?: boolean

  zIndex?: number
}

export const sheetStackAtom = atom([] as HTMLDivElement[])

export type SheetRef = {
  dismiss: () => void
}

type DrawerOpenChangeDetails = Parameters<
  NonNullable<React.ComponentProps<typeof Drawer.Root>['onOpenChange']>
>[1]

const blockedDismissReasons = new Set([
  'close-press',
  'close-watcher',
  'escape-key',
  'focus-out',
  'outside-press',
  'swipe',
])

const isNativeButtonElement = (node: ReactNode) =>
  React.isValidElement(node) && node.type === 'button'

export const PresentSheet = ({
  ref,
  ...props
}: PropsWithChildren<PresentSheetProps> & {
  ref?: React.RefObject<SheetRef | null>
}) => {
  const {
    content,
    children,
    zIndex = 1000,
    title,
    dismissible = true,
    defaultOpen,
    triggerAsChild,
    onOpenChange,
    open: controlledOpen,
  } = props

  const [internalOpen, setInternalOpen] = useState(defaultOpen ?? false)
  const isOpen = controlledOpen ?? internalOpen

  const setOpen = useCallback(
    (nextOpen: boolean) => {
      setInternalOpen(nextOpen)
      onOpenChange?.(nextOpen)
    },
    [onOpenChange],
  )

  useImperativeHandle(
    ref,
    () => ({
      dismiss: () => {
        setOpen(false)
      },
    }),
    [setOpen],
  )

  const handleOpenChange = useCallback(
    (nextOpen: boolean, eventDetails?: DrawerOpenChangeDetails) => {
      if (
        !nextOpen &&
        !dismissible &&
        eventDetails &&
        blockedDismissReasons.has(eventDetails.reason)
      ) {
        eventDetails.cancel()
        return
      }

      setOpen(nextOpen)
    },
    [dismissible, setOpen],
  )

  const nextRootProps = useMemo(() => {
    const nextProps: React.ComponentProps<typeof Drawer.Root> = {
      onOpenChange: handleOpenChange,
      open: isOpen,
    }

    return nextProps
  }, [handleOpenChange, isOpen])

  const [holderRef, setHolderRef] = useState<HTMLDivElement | null>()
  const store = useStore()

  useEffect(() => {
    const holder = holderRef
    if (!holder) return
    store.set(sheetStackAtom, (p) => p.concat(holder))

    return () => {
      store.set(sheetStackAtom, (p) => p.filter((item) => item !== holder))
    }
  }, [holderRef, store])

  const overlayZIndex = zIndex - 1
  const contentZIndex = zIndex
  const sheetContextValue = useMemo(
    () => ({
      dismiss() {
        setOpen(false)
      },
    }),
    [setOpen],
  )
  const trigger =
    triggerAsChild && React.isValidElement(children) ? (
      <Drawer.Trigger
        nativeButton={isNativeButtonElement(children)}
        render={children}
      />
    ) : (
      <Drawer.Trigger>{children}</Drawer.Trigger>
    )

  return (
    <Drawer.Root
      disablePointerDismissal={!dismissible}
      swipeDirection="down"
      {...nextRootProps}
    >
      {!!children && trigger}
      <Drawer.Portal>
        <Drawer.Backdrop
          className="sheet-backdrop fixed inset-0 bg-neutral-9/25 dark:bg-neutral-1/25"
          style={{
            zIndex: overlayZIndex,
          }}
        />
        <Drawer.Viewport
          className="fixed inset-0"
          style={{
            zIndex: contentZIndex,
          }}
        >
          <Drawer.Popup className="sheet-popup fixed inset-x-0 bottom-2 flex max-h-[calc(100svh-5rem)] flex-col px-3.5 pb-3.5">
            <Drawer.Content
              className={[
                'flex max-h-[calc(100svh-5rem)] flex-col overflow-hidden',
                'rounded-[20px]',
                'bg-[#fefefb] dark:bg-neutral-2',
                'border border-black/5 dark:border-white/[0.04]',
                'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_14px_rgba(0,0,0,0.06)]',
                'dark:shadow-[0_1px_2px_rgba(0,0,0,0.15),0_4px_12px_rgba(0,0,0,0.1)]',
              ].join(' ')}
            >
              {(title || dismissible) && (
                <div className="flex items-center justify-between px-5 pt-4">
                  {title ? (
                    <Drawer.Title className="min-w-0 truncate pr-8 text-copy-15 font-medium leading-normal">
                      {title}
                    </Drawer.Title>
                  ) : (
                    <span />
                  )}
                  {dismissible && (
                    <button
                      className="flex size-6 shrink-0 items-center justify-center text-neutral-5 transition-colors duration-200 hover:text-neutral-8"
                      type="button"
                      onClick={() => setOpen(false)}
                    >
                      <CloseIcon />
                    </button>
                  )}
                </div>
              )}

              <div className="min-h-0 shrink grow overflow-auto px-5 pb-5 pt-4">
                <SheetContext value={sheetContextValue}>
                  {typeof content === 'function'
                    ? React.createElement(content)
                    : content}
                </SheetContext>
                <div ref={setHolderRef} />
              </div>
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
