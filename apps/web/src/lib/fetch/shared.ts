import type { IRequestAdapter } from '@mx-space/api-client'
import { allControllers, createClient } from '@mx-space/api-client'
import type { $fetch } from 'ofetch'

import { API_URL } from '~/constants/env'
import { camelcaseKeysWithUrlSkip } from '~/lib/camelcase'

type FetchType = typeof $fetch
export const createFetchAdapter = (
  $fetch: FetchType,
): IRequestAdapter<typeof $fetch> => ({
  default: $fetch,
  get(url: string, options) {
    const { params, ...rest } = options || {}
    return $fetch(url, {
      method: 'GET',
      query: params,
      ...rest,
    })
  },
  post(url: string, options) {
    const { params, data, ...rest } = options || {}
    return $fetch(url, {
      method: 'post',
      query: params,
      body: data,
      ...rest,
    })
  },
  put(url: string, options) {
    const { params, data, ...rest } = options || {}
    return $fetch(url, {
      method: 'put',
      query: params,
      body: data,
      ...rest,
    })
  },
  patch(url: string, options) {
    const { params, data, ...rest } = options || {}
    return $fetch(url, {
      method: 'patch',
      query: params,
      body: data,
      ...rest,
    })
  },
  delete(url: string, options) {
    const { params, data, ...rest } = options || {}
    return $fetch(url, {
      method: 'delete',
      query: params,
      body: data,
      ...rest,
    })
  },
})
export const createApiClient = (
  fetchAdapter: ReturnType<typeof createFetchAdapter>,
) =>
  createClient(fetchAdapter)(API_URL, {
    controllers: allControllers,
    transformResponse: camelcaseKeysWithUrlSkip,
  })
