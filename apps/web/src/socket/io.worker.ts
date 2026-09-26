import type { WsClient, WsClientState } from '@mx-space/ws-client'
import { createWsClient } from '@mx-space/ws-client'

import { EventTypes, SocketEmitEnum } from '~/types/events'

/// <reference lib="webworker" />

interface WsConfig {
  lang?: string
  socket_session_id: string
  url: string
}

interface EmitMessage {
  payload: any
  type: SocketEmitEnum
}

let ws: WsClient | null = null
let config: WsConfig | null = null
let isOpen = false
let sessionId = ''

const uplinkOf = (message: EmitMessage) => {
  switch (message.type) {
    case SocketEmitEnum.Join: {
      return { event: 'room.join', payload: { room: message.payload.roomName } }
    }
    case SocketEmitEnum.Leave: {
      return {
        event: 'room.leave',
        payload: { room: message.payload.roomName },
      }
    }
    case SocketEmitEnum.UpdateSid: {
      return {
        event: 'session.update',
        payload: { sessionId: message.payload.sessionId },
      }
    }
    case SocketEmitEnum.UpdateLang: {
      return { event: 'lang.update', payload: { lang: message.payload.lang } }
    }
    default: {
      return null
    }
  }
}

function setSessionId(next: string) {
  if (sessionId === next) return
  sessionId = next
  boardcast({
    type: 'sid',
    payload: sessionId,
  })
}

function sendUplink(message: EmitMessage) {
  const uplink = uplinkOf(message)
  if (!uplink || !ws) return

  ws.send(uplink.event, uplink.payload)
  if (message.type === SocketEmitEnum.UpdateSid) {
    setSessionId(uplink.payload.sessionId as string)
  }
}

function setupWs(nextConfig: WsConfig) {
  if (ws) return
  console.info('Connecting to ws, url:', nextConfig.url)

  config = nextConfig
  const client = createWsClient({
    url: nextConfig.url,
    query: {
      socket_session_id: nextConfig.socket_session_id,
      ...(nextConfig.lang ? { lang: nextConfig.lang } : {}),
    },
  })
  ws = client

  client.on('$state', (state: WsClientState) => {
    if (state === 'open') {
      console.info('Connected to ws server from SharedWorker')
      isOpen = true
      setSessionId(nextConfig.socket_session_id)

      if (waitingEmitQueue.length > 0) {
        waitingEmitQueue.forEach(sendUplink)
        waitingEmitQueue.length = 0
      }
      boardcast({
        type: 'connect',
        payload: sessionId,
      })
      return
    }

    if (!isOpen) return
    isOpen = false
    boardcast({
      type: 'disconnect',
    })
  })

  for (const event of Object.values(EventTypes)) {
    client.on(event, (payload: any) => {
      console.info('ws', event, payload)

      boardcast({
        type: 'message',
        payload: { type: event, data: payload },
      })
    })
  }

  setSessionId(nextConfig.socket_session_id)
}

const ports = [] as MessagePort[]

const preparePort = (port: MessagePort | Window) => {
  port.onmessage = (event) => {
    const { type, payload } = event.data
    console.info('get message from main', event.data)

    switch (type) {
      case 'config': {
        setupWs(payload)
        break
      }
      case 'emit': {
        if (ws) {
          if (isOpen) sendUplink(payload)
          else waitingEmitQueue.push(payload)
        }
        break
      }
      case 'reconnect': {
        if (ws && !isOpen && config) {
          ws.close()
          ws = null
          setupWs(config)
        }
        break
      }
      case 'init': {
        port.postMessage({ type: 'ping' })

        if (ws) {
          if (isOpen) port.postMessage({ type: 'connect' })
          port.postMessage({ type: 'sid', payload: sessionId })
        }
        break
      }
      default: {
        console.info('Unknown message type:', type)
      }
    }
  }
}

self.addEventListener('connect', (ev: any) => {
  const event = ev as MessageEvent

  const port = event.ports[0]

  ports.push(port)
  preparePort(port)
  port.start()
})

if (!('SharedWorkerGlobalScope' in self)) {
  ports.push(self as any as MessagePort)
  preparePort(self)
}

function boardcast(payload: any) {
  console.info('[ws] boardcast', payload)
  ports.forEach((port) => {
    port.postMessage(payload)
  })
}

const waitingEmitQueue: EmitMessage[] = []
