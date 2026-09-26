'use client'

import { useEffect } from 'react'

export function useEscapeExit(active: boolean, onExit: () => void) {
  useEffect(() => {
    if (!active) return
    const on = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit()
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [active, onExit])
}
