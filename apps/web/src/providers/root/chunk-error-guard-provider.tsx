'use client'

import { useEffect } from 'react'

import { isChunkError, tryReloadForChunkError } from '~/lib/chunk-error'

export const ChunkErrorGuardProvider = () => {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (!isChunkError(event.error ?? event.message)) return
      if (tryReloadForChunkError()) event.preventDefault()
    }

    const handleRejection = (event: PromiseRejectionEvent) => {
      if (!isChunkError(event.reason)) return
      if (tryReloadForChunkError()) event.preventDefault()
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleRejection)
    }
  }, [])

  return null
}
