const FALLBACK_ORIGIN = 'http://localhost'

const getRuntimeOrigin = () => {
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin
  }

  if (typeof location !== 'undefined' && location.origin) {
    return location.origin
  }

  return FALLBACK_ORIGIN
}

export const resolveAuthBaseURL = (
  apiBaseURL: string,
  origin = getRuntimeOrigin(),
) => {
  const normalizedApiBaseURL = apiBaseURL.trim().replace(/\/+$/, '')
  const authBaseURL = normalizedApiBaseURL
    ? `${normalizedApiBaseURL}/auth`
    : '/auth'

  return new URL(authBaseURL, origin).toString().replace(/\/$/, '')
}
