import type { BusinessEvents } from '@mx-space/webhook'

import { isDev } from '~/lib/env'

import { activityHandlers } from './handlers/activity'
import { articleReadCountHandlers } from './handlers/article-read-count'
import { commentHandlers } from './handlers/comment'
import { noteHandlers } from './handlers/note'
import { pageHandlers } from './handlers/page'
import { postHandlers } from './handlers/post'
import { recentlyHandlers } from './handlers/recently'
import { sayHandlers } from './handlers/say'
import { translationHandlers } from './handlers/translation'
import type {
  EventHandler,
  EventHandlerContext,
  SocketRouter,
} from './handlers/types'
import { visitorEvents, visitorHandler } from './handlers/visitor'
import { WsEvent } from './util'

export const handlerMap: Record<string, EventHandler> = {
  ...postHandlers,
  ...noteHandlers,
  ...pageHandlers,
  ...sayHandlers,
  ...recentlyHandlers,
  ...translationHandlers,
  ...activityHandlers,
  ...commentHandlers,
  ...articleReadCountHandlers,
}

for (const event of visitorEvents) {
  handlerMap[event] = visitorHandler
}

export const eventHandler = (type: string, data: any, router: SocketRouter) => {
  const ctx: EventHandlerContext = { router }
  const handler = handlerMap[type]

  if (handler) {
    handler(data, ctx)
  } else if (isDev) {
    console.info(type, data)
  }

  WsEvent.emit(type as BusinessEvents, data)
}
