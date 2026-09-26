const CHUNK_ERROR_PATTERNS: RegExp[] = [
  /chunkloaderror/i,
  /loading chunk [\w-]+ failed/i,
  /loading css chunk [\w-]+ failed/i,
  /failed to fetch dynamically imported module/i,
  /but the module factory is not available/i,
  /originalfactory is undefined/i,
]

const RELOAD_AT_KEY = '__chunk_reload_at'
const COOLDOWN_MS = 60_000

export const isChunkError = (error: unknown): boolean => {
  if (!error) return false
  const message =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : typeof error === 'string'
        ? error
        : (error as { message?: string })?.message || ''
  if (!message) return false
  return CHUNK_ERROR_PATTERNS.some((p) => p.test(message))
}

export const tryReloadForChunkError = (): boolean => {
  if (typeof window === 'undefined') return false
  try {
    const last = Number(sessionStorage.getItem(RELOAD_AT_KEY) ?? '0')
    const now = Date.now()
    if (now - last < COOLDOWN_MS) return false
    sessionStorage.setItem(RELOAD_AT_KEY, String(now))
  } catch {
    // sessionStorage 不可用（隐私模式等），仍尝试 reload
  }
  window.location.reload()
  return true
}
