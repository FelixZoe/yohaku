import { assertFetchJSONContract } from '@yohaku/rich-content/host-contract'
import { afterEach, expect, it } from 'vitest'

import { API_URL } from '~/constants/env'

import { webFetchJSON } from './use-web-host'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

it('webFetchJSON satisfies the HostCapabilities.fetchJSON error contract for an absolute (off-site) URL', async () => {
  await expect(assertFetchJSONContract(webFetchJSON)).resolves.toBeUndefined()
})

it('webFetchJSON satisfies the HostCapabilities.fetchJSON error contract for a relative (site API) path', async () => {
  await expect(
    assertFetchJSONContract(webFetchJSON, { url: '/proxy/contract-test' }),
  ).resolves.toBeUndefined()
})

// NEW-1: routing every URL through $fetch broke afilmory (an off-site host)
// on web — $fetch's onRequest unconditionally sets X-Session-Uuid, a header
// that isn't CORS-safelisted, so the browser refused to even send the
// cross-origin request. Lock in the split so it can't regress back to one
// path: an absolute URL must never carry that header.
it('does not attach X-Session-Uuid to an absolute (off-site) URL', async () => {
  let capturedHeaders: Headers | undefined
  globalThis.fetch = (async (_input, init) => {
    capturedHeaders = new Headers(init?.headers)
    return new Response(JSON.stringify({}), { status: 200 })
  }) as typeof fetch

  await webFetchJSON('https://gallery.example.com/api/manifest')

  expect(capturedHeaders?.has('x-session-uuid')).toBe(false)
})

it('attaches X-Session-Uuid to a relative (site API) path', async () => {
  let capturedHeaders: Headers | undefined
  globalThis.fetch = (async (_input, init) => {
    capturedHeaders = new Headers(init?.headers)
    return new Response(JSON.stringify({}), { status: 200 })
  }) as typeof fetch

  await webFetchJSON('/polls/p1')

  expect(capturedHeaders?.has('x-session-uuid')).toBe(true)
})

it('prefixes a relative path with API_URL but leaves an absolute URL untouched', async () => {
  let capturedInput: string | URL | Request | undefined
  globalThis.fetch = (async (input) => {
    capturedInput = input
    return new Response(JSON.stringify({}), { status: 200 })
  }) as typeof fetch

  await webFetchJSON('https://gallery.example.com/api/manifest')
  expect(String(capturedInput)).toBe('https://gallery.example.com/api/manifest')

  await webFetchJSON('/polls/p1')
  expect(String(capturedInput)).toBe(`${API_URL}/polls/p1`)
})
