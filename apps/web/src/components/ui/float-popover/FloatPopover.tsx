'use client'

import type { UseFloatingOptions } from '@floating-ui/react-dom'
import {
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
} from '@floating-ui/react-dom'
import { AnimatePresence, m } from 'motion/react'
import type { FC, PropsWithChildren, ReactElement } from 'react'
import * as React from 'react'
import {
  createContext,
  createElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { useIsMobile } from '~/atoms/hooks/viewport'
import useClickAway from '~/hooks/common/use-click-away'
import { useEventCallback } from '~/hooks/common/use-event-callback'
import { stopPropagation } from '~/lib/dom'
import { clsxm } from '~/lib/helper'

import { RootPortal } from '../portal'
import type { PresentSheetProps } from '../sheet'
import { PresentSheet } from '../sheet'
import { getPopoverAnimationConfig } from './animation'
import { popoverPanelClassNames } from './styles'

export const FloatPopover = function <T extends {}>(
  props: FloatPopoverProps<T> & {
    mobileAsSheet?: boolean
    sheet?: Partial<Omit<PresentSheetProps, 'content'>>
  },
) {
  const isMobile = useIsMobile()
  if (isMobile && props.mobileAsSheet) {
    const { triggerElement, TriggerComponent, triggerComponentProps } = props

    const Child = triggerElement
      ? triggerElement
      : TriggerComponent
        ? createElement(TriggerComponent as any, triggerComponentProps)
        : null

    return (
      <PresentSheet content={props.children} {...props.sheet}>
        {Child}
      </PresentSheet>
    )
  }
  return <RealFloatPopover {...props} />
}

type FloatPopoverProps<T> = PropsWithChildren<{
  triggerElement?: string | ReactElement<any>
  TriggerComponent?: FC<T>

  headless?: boolean
  wrapperClassName?: string
  trigger?: 'click' | 'hover' | 'both'
  padding?: number
  offset?: number
  popoverWrapperClassNames?: string
  popoverClassNames?: string

  triggerComponentProps?: T
  /**
   * 不消失
   */
  debug?: boolean

  animate?: boolean

  as?: keyof HTMLElementTagNameMap

  /**
   * @default popover
   */
  type?: 'tooltip' | 'popover'
  isDisabled?: boolean

  to?: HTMLElement

  onOpen?: () => void
  onClose?: () => void

  asChild?: boolean
}> &
  UseFloatingOptions

const PopoverActionContext = createContext<{
  close: () => void
}>(null!)
const RealFloatPopover = function FloatPopover<T extends {}>(
  props: FloatPopoverProps<T>,
) {
  const {
    headless = false,
    wrapperClassName: wrapperClassNames,
    TriggerComponent,
    triggerElement,
    trigger = 'hover',
    padding,
    offset: offsetValue,
    popoverWrapperClassNames,
    popoverClassNames,
    debug,
    animate: _animate = true,
    as: As = 'div',
    type = 'popover',
    triggerComponentProps,
    isDisabled,
    onOpen,
    onClose,
    to,
    asChild,
    ...floatingProps
  } = props

  const [open, setOpen] = useState(false)
  const {
    x,
    y,
    refs,
    strategy,
    isPositioned,
    elements,
    update,
    placement: resolvedPlacement,
  } = useFloating({
    middleware: floatingProps.middleware ?? [
      flip({ padding: padding ?? 20 }),
      offset(offsetValue ?? 10),
      shift(),
    ],

    strategy: floatingProps.strategy,
    placement: floatingProps.placement ?? 'bottom-start',
    whileElementsMounted: floatingProps.whileElementsMounted,
  })

  useEffect(() => {
    if (open && elements.reference && elements.floating) {
      const cleanup = autoUpdate(elements.reference, elements.floating, update)
      return cleanup
    }
  }, [open, elements, update])

  const containerRef = useRef<HTMLDivElement>(null)

  const doPopoverDisappear = useCallback(() => {
    if (debug) {
      return
    }
    setOpen(false)
  }, [debug])

  useClickAway(containerRef, (event) => {
    if (trigger === 'click' || trigger === 'both') {
      const target = event.target
      const reference = refs.reference.current
      if (
        target instanceof Node &&
        reference instanceof HTMLElement &&
        reference.contains(target)
      ) {
        return
      }
      doPopoverDisappear()
    }
  })

  const doPopoverShow = useEventCallback(() => {
    if (isDisabled) return
    setOpen(true)
  })

  const doPopoverToggle = useEventCallback(() => {
    if (isDisabled) return
    setOpen((current) => !current)
  })

  const handleMouseOut = useCallback(() => {
    doPopoverDisappear()
  }, [doPopoverDisappear])

  const hoverCloseTimerRef = useRef<number | null>(null)
  const cancelHoverClose = useCallback(() => {
    if (hoverCloseTimerRef.current === null) return
    window.clearTimeout(hoverCloseTimerRef.current)
    hoverCloseTimerRef.current = null
  }, [])
  const handleHoverEnter = useEventCallback(() => {
    cancelHoverClose()
    doPopoverShow()
  })
  const handleHoverLeave = useCallback(() => {
    cancelHoverClose()
    hoverCloseTimerRef.current = window.setTimeout(() => {
      hoverCloseTimerRef.current = null
      doPopoverDisappear()
    }, 80)
  }, [cancelHoverClose, doPopoverDisappear])

  useEffect(() => cancelHoverClose, [cancelHoverClose])

  const handlePopoverKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== 'Escape') return

      event.stopPropagation()
      doPopoverDisappear()

      const reference = refs.reference.current
      requestAnimationFrame(() => {
        if (reference instanceof HTMLElement) reference.focus()
      })
    },
    [doPopoverDisappear, refs.reference],
  )

  const listener = useMemo(() => {
    const baseListener = {
      // onFocus: doPopoverShow,
      // onBlur: doPopoverDisappear,
    }
    switch (trigger) {
      case 'click': {
        return {
          ...baseListener,
          onClick: doPopoverToggle,
        }
      }
      case 'hover': {
        return {
          ...baseListener,
          onBlur: handleHoverLeave,
          onFocus: handleHoverEnter,
          onMouseEnter: handleHoverEnter,
          onMouseLeave: handleHoverLeave,
        }
      }
      case 'both': {
        return {
          ...baseListener,
          onClick: doPopoverToggle,
          onMouseOver: doPopoverShow,
          onMouseOut: handleMouseOut,
        }
      }
    }
  }, [
    doPopoverShow,
    doPopoverToggle,
    handleHoverEnter,
    handleHoverLeave,
    handleMouseOut,
    trigger,
  ])

  const Child = triggerElement ? (
    triggerElement
  ) : TriggerComponent ? (
    React.cloneElement(
      createElement(TriggerComponent as any, triggerComponentProps),

      {
        tabIndex: 0,
      },
    )
  ) : (
    <></>
  )
  const TriggerWrapper = asChild ? (
    React.cloneElement(
      typeof Child === 'string' ? <span>{Child}</span> : Child,
      {
        ...listener,
        ref: refs.setReference,
      },
    )
  ) : (
    <As
      // @ts-ignore
      className={clsxm('inline-block', wrapperClassNames)}
      ref={refs.setReference}
      role={trigger === 'both' || trigger === 'click' ? 'button' : 'note'}
      {...listener}
    >
      {Child}
    </As>
  )

  useEffect(() => {
    if (refs.floating.current && open && type === 'popover') {
      refs.floating.current.focus()
    }
  }, [open, refs.floating, type])

  useEffect(() => {
    if (open) {
      onOpen?.()
    } else {
      onClose?.()
    }
  }, [onClose, onOpen, open])
  const actionCtxValue = useMemo(
    () => ({ close: doPopoverDisappear }),
    [doPopoverDisappear],
  )

  if (!props.children) {
    return TriggerWrapper
  }

  return (
    <>
      {TriggerWrapper}

      <AnimatePresence>
        {open && (
          <RootPortal to={to}>
            <m.div
              className={clsxm(
                'float-popover',
                'pointer-events-auto relative z-[99]',
                popoverWrapperClassNames,
              )}
              onWheel={stopPropagation}
              {...(trigger === 'hover' || trigger === 'both' ? listener : {})}
              ref={containerRef}
            >
              <m.div
                {...getPopoverAnimationConfig(resolvedPlacement)}
                ref={refs.setFloating}
                role={type === 'tooltip' ? 'tooltip' : 'dialog'}
                tabIndex={-1}
                className={clsxm(
                  !headless && [popoverPanelClassNames, 'p-4'],

                  'relative z-[2]',

                  type === 'tooltip'
                    ? `max-w-[25rem] break-all rounded-xl px-4 py-2`
                    : '',

                  popoverClassNames,
                )}
                style={{
                  ...getPopoverAnimationConfig(resolvedPlacement).style,
                  position: strategy,
                  top: y ?? '',
                  left: x ?? '',
                  visibility: isPositioned && x !== null ? 'visible' : 'hidden',
                }}
                onKeyDown={handlePopoverKeyDown}
              >
                <PopoverActionContext value={actionCtxValue}>
                  {props.children}
                </PopoverActionContext>
              </m.div>
            </m.div>
          </RootPortal>
        )}
      </AnimatePresence>
    </>
  )
}
