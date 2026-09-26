import '../../styles/index.css'

import type { Metadata } from 'next'
import type { PropsWithChildren } from 'react'

import { PublicEnvScript } from '~/components/common/PublicEnvScript'
import { DEV_LOCALE } from '~/components/layout/dev-demos/dev-locale'
import { DevShell } from '~/components/layout/dev-demos/DevShell'
import { getLocaleFontStyle } from '~/lib/font-locale'
import { fontVariables } from '~/lib/fonts'
import { NOINDEX_NOFOLLOW_ROBOTS } from '~/lib/seo/robots'
import { DEFAULT_VIEWPORT } from '~/lib/seo/viewport'

export const metadata = {
  title: 'Dev Demos',
  robots: NOINDEX_NOFOLLOW_ROBOTS,
} satisfies Metadata

export const viewport = DEFAULT_VIEWPORT

export default function DevLayout({ children }: PropsWithChildren) {
  return (
    <html suppressHydrationWarning className="themed" lang={DEV_LOCALE}>
      <head>
        <PublicEnvScript />
      </head>
      <body
        suppressHydrationWarning
        className={`${fontVariables} m-0 h-full p-0 font-sans`}
        style={getLocaleFontStyle(DEV_LOCALE)}
      >
        <DevShell>{children}</DevShell>
      </body>
    </html>
  )
}
