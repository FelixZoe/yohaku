import { useEffect, useState } from 'react'

export const useViewportWidth = (ssrFallback = 1600) => {
  const [width, setWidth] = useState(() =>
    typeof window === 'undefined' ? ssrFallback : window.innerWidth,
  )
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return width
}
