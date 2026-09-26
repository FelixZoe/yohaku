'use client'

import { ScrollArea as ScrollAreaBase } from '@base-ui/react/scroll-area'
import * as React from 'react'

import { stopPropagation } from '~/lib/dom'
import { clsxm } from '~/lib/helper'

const Corner = ({
  ref: forwardedRef,
  className,
  ...rest
}: React.ComponentPropsWithoutRef<typeof ScrollAreaBase.Corner> & {
  ref?: React.RefObject<React.ElementRef<typeof ScrollAreaBase.Corner> | null>
}) => (
  <ScrollAreaBase.Corner
    {...rest}
    className={clsxm('bg-accent', className)}
    ref={forwardedRef}
  />
)

Corner.displayName = 'ScrollArea.Corner'

const Thumb = ({
  ref: forwardedRef,
  className,
  ...rest
}: React.ComponentPropsWithoutRef<typeof ScrollAreaBase.Thumb> & {
  ref?: React.RefObject<React.ElementRef<typeof ScrollAreaBase.Thumb> | null>
}) => (
  <ScrollAreaBase.Thumb
    {...rest}
    ref={forwardedRef}
    className={clsxm(
      'relative w-full flex-1 rounded-xl transition-colors duration-150',
      'bg-neutral-4 hover:bg-neutral-5/80',
      'active:bg-neutral-5',
      'before:absolute before:-left-1/2 before:-top-1/2 before:h-full before:min-h-[44]',
      'before:w-full before:min-w-[44] before:-translate-x-full before:-translate-y-full before:content-[""]',

      className,
    )}
  />
)
Thumb.displayName = 'ScrollArea.Thumb'

const Scrollbar = ({
  ref: forwardedRef,
  className,
  children,
  ...rest
}: React.ComponentPropsWithoutRef<typeof ScrollAreaBase.Scrollbar> & {
  ref?: React.RefObject<React.ElementRef<
    typeof ScrollAreaBase.Scrollbar
  > | null>
}) => {
  const { orientation = 'vertical' } = rest
  return (
    <ScrollAreaBase.Scrollbar
      {...rest}
      ref={forwardedRef}
      className={clsxm(
        'z-[10000] flex touch-none select-none p-0.5',
        'opacity-0 transition-opacity duration-200 group-hover:opacity-100',
        orientation === 'horizontal'
          ? 'mb-1 h-2.5 w-full flex-col'
          : 'mr-1 w-2.5 flex-row',
        className,
      )}
    >
      {children}
      <Thumb />
    </ScrollAreaBase.Scrollbar>
  )
}
Scrollbar.displayName = 'ScrollArea.Scrollbar'

const Viewport = ({
  ref: forwardedRef,
  className,
  mask,
  ...rest
}: React.ComponentPropsWithoutRef<typeof ScrollAreaBase.Viewport> & {
  mask?: boolean
} & {
  ref?: React.RefObject<React.ElementRef<typeof ScrollAreaBase.Viewport> | null>
}) => {
  const ref = React.useRef<HTMLDivElement>(null)

  React.useImperativeHandle(forwardedRef, () => ref.current as HTMLDivElement)
  return (
    <ScrollAreaBase.Viewport
      {...rest}
      className={clsxm('block size-full', mask && 'mask-scroller', className)}
      ref={ref}
    />
  )
}
Viewport.displayName = 'ScrollArea.Viewport'

const Root = ({
  ref: forwardedRef,
  className,
  children,
  ...rest
}: React.ComponentPropsWithoutRef<typeof ScrollAreaBase.Root> & {
  ref?: React.RefObject<React.ElementRef<typeof ScrollAreaBase.Root> | null>
}) => (
  <ScrollAreaBase.Root
    {...rest}
    className={clsxm('group overflow-hidden', className)}
    ref={forwardedRef}
  >
    {children}
    <Corner />
  </ScrollAreaBase.Root>
)

Root.displayName = 'ScrollArea.Root'

export const ScrollArea = ({
  ref,
  flex,
  children,
  mask,
  rootClassName,
  viewportClassName,
  scrollbarClassName,
}: React.PropsWithChildren & {
  rootClassName?: string
  viewportClassName?: string
  scrollbarClassName?: string
  flex?: boolean
  mask?: boolean
} & { ref?: React.RefObject<HTMLDivElement | null> }) => (
  <Root className={rootClassName}>
    <Viewport
      mask={mask}
      ref={ref}
      className={clsxm(
        flex ? '[&>div]:!flex [&>div]:!flex-col' : '',
        viewportClassName,
      )}
      onWheel={stopPropagation}
    >
      {children}
    </Viewport>
    {/* The viewport ships with `base-ui-disable-scrollbar`, so the native bars are
        hidden and whichever axis goes unrendered here is unreachable by pointer.
        Both axes are mounted unconditionally; Base UI drops a bar whose axis has
        no overflow. */}
    <Scrollbar className={scrollbarClassName} />
    <Scrollbar className={scrollbarClassName} orientation="horizontal" />
  </Root>
)
