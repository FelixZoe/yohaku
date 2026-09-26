'use client'

import type { FC, MouseEvent } from 'react'
import { memo, useCallback, useMemo, useRef } from 'react'
import { tv } from 'tailwind-variants'

import { clsxm } from '~/lib/helper'

const styles = tv({
  base: clsxm(
    'relative mb-[1.5px] inline-block min-w-0 max-w-full leading-normal',
    'truncate text-left tabular-nums',
    'transition-[opacity,color] duration-300 ease-in-out',
  ),
  variants: {
    status: {
      active: 'text-accent font-medium opacity-100',
      'in-range': 'text-neutral-8 opacity-70',
      inactive: 'text-neutral-8 opacity-35 hover:opacity-80',
    },
  },
  defaultVariants: {
    status: 'inactive',
  },
})

export interface ITocItem {
  $heading: HTMLHeadingElement
  anchorId: string
  depth: number
  index: number
  title: string
}

export type TocItemStatus = 'active' | 'in-range' | 'inactive'

export const TocItem: FC<{
  heading: ITocItem
  status: TocItemStatus
  rootDepth: number
  onClick?: (i: number, $el: HTMLElement | null, anchorId: string) => void
}> = memo((props) => {
  const { status, rootDepth, onClick, heading } = props
  const { $heading, anchorId, depth, index, title } = heading

  const $ref = useRef<HTMLAnchorElement>(null)

  const renderDepth = useMemo(() => depth - rootDepth, [depth, rootDepth])

  return (
    <a
      className={clsxm(styles({ status }))}
      data-depth={depth}
      data-index={index}
      href={`#${anchorId}`}
      ref={$ref}
      title={title}
      style={useMemo(
        () => ({
          paddingLeft:
            depth >= rootDepth ? `${renderDepth * 0.6 + 1}rem` : '1rem',
        }),
        [depth, renderDepth, rootDepth],
      )}
      onClick={useCallback(
        (e: MouseEvent) => {
          e.preventDefault()
          onClick?.(index, $heading, anchorId)
        },
        [onClick, index, $heading, anchorId],
      )}
    >
      <span className="cursor-pointer">{title}</span>
    </a>
  )
})

TocItem.displayName = 'TocItem'
