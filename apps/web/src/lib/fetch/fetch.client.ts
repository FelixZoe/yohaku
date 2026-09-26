import 'client-only'

import { nanoid } from 'nanoid'
import { createFetch } from 'ofetch'

import PKG from '~/../package.json'

import { createApiClient, createFetchAdapter } from './shared'

const isDev = process.env.NODE_ENV === 'development'
const isServerSide = typeof window === 'undefined'
const uuidStorageKey = 'x-uuid'
const uuid = nanoid()

const globalConfigureHeader = {} as any
const globalConfigureSearchParams = {} as any

if (isServerSide) {
  globalConfigureHeader['User-Agent'] =
    `NextJS/v${PKG.dependencies.next} ${PKG.name}/${PKG.version}`
}

export const $fetch = createFetch({
  // ofetch's own `fetch` default parameter captures globalThis.fetch once,
  // at createFetch() call time — a module-load-time snapshot that tests
  // stubbing globalThis.fetch per-test (e.g. assertFetchJSONContract) can
  // never see. Re-reading it on every call keeps $fetch stubbable.
  fetch: (...args) => globalThis.fetch(...args),
  defaults: {
    timeout: 8000,
    credentials: 'include',
    headers: globalConfigureHeader,
    onRequest(context) {
      let headers: any = context.options.headers
      if (headers && headers instanceof Headers) {
        headers = Object.fromEntries(headers.entries())
      } else if (!headers || typeof headers !== 'object') {
        headers = {}
      }

      Object.assign(headers, globalConfigureHeader)

      headers['X-Session-Uuid'] =
        globalThis?.sessionStorage?.getItem(uuidStorageKey) ?? uuid

      context.options.query ??= {}
      Object.assign(context.options.query, globalConfigureSearchParams)

      const lang = globalConfigureHeader['x-lang']
      if (lang && !context.options.query?.lang) {
        context.options.query!.lang = lang
      }

      if (isDev && isServerSide) {
        console.info(`[Request]: ${context.request}`)
      }

      context.options.headers = headers
    },
    onResponse(context) {
      if (isDev && isServerSide) {
        console.info(`[Response]: ${context.request}`, context.response.status)
      }
    },
  },
})

export const apiClient = createApiClient(createFetchAdapter($fetch))
export const attachFetchHeader = (key: string, value: string | null) => {
  const original = globalConfigureHeader[key]
  if (value === null) {
    delete globalConfigureHeader[key]
  } else {
    globalConfigureHeader[key] = value
  }

  return () => {
    if (original === undefined) {
      delete globalConfigureHeader[key]
    } else {
      globalConfigureHeader[key] = original
    }
  }
}

export const setGlobalSearchParams = (params: Record<string, any>) => {
  clearGlobalSearchParams()
  Object.assign(globalConfigureSearchParams, params)
}

export const clearGlobalSearchParams = () => {
  Object.keys(globalConfigureSearchParams).forEach((key) => {
    delete globalConfigureSearchParams[key]
  })
}
export const isReactClient = true

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'api', {
    get() {
      return apiClient
    },
  })
}
