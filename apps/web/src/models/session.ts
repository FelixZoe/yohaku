import type { AuthSocialProviders } from '~/lib/authjs'

export interface SessionReader {
  email: string
  emailVerified: null
  handle?: string
  id: string
  image: string
  isOwner: boolean
  name: string
  provider: AuthSocialProviders
  providerAccountId: string
  scope: string
  tokenType: string

  type: string
}
