import type { Metadata } from 'next'
import type { PropsWithChildren } from 'react'

import { NOINDEX_NOFOLLOW_ROBOTS } from '~/lib/seo/robots'

export const metadata = {
  robots: NOINDEX_NOFOLLOW_ROBOTS,
} satisfies Metadata

export default function AuthLayout({ children }: PropsWithChildren) {
  return children
}
