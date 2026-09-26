'use client'

import { useSyncExternalStore } from 'react'

import { useAppConfigSelector } from '~/providers/root/aggregation-data-provider'

const FALLBACK_FAVICON = '/favicon.ico'
const FALLBACK_DARK_FAVICON = '/favicon-dark.ico'

const subscribeTheme = (cb: () => void) => {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}

const getThemeSnapshot = (): 'dark' | 'light' =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

const getServerThemeSnapshot = (): 'light' => 'light'

export const FaviconSwitcher = () => {
  const site = useAppConfigSelector((config) => config.site)
  const favicon = site?.favicon || FALLBACK_FAVICON
  const faviconDark = site?.faviconDark || FALLBACK_DARK_FAVICON

  const theme = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getServerThemeSnapshot,
  )

  const href = theme === 'dark' ? faviconDark : favicon

  return <link href={href} rel="icon" sizes="any" type="image/x-icon" />
}
