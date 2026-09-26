'use client'

import { useEffect } from 'react'

import type { Locale } from '~/i18n/config'

const MISANS_HREF = '/fonts/misans.css'

const isAppleSystem = () => {
  if (typeof navigator === 'undefined') return false
  return /Macintosh|Mac OS X|iPhone|iPad|iPod/.test(navigator.userAgent)
}

interface Props {
  locale: Locale
}

export const MiSansLoader = ({ locale }: Props) => {
  useEffect(() => {
    if (locale !== 'zh' && locale !== 'zh-TW') return
    if (isAppleSystem()) return
    if (document.querySelector(`link[data-font="misans"]`)) return
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = MISANS_HREF
    link.dataset.font = 'misans'
    document.head.appendChild(link)
  }, [locale])
  return null
}
