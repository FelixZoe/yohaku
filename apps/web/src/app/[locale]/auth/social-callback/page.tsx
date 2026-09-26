'use client'

import { useTranslations } from 'next-intl'
import { useEffect } from 'react'

import {
  AUTH_CALLBACK_CHANNEL,
  OAUTH_RETURN_PATH_STORAGE_KEY,
} from '~/lib/oauth-callback'

export const dynamic = 'force-static'

export default function SocialCallbackPage() {
  const t = useTranslations('common')

  useEffect(() => {
    const bc = new BroadcastChannel(AUTH_CALLBACK_CHANNEL)
    bc.postMessage({ type: 'oauth-complete' })
    bc.close()

    if (window.opener) {
      window.close()
      return
    }

    let path = '/'
    try {
      const stored = sessionStorage.getItem(OAUTH_RETURN_PATH_STORAGE_KEY)
      if (stored) {
        sessionStorage.removeItem(OAUTH_RETURN_PATH_STORAGE_KEY)
        path = stored
      }
    } catch {
      // ignore
    }
    window.location.replace(
      path.startsWith('/') ? `${window.location.origin}${path}` : path,
    )
  }, [])

  return <p>{t('auth_callback_closing')}</p>
}
