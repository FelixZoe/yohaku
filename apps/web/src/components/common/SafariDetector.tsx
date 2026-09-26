'use client'

import { useLayoutEffect } from 'foxact/use-isomorphic-layout-effect'

function isSafari() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return ua.includes('Safari') && !ua.includes('Chrome') && !ua.includes('Edg')
}

export const SafariDetector = () => {
  useLayoutEffect(() => {
    if (isSafari()) {
      document.documentElement.classList.add('is-safari')
    }
  }, [])
  return null
}
