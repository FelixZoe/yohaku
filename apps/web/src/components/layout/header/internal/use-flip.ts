import { useLayoutEffect, useRef, useState } from 'react'

export const CAPSULE_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'
export const CAPSULE_DURATION_MS = 500

const lastRects = new Map<string, DOMRect>()

export const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(false)

  useLayoutEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(query.matches)
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return reduced
}

export const useFlip = <T extends HTMLElement>(id: string) => {
  const ref = useRef<T>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    const prev = lastRects.get(id)
    const next = el.getBoundingClientRect()
    lastRects.set(id, next)

    const moved =
      prev &&
      next.width > 0 &&
      prev.width > 0 &&
      (Math.abs(prev.left - next.left) > 1 ||
        Math.abs(prev.top - next.top) > 1 ||
        Math.abs(prev.width - next.width) > 1)

    if (
      moved &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      const dx = prev.left - next.left
      const dy = prev.top - next.top
      const sx = prev.width / next.width
      const sy = prev.height / next.height
      el.style.transition = 'none'
      el.style.transformOrigin = 'top left'
      el.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`
      void el.getBoundingClientRect()
      el.style.transition = `transform ${CAPSULE_DURATION_MS}ms ${CAPSULE_EASE}`
      el.style.transform = ''
      const clear = window.setTimeout(() => {
        el.style.transition = ''
        el.style.transformOrigin = ''
      }, CAPSULE_DURATION_MS)
      return () => {
        window.clearTimeout(clear)
        const rect = el.getBoundingClientRect()
        if (rect.width > 0) lastRects.set(id, rect)
      }
    }

    return () => {
      const rect = el.getBoundingClientRect()
      if (rect.width > 0) lastRects.set(id, rect)
    }
  }, [])

  return ref
}
