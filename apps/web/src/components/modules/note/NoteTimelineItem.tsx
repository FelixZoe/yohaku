'use client'

import type { TargetAndTransition, Transition } from 'motion/react'
import { m } from 'motion/react'
import type { MouseEvent } from 'react'
import { memo, useCallback } from 'react'
import { tv } from 'tailwind-variants'

import { Link } from '~/i18n/navigation'
import { clsxm } from '~/lib/helper'
import { routeBuilder, Routes } from '~/lib/route-builder'
import { springScrollToTop } from '~/lib/scroller'

const styles = tv({
  base: 'flex max-w-full min-w-0 items-baseline text-left text-copy-13 leading-[1.45] tabular-nums transition-colors',
  variants: {
    variant: {
      default: 'text-neutral-7 hover:text-neutral-8',
      muted: 'text-neutral-6 hover:text-neutral-7',
    },
    status: {
      active: 'text-neutral-9 font-medium',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})
const initialLi: TargetAndTransition = {
  opacity: 0.0001,
}
const animateLi: TargetAndTransition = {
  opacity: 1,
}
const layoutTransition: Transition = {
  duration: 0.32,
  ease: [0.22, 1, 0.36, 1],
}
const bracketClass = 'text-accent inline-block shrink-0 align-bottom'

export const NoteTimelineItem = memo<{
  active: boolean
  createdAt?: Date | string
  title: string
  nid: number
  slug?: string | null

  layout?: boolean
  variant?: 'default' | 'muted'
  onSelect?: (nid: number) => void
}>((props) => {
  const { active, nid, title, layout, slug, createdAt, variant, onSelect } =
    props
  const href = routeBuilder(Routes.Note, {
    id: nid,
    slug: slug || undefined,
    createdAt,
  })

  const handleClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      springScrollToTop()
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return
      }
      onSelect?.(nid)
    },
    [nid, onSelect],
  )

  return (
    <m.li
      animate={animateLi}
      className="flex h-7 w-full max-w-full items-center"
      exit={initialLi}
      initial={initialLi}
      layout={layout}
      layoutId={layout ? `note-${nid}` : undefined}
      transition={layoutTransition}
    >
      <Link
        href={href}
        className={clsxm(
          active ? styles({ status: 'active', variant }) : styles({ variant }),
        )}
        onClick={handleClick}
      >
        {active && (
          <m.span
            aria-hidden="true"
            className={bracketClass}
            layoutId={layout ? 'note-bracket-left' : undefined}
            transition={layoutTransition}
          >
            「
          </m.span>
        )}
        <span className="min-w-0 truncate">{title}</span>
        {active && (
          <m.span
            aria-hidden="true"
            className={bracketClass}
            layoutId={layout ? 'note-bracket-right' : undefined}
            transition={layoutTransition}
          >
            」
          </m.span>
        )}
      </Link>
    </m.li>
  )
})
NoteTimelineItem.displayName = 'MemoedItem'
