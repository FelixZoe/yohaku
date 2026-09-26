'use client'

import './dropdown-menu.css'

import { Menu as MenuPrimitive } from '@base-ui/react/menu'
import * as React from 'react'

import { cn } from '~/lib/helper'

const DropdownMenu = MenuPrimitive.Root

const DropdownMenuTrigger = ({
  ref,
  asChild,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof MenuPrimitive.Trigger> & {
  asChild?: boolean
} & {
  ref?: React.RefObject<HTMLButtonElement | null>
}) => {
  if (asChild && React.isValidElement(children)) {
    return (
      <MenuPrimitive.Trigger
        ref={ref}
        {...props}
        render={children as React.ReactElement}
      />
    )
  }

  return (
    <MenuPrimitive.Trigger ref={ref} {...props}>
      {children}
    </MenuPrimitive.Trigger>
  )
}
DropdownMenuTrigger.displayName = 'DropdownMenuTrigger'

const DropdownMenuGroup = MenuPrimitive.Group

const DropdownMenuPortal = MenuPrimitive.Portal

const DropdownMenuSub = MenuPrimitive.SubmenuRoot

const DropdownMenuRadioGroup = MenuPrimitive.RadioGroup

const DropdownMenuSubTrigger = ({
  ref,
  className,
  inset,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof MenuPrimitive.SubmenuTrigger> & {
  inset?: boolean
} & {
  ref?: React.RefObject<React.ElementRef<
    typeof MenuPrimitive.SubmenuTrigger
  > | null>
}) => (
  <MenuPrimitive.SubmenuTrigger
    ref={ref}
    className={cn(
      'flex cursor-default select-none items-center rounded-xs px-2 py-1.5 text-copy-13 outline-hidden',
      'data-[highlighted]:bg-neutral-2/80 dark:data-[highlighted]:bg-neutral-3/80 data-[open]:bg-neutral-2 dark:data-[open]:bg-neutral-3',
      inset && 'pl-8',
      className,
    )}
    {...props}
  >
    {children}
    <i className="i-mingcute-down-line ml-auto size-4" />
  </MenuPrimitive.SubmenuTrigger>
)
DropdownMenuSubTrigger.displayName = 'DropdownMenuSubTrigger'

const DropdownMenuContent = ({
  ref,
  className,
  keepMounted = false,
  sideOffset = 4,
  side,
  align,
  alignOffset,

  positionMethod,
  ...props
}: React.ComponentPropsWithoutRef<typeof MenuPrimitive.Popup> & {
  sideOffset?: React.ComponentPropsWithoutRef<
    typeof MenuPrimitive.Positioner
  >['sideOffset']
  side?: React.ComponentPropsWithoutRef<typeof MenuPrimitive.Positioner>['side']
  align?: React.ComponentPropsWithoutRef<
    typeof MenuPrimitive.Positioner
  >['align']
  alignOffset?: React.ComponentPropsWithoutRef<
    typeof MenuPrimitive.Positioner
  >['alignOffset']
  keepMounted?: React.ComponentPropsWithoutRef<
    typeof MenuPrimitive.Portal
  >['keepMounted']
  positionMethod?: React.ComponentPropsWithoutRef<
    typeof MenuPrimitive.Positioner
  >['positionMethod']
} & {
  ref?: React.RefObject<React.ElementRef<typeof MenuPrimitive.Popup> | null>
}) => (
  <MenuPrimitive.Portal keepMounted={keepMounted}>
    <MenuPrimitive.Positioner
      align={align}
      alignOffset={alignOffset}
      className="z-50"
      positionMethod={positionMethod}
      side={side}
      sideOffset={sideOffset}
    >
      <MenuPrimitive.Popup
        ref={ref}
        className={cn(
          'dropdown-menu-popup min-w-32 overflow-hidden rounded-xl border border-black/5 bg-paper p-1 text-neutral-9 dark:border-white/8',
          'shadow-[0_2px_12px_rgba(0,0,0,0.04),0_0_0_0.5px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3),0_0_0_0.5px_rgba(255,255,255,0.04)]',
          className,
        )}
        {...props}
      />
    </MenuPrimitive.Positioner>
  </MenuPrimitive.Portal>
)
DropdownMenuContent.displayName = 'DropdownMenuContent'

const DropdownMenuItem = ({
  ref,
  className,
  inset,
  ...props
}: React.ComponentPropsWithoutRef<typeof MenuPrimitive.Item> & {
  inset?: boolean
  icon?: React.ReactNode
} & {
  ref?: React.RefObject<React.ElementRef<typeof MenuPrimitive.Item> | null>
}) => (
  <MenuPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex cursor-default select-none items-center rounded-md px-2 py-1.5 text-copy-13 outline-hidden transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      'data-[highlighted]:bg-neutral-2 dark:data-[highlighted]:bg-neutral-3',
      inset && 'pl-8',
      'focus-within:!outline-transparent',
      className,
    )}
    {...props}
  >
    {props.icon && (
      <span className="mr-1.5 inline-flex size-4 items-center justify-center">
        {props.icon}
      </span>
    )}
    {props.children}
    {/* Justify Fill */}
    {props.icon && <span className="ml-1.5 size-4" />}
  </MenuPrimitive.Item>
)
DropdownMenuItem.displayName = 'DropdownMenuItem'

const DropdownMenuLabel = ({
  ref,
  className,
  inset,
  ...props
}: React.ComponentPropsWithoutRef<typeof MenuPrimitive.GroupLabel> & {
  inset?: boolean
} & {
  ref?: React.RefObject<React.ElementRef<
    typeof MenuPrimitive.GroupLabel
  > | null>
}) => (
  <MenuPrimitive.GroupLabel
    ref={ref}
    className={cn(
      'px-2 py-1.5 text-copy-13 font-semibold',
      inset && 'pl-8',
      className,
    )}
    {...props}
  />
)
DropdownMenuLabel.displayName = 'DropdownMenuLabel'

const DropdownMenuSeparator = ({
  ref,
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof MenuPrimitive.Separator> & {
  ref?: React.RefObject<React.ElementRef<typeof MenuPrimitive.Separator> | null>
}) => (
  <MenuPrimitive.Separator
    className={cn('-mx-1 my-1 h-px bg-black/5 dark:bg-white/8', className)}
    ref={ref}
    {...props}
  />
)
DropdownMenuSeparator.displayName = 'DropdownMenuSeparator'

const DropdownMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => (
  <span
    className={cn(
      'ml-auto text-label-12 tracking-widest opacity-60',
      className,
    )}
    {...props}
  />
)
DropdownMenuShortcut.displayName = 'DropdownMenuShortcut'

export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
}
