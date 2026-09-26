import type { ReactEventHandler } from 'react'

export const stopPropagation: ReactEventHandler<any> = (e) =>
  e.stopPropagation()

export const preventDefault: ReactEventHandler<any> = (e) => e.preventDefault()

export const transitionViewIfSupported = (
  updateCb: () => any,
  options: { rootAnimation?: boolean } = {},
) => {
  if (window.matchMedia(`(prefers-reduced-motion: reduce)`).matches) {
    updateCb()
    return
  }
  if (!document.startViewTransition) {
    updateCb()
    return
  }
  if (!options.rootAnimation) {
    document.startViewTransition(updateCb)
    return
  }
  document.documentElement.dataset.vtRoot = ''
  const t = document.startViewTransition(updateCb)
  t.finished.finally(() => {
    delete document.documentElement.dataset.vtRoot
  })
}
export const nextFrame = (fn: () => void) =>
  requestAnimationFrame(() => requestAnimationFrame(fn))
