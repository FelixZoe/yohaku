'use client'

import { atom, useAtom } from 'jotai'
import { startTransition, useEffect } from 'react'

interface VisibleHeadingsState {
  activeId: string | null
  visibleIds: Set<string>
}

const visibleHeadingsAtom = atom<VisibleHeadingsState>({
  visibleIds: new Set<string>(),
  activeId: null,
})

/**
 * Sets up the IntersectionObserver and writes to the shared atom.
 * Call this ONCE (in TocTree). Do NOT call from TocAside — use useVisibleHeadingsValue instead.
 */
export function useVisibleHeadings($headings: HTMLHeadingElement[]) {
  const [state, setState] = useAtom(visibleHeadingsAtom)

  useEffect(() => {
    const currentlyVisible = new Set<string>()

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.id
          if (entry.isIntersecting) {
            currentlyVisible.add(id)
          } else {
            currentlyVisible.delete(id)
          }
        })

        // activeId = topmost visible heading (by DOM order)
        let activeId: string | null = null
        for (const $heading of $headings) {
          if (currentlyVisible.has($heading.id)) {
            activeId = $heading.id
            break
          }
        }

        // Fallback: when nothing is within the intersection band, use the last
        // heading whose top has crossed the top trigger line (matches rootMargin
        // top of -100px). This keeps the section the viewport sits in highlighted.
        if (!activeId) {
          for (const $heading of $headings) {
            if ($heading.getBoundingClientRect().top < 100) {
              activeId = $heading.id
            } else {
              break
            }
          }
        }

        startTransition(() => {
          setState({
            visibleIds: new Set(currentlyVisible),
            activeId,
          })
        })
      },
      { rootMargin: '-100px 0px -100px 0px' },
    )

    $headings.forEach(($heading) => {
      observer.observe($heading)
    })

    return () => {
      observer.disconnect()
    }
  }, [$headings, setState])

  return state
}

/**
 * Read-only accessor for visible headings state.
 * Use this in components that need the data but should NOT create an observer (e.g. TocAside for FocusView).
 */
export function useVisibleHeadingsValue() {
  const [state] = useAtom(visibleHeadingsAtom)
  return state
}
