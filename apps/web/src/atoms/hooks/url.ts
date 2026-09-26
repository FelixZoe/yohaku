import { useAtomValue } from 'jotai'
import { useCallback } from 'react'

import { apiClient } from '~/lib/request'

import { adminUrlAtom, applyUrlConfig } from '../url'

export async function fetchAppUrl() {
  const data = await apiClient.proxy.options.url.get<{
    adminUrl?: string
    webUrl?: string
  }>()
  applyUrlConfig(data)
  return data
}

export const useResolveAdminUrl = () => {
  const adminUrl = useAtomValue(adminUrlAtom)
  return useCallback(
    (path?: string) => {
      if (!adminUrl) {
        return ''
      }
      const parsedUrl = new URL(adminUrl.replace(/\/$/, ''))

      return `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname}${
        path || ''
      }${parsedUrl.search}`
    },
    [adminUrl],
  )
}
