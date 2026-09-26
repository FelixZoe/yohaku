'use client'

import clsx from 'clsx'
import * as React from 'react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useStateToRef } from '~/hooks/common/use-state-ref'
import { useMaskScrollArea } from '~/hooks/shared/use-mask-scrollarea'
import { clsxm } from '~/lib/helper'
import { springScrollToElement } from '~/lib/scroller'

import { ContinuousBar } from './ContinuousBar'
import { TocGroup } from './TocGroup'
import type { ITocItem, TocItemStatus } from './TocItem'
import { TocItem } from './TocItem'
import { useVisibleHeadings } from './useVisibleHeadings'

export const TocTree: Component<{
  $headings: HTMLHeadingElement[]
  containerRef?: React.MutableRefObject<HTMLUListElement | null>
  scrollInNextTick?: boolean
  onItemClick?: (item: ITocItem) => void
  grouping?: boolean
}> = ({
  $headings,
  containerRef,
  className,
  scrollInNextTick,
  onItemClick,
  grouping = true,
}) => {
  const { visibleIds, activeId } = useVisibleHeadings($headings)

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

  const tocRef = useStateToRef(toc)
  const handleScrollTo = useCallback(
    (i: number, $el: HTMLElement | null) => {
      onItemClick?.(tocRef.current[i])
      if ($el) {
        const handle = () => {
          springScrollToElement($el, -100)
        }
        if (scrollInNextTick) {
          requestAnimationFrame(handle)
        } else {
          handle()
        }
      }
    },
    [onItemClick, scrollInNextTick, tocRef],
  )

  // Build grouped structure: top-level headings with their children
  const groups = useMemo(() => {
    if (!grouping) return null
    const result: { parent: ITocItem; children: ITocItem[] }[] = []
    for (const item of toc) {
      if (item.depth === rootDepth) {
        result.push({ parent: item, children: [] })
      } else if (result.length > 0) {
        const lastGroup = result.at(-1)
        if (lastGroup) {
          lastGroup.children.push(item)
        }
      }
    }
    return result
  }, [toc, rootDepth, grouping])

  // Delayed collapse: track which groups should be expanded
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(),
  )
  const collapseTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  )

  useEffect(() => {
    if (!groups) return

    const collapseTimers = collapseTimersRef.current
    // eslint-disable-next-line @eslint-react/hooks-extra/no-direct-set-state-in-use-effect
    setExpandedGroups((prev) => {
      const next = new Set<string>()
      for (const group of groups) {
        const parentVisible = visibleIds.has(group.parent.anchorId)
        const anyChildVisible = group.children.some((c) =>
          visibleIds.has(c.anchorId),
        )
        const shouldExpand = parentVisible || anyChildVisible

        if (shouldExpand) {
          next.add(group.parent.anchorId)
          const timer = collapseTimers.get(group.parent.anchorId)
          if (timer) {
            clearTimeout(timer)
            collapseTimers.delete(group.parent.anchorId)
          }
        } else if (prev.has(group.parent.anchorId)) {
          if (!collapseTimers.has(group.parent.anchorId)) {
            const timer = setTimeout(() => {
              setExpandedGroups((s) => {
                const ns = new Set(s)
                ns.delete(group.parent.anchorId)
                return ns
              })
              collapseTimers.delete(group.parent.anchorId)
            }, 300)
            collapseTimers.set(group.parent.anchorId, timer)
          }
          next.add(group.parent.anchorId)
        }
      }
      return next
    })

    return () => {
      collapseTimers.forEach((timer) => clearTimeout(timer))
      collapseTimers.clear()
    }
  }, [visibleIds, groups])

  const getItemStatus = useCallback(
    (anchorId: string): TocItemStatus => {
      if (anchorId === activeId) return 'active'
      if (visibleIds.has(anchorId)) return 'in-range'
      return 'inactive'
    },
    [activeId, visibleIds],
  )

  const activeIndex = useMemo(() => {
    const idx = toc.findIndex((item) => item.anchorId === activeId)
    return idx === -1 ? 0 : idx
  }, [toc, activeId])

  const getRippleDelay = useCallback(
    (index: number) => Math.min(450, Math.abs(index - activeIndex) * 50),
    [activeIndex],
  )

  const treeRef = useRef<HTMLUListElement>(null)
  const [, maskClass] = useMaskScrollArea({ ref: treeRef })

  return (
    <ul
      ref={containerRef}
      className={clsxm(
        'scrollbar-none flex grow flex-col scroll-smooth px-2',
        className,
      )}
    >
      <ul
        className={clsx('scrollbar-none relative overflow-auto', maskClass)}
        ref={treeRef}
      >
        <ContinuousBar
          className="transition-[top,height,opacity] group-data-[toc-focus]/toc:opacity-0"
          containerRef={treeRef}
          visibleIds={visibleIds}
        />

        {groups
          ? groups.map((group) => (
              <React.Fragment key={group.parent.anchorId}>
                <MemoedItem
                  heading={group.parent}
                  rippleDelayMs={getRippleDelay(group.parent.index)}
                  rootDepth={rootDepth}
                  status={getItemStatus(group.parent.anchorId)}
                  onClick={handleScrollTo}
                />
                {group.children.length > 0 && (
                  <TocGroup
                    expanded={expandedGroups.has(group.parent.anchorId)}
                  >
                    {group.children.map((child) => (
                      <MemoedItem
                        heading={child}
                        key={child.anchorId}
                        rippleDelayMs={getRippleDelay(child.index)}
                        rootDepth={rootDepth}
                        status={getItemStatus(child.anchorId)}
                        onClick={handleScrollTo}
                      />
                    ))}
                  </TocGroup>
                )}
              </React.Fragment>
            ))
          : toc.map((heading) => (
              <MemoedItem
                heading={heading}
                key={heading.anchorId}
                rippleDelayMs={getRippleDelay(heading.index)}
                rootDepth={rootDepth}
                status={getItemStatus(heading.anchorId)}
                onClick={handleScrollTo}
              />
            ))}
      </ul>
    </ul>
  )
}

const MemoedItem = memo<{
  status: TocItemStatus
  heading: ITocItem
  rootDepth: number
  rippleDelayMs?: number
  onClick?: (i: number, $el: HTMLElement | null, anchorId: string) => void
}>(({ heading, status, onClick, rootDepth, rippleDelayMs = 0 }) => {
  const itemRef = useRef<HTMLLIElement>(null)

  useEffect(() => {
    if (status !== 'active') return
    const $item = itemRef.current
    if (!$item) return
    const $container = $item.closest('ul')
    if (!$container) return

    const containerHeight = $container.clientHeight
    const itemHeight = $item.clientHeight
    const itemOffsetTop = $item.offsetTop
    const { scrollTop } = $container

    const itemTop = itemOffsetTop - scrollTop
    const itemBottom = itemTop + itemHeight
    if (itemTop < 0 || itemBottom > containerHeight) {
      $container.scrollTop =
        itemOffsetTop - containerHeight / 2 + itemHeight / 2
    }
  }, [status])

  return (
    <li
      data-anchor-id={heading.anchorId}
      ref={itemRef}
      className={clsx(
        'relative leading-none',
        'transition-[opacity,translate] duration-[350ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
        'group-data-[toc-focus]/toc:-translate-x-2.5 group-data-[toc-focus]/toc:opacity-0',
        'group-data-[toc-focus]/toc:[transition-delay:var(--toc-ripple-delay)]',
      )}
      style={
        { '--toc-ripple-delay': `${rippleDelayMs}ms` } as React.CSSProperties
      }
    >
      <TocItem
        heading={heading}
        rootDepth={rootDepth}
        status={status}
        onClick={onClick}
      />
    </li>
  )
})
MemoedItem.displayName = 'MemoedItem'
