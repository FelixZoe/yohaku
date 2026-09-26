'use client'

import {
  type HostCapabilities,
  HostFetchError,
} from '@yohaku/rich-content/host'
import { useLocale, useTranslations } from 'next-intl'
import { FetchError } from 'ofetch'
import { useMemo } from 'react'

import { getWebUrl } from '~/atoms'
import { usePeek } from '~/components/modules/peek/usePeek'
import { API_URL } from '~/constants/env'
import { useRouter } from '~/i18n/navigation'
import { $fetch } from '~/lib/fetch/fetch.client'
import { getPhotoZoom } from '~/lib/photo-zoom'
import { springScrollToElement } from '~/lib/scroller'
import { useAggregationSelector } from '~/providers/root/aggregation-data-provider'

import { useIsDark } from './use-is-dark'

let lastImageClickTarget: HTMLImageElement | null = null

// handleLexicalImageClick sets this synchronously, in the same call stack as
// openImage below, right before invoking it — HostCapabilities.openImage
// can't carry a DOM node (must stay serializable for mobile), so the actual
// clicked element travels out-of-band via this ref instead of a src lookup,
// which breaks on duplicate images or any src rewriting (CDN/srcset).
export function setLastImageClickTarget(target: HTMLImageElement | null) {
  lastImageClickTarget = target
}

function resolveImageElement(src: string): HTMLImageElement | null {
  const target = lastImageClickTarget
  lastImageClickTarget = null
  if (target) return target
  return document.querySelector<HTMLImageElement>(
    `img[src="${CSS.escape(src)}"]`,
  )
}

// Pulled out of useWebHost's useMemo so it can be driven directly through
// assertFetchJSONContract without rendering the hook (it doesn't close over
// any hook state — isDark/t/nestedDocPresentation/slots are all irrelevant
// to it).
//
// A relative path is always the site's own API — it goes through $fetch so
// it carries credentials + X-Session-Uuid + lang like every other web→API
// call (a bare fetch silently degrades a signed-in reader to an anonymous
// IP/UA fingerprint wherever the API is cross-origin, e.g. local dev).
//
// An absolute URL is by definition off-site (afilmory's galleryUrl, a
// remote excalidraw snapshot host) and MUST stay on a bare fetch: $fetch's
// onRequest unconditionally sets X-Session-Uuid, a header that isn't
// CORS-safelisted, so sending it cross-origin forces a preflight that the
// remote origin's access-control-allow-headers never lists — the browser
// refuses to send the request at all, not just drops the header.
export const webFetchJSON: HostCapabilities['fetchJSON'] = async (
  url,
  init,
) => {
  if (url.startsWith('http')) {
    const res = await fetch(url, init)
    if (!res.ok) throw new HostFetchError(res.status, url)
    return res.json()
  }

  const target = `${API_URL}${url}`
  try {
    return await $fetch(target, init as RequestInit)
  } catch (error) {
    if (error instanceof FetchError) {
      throw new HostFetchError(
        error.statusCode ?? error.response?.status ?? 0,
        target,
      )
    }
    throw error
  }
}

export function useWebHost(options?: {
  nestedDocPresentation?: HostCapabilities['nestedDocPresentation']
  slots?: HostCapabilities['slots']
}): HostCapabilities {
  const { nestedDocPresentation = 'modal', slots } = options ?? {}
  const isDark = useIsDark()
  const t = useTranslations('common')
  const locale = useLocale()
  const peek = usePeek()
  const router = useRouter()
  const ownerAvatar = useAggregationSelector((s) => s.user.avatar)
  const ownerName = useAggregationSelector((s) => s.user.name)

  return useMemo<HostCapabilities>(
    () => ({
      apiBase: API_URL,
      fetchJSON: webFetchJSON,
      interceptSelfLink: (path) => {
        if (peek(path)) return true
        router.push(path)
        return true
      },
      labels: {
        codeCopied: t('code_copied'),
        codeCopy: t('code_copy'),
        codeExpand: t.raw('code_expand'),
        nestedDocCollapse: t('nested_doc_collapse'),
        nestedDocExpand: t('nested_doc_expand'),
        nestedDocLabel: t('nested_doc_label'),
      },
      locale,
      nestedDocPresentation,
      openImage: ({ images, src }) => {
        const img = resolveImageElement(src)
        if (!img) return
        const zoom = getPhotoZoom()
        const gallery = images
          .map((imageSrc) =>
            imageSrc === src
              ? img
              : document.querySelector<HTMLImageElement>(
                  `img[src="${CSS.escape(imageSrc)}"]`,
                ),
          )
          .filter((el): el is HTMLImageElement => el !== null)
        for (const el of gallery) {
          if (!zoom.getImages().includes(el)) zoom.attach(el)
        }
        if (!zoom.getImages().includes(img)) zoom.attach(img)
        zoom.open({ target: img })
      },
      openLink: (url) => {
        window.open(url, '_blank', 'noopener')
      },
      scrollToAnchor: (id) => {
        history.replaceState(history.state, '', `#${id}`)
        const target = document.getElementById(id)
        if (target) springScrollToElement(target, -100)
      },
      site: { ownerAvatar, ownerName },
      slots,
      theme: isDark ? 'dark' : 'light',
      webOrigin: getWebUrl() ?? '',
    }),
    [
      isDark,
      locale,
      nestedDocPresentation,
      ownerAvatar,
      ownerName,
      peek,
      router,
      slots,
      t,
    ],
  )
}
