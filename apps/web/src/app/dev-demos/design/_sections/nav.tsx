'use client'

import type { FC, MouseEvent } from 'react'
import { useCallback, useEffect, useState } from 'react'

import { clsxm } from '~/lib/helper'

export type NavItem = { id: string; label: string }

const useScrollSpy = (items: NavItem[]) => {
  const [active, setActive] = useState<string>(items[0]?.id ?? '')

  useEffect(() => {
    const sections = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => el !== null)
    if (sections.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      {
        rootMargin: '-96px 0px -55% 0px',
        threshold: 0,
      },
    )
    sections.forEach((s) => observer.observe(s))
    return () => observer.disconnect()
  }, [items])

  return active
}

const scrollToSection = (id: string) => (e: MouseEvent) => {
  const target = document.getElementById(id)
  if (!target) return
  e.preventDefault()
  target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  history.replaceState(null, '', `#${id}`)
}

/** Top pill nav. Used on small screens where the sidebar is hidden. */
export const DesignNav: FC<{ items: NavItem[]; className?: string }> = ({
  items,
  className,
}) => {
  const active = useScrollSpy(items)

  return (
    <nav
      aria-label="design sections"
      className={clsxm(
        'sticky top-4 z-10 -mx-2 mb-10 flex flex-wrap gap-1.5 rounded-full border border-neutral-3 bg-paper/80 p-1.5 backdrop-blur-xl',
        className,
      )}
    >
      {items.map((item) => {
        const isActive = item.id === active
        return (
          <a
            aria-current={isActive ? 'true' : undefined}
            href={`#${item.id}`}
            key={item.id}
            className={clsxm(
              'rounded-full px-3 py-1.5 text-label-12 font-medium transition-colors',
              isActive
                ? 'bg-accent text-neutral-1'
                : 'text-neutral-7 hover:bg-neutral-2 hover:text-neutral-9',
            )}
            onClick={scrollToSection(item.id)}
          >
            {item.label}
          </a>
        )
      })}
    </nav>
  )
}

/** Vertical sidebar nav. Used on lg+ alongside the wide content column. */
export const DesignSidebar: FC<{ items: NavItem[] }> = ({ items }) => {
  const active = useScrollSpy(items)
  const onClick = useCallback(
    (id: string) => (e: MouseEvent) => scrollToSection(id)(e),
    [],
  )

  return (
    <nav aria-label="design sections" className="flex flex-col gap-0.5">
      <div className="mb-3 px-3 font-mono text-caption-10 uppercase tracking-[0.3em] text-neutral-6">
        contents
      </div>
      {items.map((item) => {
        const isActive = item.id === active
        return (
          <a
            aria-current={isActive ? 'true' : undefined}
            href={`#${item.id}`}
            key={item.id}
            className={clsxm(
              'group flex items-center gap-3 rounded-md px-3 py-2 text-copy-13 transition-colors',
              isActive
                ? 'bg-accent/10 text-accent'
                : 'text-neutral-7 hover:bg-neutral-2 hover:text-neutral-9',
            )}
            onClick={onClick(item.id)}
          >
            <span
              aria-hidden
              className={clsxm(
                'inline-block h-4 w-px rounded-full transition-colors',
                isActive
                  ? 'bg-accent'
                  : 'bg-neutral-4 group-hover:bg-neutral-6',
              )}
            />
            <span className="truncate">{item.label}</span>
          </a>
        )
      })}
    </nav>
  )
}
