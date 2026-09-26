import 'server-only'

import { AsyncLocalStorage } from 'node:async_hooks'

import { createFetch } from 'ofetch'

import PKG from '~/../package.json'

import { createApiClient, createFetchAdapter } from './shared'

const isDev = process.env.NODE_ENV === 'development'

const langStorage = new AsyncLocalStorage<string>()

export const runWithLang = <T>(lang: string, fn: () => T): T =>
  langStorage.run(lang, fn)

export const $fetch = createFetch({
  // Next patches globalThis.fetch after this module evaluates; ofetch's
  // default snapshot would bypass the data cache and request dedupe.
  fetch: (...args) => globalThis.fetch(...args),
  defaults: {
    timeout: 8000,
    async onRequest(context) {
      let headers: any = context.options.headers
      if (headers && headers instanceof Headers) {
        headers = Object.fromEntries(headers.entries())
      } else {
        headers = {}
      }

      const lang = langStorage.getStore()
      if (lang) {
        const url = new URL(context.request as string, 'http://localhost')
        if (!url.searchParams.has('lang')) {
          url.searchParams.set('lang', lang)
          context.request = url.origin + url.pathname + url.search
        }
      }

      if (isDev) {
        console.info(`[Request/Server]: ${context.request}`)
      }

      headers['User-Agent'] =
        `NextJS/v${PKG.dependencies.next} ${PKG.name}/${PKG.version}`

      context.options.headers = headers
    },
    onResponse(context) {
      console.info(
        `[Response/Server]: ${context.request}`,
        context.response.status,
      )
    },
  },
})
export const apiClient = createApiClient(createFetchAdapter($fetch))

const Noop = () => null
export const attachFetchHeader = () => Noop

export const setGlobalSearchParams = Noop
export const clearGlobalSearchParams = Noop

export const isReactServer = true
