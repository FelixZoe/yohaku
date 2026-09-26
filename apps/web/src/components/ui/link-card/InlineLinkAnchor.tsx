'use client'

import {
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
} from '@floating-ui/react-dom'
import { AnimatePresence, m } from 'motion/react'
import type { FC, ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { useIsMobile } from '~/atoms/hooks/viewport'
import { getPopoverAnimationConfig } from '~/components/ui/float-popover/animation'
import { RootPortal } from '~/components/ui/portal'
import { useIsClient } from '~/hooks/common/use-is-client'
import { stopPropagation } from '~/lib/dom'
import { isExternalHttpUrl } from '~/lib/link-eligibility'
import { useInlineLinkEnrichment } from '~/queries/hooks/use-inline-link-enrichment'

import { HoverLinkCard } from './HoverLinkCard'

interface Props {
  children: ReactNode
  className?: string
  href: string
  rel?: string
  target?: string
  title?: string
}

// Grace period covers the visual gap between the anchor and the popover so the
// cursor can traverse offset(8) without dismissing. Cancelled on popover enter.
const LEAVE_GRACE_MS = 80

export const InlineLinkAnchor: FC<Props> = ({
  href,
  children,
  className,
  rel,
  target,
  title,
}) => {
  const isMobile = useIsMobile()
  const isClient = useIsClient()
  const eligible = useMemo(
    () => isClient && isExternalHttpUrl(href, window.location.host),
    [href, isClient],
  )
  const [hovered, setHovered] = useState(false)
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data } = useInlineLinkEnrichment(href, hovered && eligible)

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
    placement: 'top',
    middleware: [offset(8), flip({ padding: 16 }), shift({ padding: 8 })],
  })

  const open = hovered && !!data
  useEffect(() => {
    if (!open || !elements.reference || !elements.floating) return
    return autoUpdate(elements.reference, elements.floating, update)
  }, [open, elements.reference, elements.floating, update])

  useEffect(() => {
    return () => {
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current)
    }
  }, [])

  if (!eligible || isMobile) {
    return (
      <a
        className={className}
        href={href}
        rel={rel}
        target={target}
        title={title}
      >
        {children}
      </a>
    )
  }

  const handleEnter = () => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current)
      leaveTimerRef.current = null
    }
    setHovered(true)
  }

  const handleLeave = () => {
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current)
    leaveTimerRef.current = setTimeout(() => {
      setHovered(false)
      leaveTimerRef.current = null
    }, LEAVE_GRACE_MS)
  }

  return (
    <>
      <a
        className={className}
        href={href}
        ref={refs.setReference}
        rel={rel}
        target={target}
        title={title}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
      >
        {children}
      </a>
      <AnimatePresence>
        {open && data && (
          <RootPortal>
            <m.div
              className="float-popover pointer-events-auto relative z-[99]"
              ref={refs.setFloating}
              style={{
                ...getPopoverAnimationConfig(resolvedPlacement).style,
                position: strategy,
                top: y ?? '',
                left: x ?? '',
                visibility: isPositioned && x !== null ? 'visible' : 'hidden',
              }}
              onMouseEnter={handleEnter}
              onMouseLeave={handleLeave}
              onWheel={stopPropagation}
            >
              <m.div {...getPopoverAnimationConfig(resolvedPlacement)}>
                <HoverLinkCard data={data} />
              </m.div>
            </m.div>
          </RootPortal>
        )}
      </AnimatePresence>
    </>
  )
}
