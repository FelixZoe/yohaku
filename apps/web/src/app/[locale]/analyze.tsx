'use client'

import { useEffect } from 'react'

import PKG from '~/../package.json'
import type { TrackerAction } from '~/constants/tracker'
import { getOpenPanel } from '~/lib/openpanel'

declare global {
  interface Window {
    umami?: {
      track: (event: string, data?: any) => void
    }
  }
}
export const Analyze = () => {
  useEffect(() => {
    // Wait for OpenPanel to be initialized
    let timeoutId: NodeJS.Timeout | null = null
    let handler1: ((e: MouseEvent) => void) | null = null
    let handler2: ((e: any) => void) | null = null

    const init = () => {
      const op = getOpenPanel()
      if (!op) {
        // Retry after a short delay if not initialized yet
        timeoutId = setTimeout(init, 100)
        return
      }

      op.setGlobalProperties({
        version: PKG.version,
        commit: process.env.COMMIT_HASH,
        app: 'yohaku',
      })

      handler1 = async (e: MouseEvent) => {
        const $ = e.target as HTMLElement

        let current: HTMLElement | null = $
        let { event } = $.dataset
        while (!event && current && current !== document.body) {
          event = current.dataset.event
          current = current.parentElement
        }

        if (event) {
          console.info('dom track click event', event)
          window.umami?.track(event, {
            type: 'click',
          })

          op.track(event, {
            type: 'click',
          })
        }
      }
      document.addEventListener('click', handler1, true)

      handler2 = async (e: any) => {
        const detail = e.detail as {
          action: TrackerAction
          label: string
        }

        console.info(detail, 'detail')
        window.umami?.track(detail.label, {
          type: 'impression',
        })

        op.track(detail.label, {
          type: 'impression',
        })
      }
      document.addEventListener('impression', handler2)
    }

    init()

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      if (handler1) {
        document.removeEventListener('click', handler1, true)
      }
      if (handler2) {
        document.removeEventListener('impression', handler2)
      }
    }
  }, [])

  return null
}
