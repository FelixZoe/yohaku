import type { Metadata } from 'next'
import { Suspense } from 'react'

import { NOINDEX_FOLLOW_ROBOTS } from '~/lib/seo/robots'

import { SearchPageClient } from './SearchPageClient'

export const metadata = {
  robots: NOINDEX_FOLLOW_ROBOTS,
} satisfies Metadata

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchPageClient />
    </Suspense>
  )
}
