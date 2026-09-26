'use client'

import { domAnimation, LazyMotion } from 'motion/react'
import { useEffect, useMemo } from 'react'

// import { captureException } from '@sentry/nextjs'
import { NormalContainer } from '~/components/layout/container/Normal'
import { StyledButton } from '~/components/ui/button'
import { isChunkError, tryReloadForChunkError } from '~/lib/chunk-error'
import enErrorMessages from '~/messages/en/error.json'
import jaErrorMessages from '~/messages/ja/error.json'
import zhErrorMessages from '~/messages/zh/error.json'
import zhTwErrorMessages from '~/messages/zh-TW/error.json'

const errorMessagesByLocale = {
  en: enErrorMessages,
  ja: jaErrorMessages,
  'zh-TW': zhTwErrorMessages,
  zh: zhErrorMessages,
} as const

const resolveLocale = (locale?: string) => {
  if (locale?.toLowerCase().startsWith('zh-tw')) return 'zh-TW'
  if (locale?.startsWith('en')) return 'en'
  if (locale?.startsWith('ja')) return 'ja'
  return 'zh'
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const locale = useMemo(
    () =>
      resolveLocale(
        typeof document === 'undefined'
          ? undefined
          : document.documentElement.lang || navigator.language,
      ),
    [],
  )
  const t = errorMessagesByLocale[locale]

  useEffect(() => {
    if (isChunkError(error) && tryReloadForChunkError()) return
    console.error(error)
    // captureException(error)
  }, [error])
  return (
    <html>
      <head>
        <title>{t['500_title']}</title>
      </head>
      <body suppressHydrationWarning>
        <NormalContainer>
          <h1 className="mb-4">{t['500_title']}</h1>
          <div className="flex justify-center">
            <LazyMotion features={domAnimation}>
              <StyledButton onClick={reset}>{t.refresh}</StyledButton>
            </LazyMotion>
          </div>
        </NormalContainer>
      </body>
    </html>
  )
}
