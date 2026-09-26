'use client'

import { useEffect } from 'react'

import { initOpenPanel } from '~/lib/openpanel'

export function OpenPanelInit({
  clientId,
  apiUrl,
  trackScreenViews = true,
  trackOutgoingLinks = true,
}: {
  clientId: string
  apiUrl?: string
  trackScreenViews?: boolean
  trackOutgoingLinks?: boolean
}) {
  useEffect(() => {
    initOpenPanel({
      clientId,
      apiUrl,
      trackScreenViews,
      trackOutgoingLinks,
    })
  }, [clientId, apiUrl, trackScreenViews, trackOutgoingLinks])

  return null
}
