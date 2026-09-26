import type { Metadata } from 'next'

export const NOINDEX_FOLLOW_ROBOTS = {
  index: false,
  follow: true,
  googleBot: {
    index: false,
    follow: true,
  },
} satisfies NonNullable<Metadata['robots']>

export const NOINDEX_NOFOLLOW_ROBOTS = {
  index: false,
  follow: false,
  googleBot: {
    index: false,
    follow: false,
  },
} satisfies NonNullable<Metadata['robots']>
