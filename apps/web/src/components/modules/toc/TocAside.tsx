'use client'

import type { FC } from 'react'
import * as React from 'react'
import {
  startTransition,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'

import { useIsImmersiveReadingEnabled } from '~/atoms/hooks/reading'
import { DOMCustomEvents } from '~/constants/event'
import { useForceUpdate } from '~/hooks/common/use-force-update'
import { clsxm } from '~/lib/helper'
import { throttle } from '~/lib/lodash'
import { useWrappedElement } from '~/providers/shared/WrappedElementProvider'

import { TocDoodleDivider } from './TocDoodleDivider'
import { useTocHeadingStrategy } from './TocHeadingStrategy'
import type { ITocItem } from './TocItem'
import { TocStringView } from './TocStringView'
import { TocTree } from './TocTree'
import { useVisibleHeadingsValue } from './useVisibleHeadings'

type TocAsideProps = {
  treeClassName?: string
  focusOverlayClassName?: string
}

interface TocSharedProps {
  accessory?: React.ReactNode | React.FC
  as?: React.ElementType
  footerSlot?: React.ReactNode
}

interface TocAsideRef {
  getContainer: () => HTMLUListElement | null
}

const fadeOnFocus =
  'transition-opacity duration-300 group-data-[toc-focus]/toc:opacity-0'

export const TocAside = ({
  ref,
  className,
  children,
  treeClassName,
  focusOverlayClassName,
  accessory,
  footerSlot,
  as: As = 'aside',
}: TocAsideProps &
  TocSharedProps &
  ComponentType & { ref?: React.RefObject<TocAsideRef | null> }) => {
  const containerRef = useRef<HTMLUListElement>(null)
  const $article = useWrappedElement()
  const isImmersive = useIsImmersiveReadingEnabled()
  const [isHoveringAside, setIsHoveringAside] = useState(false)

  const [forceUpdate, updated] = useForceUpdate()

  useEffect(() => {
    const handler = () => {
      startTransition(() => {
        forceUpdate()
      })
    }
    document.addEventListener(DOMCustomEvents.RefreshToc, handler)
    return () => {
      document.removeEventListener(DOMCustomEvents.RefreshToc, handler)
    }
  }, [])

  useImperativeHandle(ref, () => ({
    getContainer: () => containerRef.current,
  }))

  if ($article === undefined) {
    throw new TypeError('<Toc /> must be used in <WrappedElementProvider />')
  }

  const queryHeadings = useTocHeadingStrategy()
  const $headings = useMemo(() => {
    if (!$article) return []
    return queryHeadings($article)
  }, [$article, updated, queryHeadings])

  // Read-only: TocTree owns the observer and writes to the atom
  const { activeId } = useVisibleHeadingsValue()

  // Build toc items for the string view
  const toc: ITocItem[] = useMemo(
    () =>
      Array.from($headings).map((el, idx) => {
        const depth = +el.tagName.slice(1)
        const elClone = el.cloneNode(true) as HTMLElement
        elClone.querySelectorAll('del, .katex-container').forEach((del) => {
          del.remove()
        })
        const title = elClone.textContent || ''
        return {
          depth,
          index: idx,
          title,
          anchorId: el.id,
          $heading: el,
        }
      }),
    [$headings],
  )

  const rootDepth = useMemo(
    () =>
      toc.length
        ? toc.reduce((d, cur) => Math.min(d, cur.depth), toc[0].depth)
        : 0,
    [toc],
  )

  useEffect(() => {
    const setMaxWidth = throttle(() => {
      if (containerRef.current) {
        containerRef.current.style.maxWidth = `${
          window.innerWidth -
          containerRef.current.getBoundingClientRect().x -
          30
        }px`
      }
    }, 14)
    setMaxWidth()
    window.addEventListener('resize', setMaxWidth)
    return () => {
      window.removeEventListener('resize', setMaxWidth)
    }
  }, [])

  // Reset hover state when immersive mode changes
  useEffect(() => {
    if (!isImmersive) setIsHoveringAside(false)
  }, [isImmersive])

  const accessoryElement = useMemo(() => {
    if (!accessory) return null
    return React.isValidElement(accessory)
      ? accessory
      : React.createElement(accessory as FC)
  }, [accessory])

  const footerSlotElement = useMemo(() => {
    if (!footerSlot) return null
    return footerSlot
  }, [footerSlot])

  const showFocus = isImmersive && !isHoveringAside

  return (
    <As
      data-toc-focus={showFocus ? '' : undefined}
      className={clsxm(
        'st-toc z-[3]',
        'group/toc relative font-sans',
        className,
      )}
      onMouseEnter={() => setIsHoveringAside(true)}
      onMouseLeave={() => setIsHoveringAside(false)}
    >
      {/* TocTree always mounted so IntersectionObserver stays alive */}
      <div
        className={clsxm(
          showFocus ? 'pointer-events-none' : undefined,
          'absolute flex max-h-[75vh] flex-col',
          treeClassName,
        )}
      >
        <TocTree
          $headings={$headings}
          className="min-h-0 grow"
          containerRef={containerRef}
        />
        {accessoryElement && (
          <>
            {toc.length > 0 && (
              <div className={fadeOnFocus}>
                <TocDoodleDivider />
              </div>
            )}
            <div className={clsxm('w-fit shrink-0', fadeOnFocus)}>
              {accessoryElement}
            </div>
          </>
        )}
        {footerSlotElement && (
          <div className={clsxm('mt-4 w-fit shrink-0', fadeOnFocus)}>
            {footerSlotElement}
          </div>
        )}
      </div>

      <TocStringView
        active={showFocus}
        activeId={activeId}
        className={focusOverlayClassName}
        rootDepth={rootDepth}
        toc={toc}
      />
      {children}
    </As>
  )
}
TocAside.displayName = 'TocAside'
