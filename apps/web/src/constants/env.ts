import { isClientSide, isDev } from '~/lib/env'

type PublicRuntimeEnvKey =
  | 'NEXT_PUBLIC_API_URL'
  | 'NEXT_PUBLIC_CLIENT_API_URL'
  | 'NEXT_PUBLIC_GATEWAY_URL'

type ServerOnlyEnvKey = 'API_URL'

type PublicRuntimeEnvShape = Partial<Record<PublicRuntimeEnvKey, string>>

const getRuntimeEnv = (key: PublicRuntimeEnvKey | ServerOnlyEnvKey) => {
  if (typeof window !== 'undefined') {
    return (window.__ENV as PublicRuntimeEnvShape | undefined)?.[
      key as PublicRuntimeEnvKey
    ]
  }

  return process.env[key]
}

/** Public API URL - used by client and as fallback for server */
const PUBLIC_API_URL = getRuntimeEnv('NEXT_PUBLIC_API_URL') || '/api/v3'

export const API_URL: string = (() => {
  if (isDev) return getRuntimeEnv('NEXT_PUBLIC_API_URL') || ''

  if (isClientSide) {
    if (getRuntimeEnv('NEXT_PUBLIC_CLIENT_API_URL')) {
      return getRuntimeEnv('NEXT_PUBLIC_CLIENT_API_URL') || ''
    }
    return PUBLIC_API_URL
  }

  // Server: use API_URL (internal network) if set, otherwise fall back to Public URL
  return getRuntimeEnv('API_URL') || PUBLIC_API_URL
})() as string
export const GATEWAY_URL = getRuntimeEnv('NEXT_PUBLIC_GATEWAY_URL') || ''

declare global {
  interface Window {
    __ENV?: PublicRuntimeEnvShape
  }
}
