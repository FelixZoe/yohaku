'use client'
import type { ComponentProps, FC, SyntheticEvent } from 'react'
import { useCallback } from 'react'

import useIsCommandOrControlPressed from '~/hooks/common/use-is-command-or-control-pressed'
import { Link, usePathname } from '~/i18n/navigation'
import { preventDefault } from '~/lib/dom'
import { Routes } from '~/lib/route-builder'

import { readPeekOrigin } from './peek-motion'
import { usePeek } from './usePeek'

export const PeekLink: FC<ComponentProps<typeof Link>> = (props) => {
  const { href, children, ref, ...rest } = props

  const peek = usePeek()

  const pathname = usePathname()
  const isCommandPressed = useIsCommandOrControlPressed()

  const handlePeek = useCallback(
    async (e: SyntheticEvent<HTMLAnchorElement>) => {
      if (pathname === '/' || pathname === Routes.Posts) {
        return
      }
      if (isCommandPressed) return
      if (typeof href !== 'string') return
      const success = peek(href, readPeekOrigin(e.currentTarget, 'text'))
      if (success) preventDefault(e)
    },
    [href, isCommandPressed, pathname, peek],
  )

  return (
    <Link href={href} ref={ref} onClick={handlePeek} {...rest}>
      {children}
    </Link>
  )
}
