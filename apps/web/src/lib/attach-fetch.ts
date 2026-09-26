import 'server-only'

import { headers } from 'next/headers'

import PKG from '../../package.json'
import { attachFetchHeader } from './request'

export { runWithLang } from './fetch/fetch.server'

/**
 * Attach incoming request headers (IP, User-Agent) to outgoing API fetches.
 *
 * When called during static/ISR rendering there is no live request, so
 * `headers()` would opt the route into dynamic rendering.  Use
 * `attachServerFetchDynamic()` only in contexts that are already dynamic
 * (e.g. the locale layout which reads cookies).  For pages that should be
 * cacheable, call the plain `attachServerFetch()` which is a safe no-op.
 */
export const attachServerFetch = async () => {
  // Static-safe: only set a build-time User-Agent without calling headers()
  attachFetchHeader(
    'User-Agent',
    `NextJS/v${PKG.dependencies.next} ${PKG.name}/${PKG.version}`,
  )
}

/** Dynamic-only variant that forwards the real client IP & UA. */
const attachServerFetchDynamic = async () => {
  const { get } = await headers()

  const ua = get('user-agent')
  const ip =
    get('x-real-ip') ||
    get('x-forwarded-for') ||
    get('remote-addr') ||
    get('cf-connecting-ip')

  if (ip) {
    attachFetchHeader('x-real-ip', ip)
    attachFetchHeader('x-forwarded-for', ip)
  }

  attachFetchHeader(
    'User-Agent',
    `${ua} NextJS/v${PKG.dependencies.next} ${PKG.name}/${PKG.version}`,
  )
}
