'use client'

import { OpenPanel } from '@openpanel/web'

let openPanelInstance: OpenPanel | null = null

export function initOpenPanel(config: {
  clientId: string
  apiUrl?: string
  trackScreenViews?: boolean
  trackOutgoingLinks?: boolean
}) {
  if (openPanelInstance) {
    return openPanelInstance
  }

  if (typeof window === 'undefined') {
    return null
  }

  openPanelInstance = new OpenPanel({
    clientId: config.clientId,
    apiUrl: config.apiUrl,
    trackScreenViews: config.trackScreenViews ?? true,
    trackOutgoingLinks: config.trackOutgoingLinks ?? true,
  })

  return openPanelInstance
}

export function getOpenPanel(): OpenPanel | null {
  return openPanelInstance
}
