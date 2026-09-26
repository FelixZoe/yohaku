import { TrackerAction } from '~/constants/tracker'

export interface SocketRouter {
  push(href: any, options?: any): void
  replace(href: any, options?: any): void
}

export interface EventHandlerContext {
  router: SocketRouter
}

export type EventHandler = (data: any, ctx: EventHandlerContext) => void

export const trackerRealtimeEvent = (label = 'Socket Realtime Event') => {
  document.dispatchEvent(
    new CustomEvent('impression', {
      detail: {
        action: TrackerAction.Impression,
        label,
      },
    }),
  )
}

export const updateMessage = '作者已更此篇，内容自新。'
