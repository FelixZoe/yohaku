import { Tabs as TabsPrimitive } from '@base-ui/react/tabs'
import type { MotionProps } from 'motion/react'
import { LayoutGroup, m } from 'motion/react'
import type { ReactNode } from 'react'
import * as React from 'react'

import { clsxm } from '~/lib/helper'

export const Root = ({
  ref: forwardedRef,
  className,
  ...rest
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root> & {
  ref?: React.RefObject<React.ElementRef<typeof TabsPrimitive.Root> | null>
}) => (
  <TabsPrimitive.Root
    className={clsxm('flex flex-col', className)}
    ref={forwardedRef}
    {...rest}
  />
)

Root.displayName = 'Tabs.Root'

export const List = ({
  ref: forwardedRef,
  id,
  className,
  children,
  ...rest
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & {
  id?: string
} & {
  ref?: React.RefObject<React.ElementRef<typeof TabsPrimitive.List> | null>
}) => (
  <TabsPrimitive.List
    className={clsxm('inline-flex gap-5', className)}
    id={id}
    ref={forwardedRef}
    {...rest}
  >
    <LayoutGroup id={id}>{children}</LayoutGroup>
  </TabsPrimitive.List>
)

List.displayName = 'Tabs.List'

export const Trigger = ({
  ref: forwardedRef,
  selected,
  focused,
  badge,
  raw,
  className,
  children,
  ...rest
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Tab> & {
  selected?: boolean
  focused?: boolean
  badge?: ReactNode
  raw?: boolean
} & {
  ref?: React.RefObject<React.ElementRef<typeof TabsPrimitive.Tab> | null>
}) => {
  if (raw) {
    return (
      <TabsPrimitive.Tab className={className} ref={forwardedRef} {...rest}>
        {children}
      </TabsPrimitive.Tab>
    )
  }

  return (
    <TabsPrimitive.Tab
      ref={forwardedRef}
      className={clsxm(
        'relative flex px-2 py-1 text-copy-13 font-bold focus:outline-hidden',
        'text-neutral-7 transition-colors duration-300',
        selected && 'text-accent',
        className,
      )}
      {...rest}
    >
      <span className="z-10 inline-flex items-center gap-1">{children}</span>

      <div className="absolute right-0 top-0 z-20 -translate-y-1/2 translate-x-1/2">
        {badge}
      </div>

      {selected && (
        <m.span
          className="absolute -bottom-1 h-0.5 w-[calc(100%-16px)] rounded bg-accent"
          layoutId="tab-selected-underline"
        />
      )}

      {focused && (
        <m.span
          layoutId="tab-focused-highlight"
          className={clsxm(
            'absolute inset-0 z-0 size-full rounded-md',
            'bg-neutral-2',
          )}
          transition={{
            layout: {
              duration: 0.2,
              ease: 'easeOut',
            },
          }}
        />
      )}
    </TabsPrimitive.Tab>
  )
}

Trigger.displayName = 'Tabs.Trigger'

type PagerProps = {
  index: number
}

export const Pager: Component<PagerProps & MotionProps> = ({
  index,
  className,
  children,
  ...rest
}) => (
  <m.div
    className={clsxm('flex size-full', className)}
    initial={false}
    animate={{
      x: `${-100 * index}%`,
    }}
    {...rest}
  >
    {children}
  </m.div>
)

export const Content = ({
  ref: forwardedRef,
  className,
  children,
  ...rest
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Panel> & {
  ref?: React.RefObject<React.ElementRef<typeof TabsPrimitive.Panel> | null>
}) => (
  <TabsPrimitive.Panel
    className={clsxm('size-full shrink-0', className)}
    ref={forwardedRef}
    {...rest}
  >
    {children}
  </TabsPrimitive.Panel>
)

Content.displayName = 'Tabs.Content'
