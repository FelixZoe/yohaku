import { geolocation, ipAddress } from '@vercel/functions'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'

import {
  REQUEST_GEO,
  REQUEST_HOST,
  REQUEST_IP,
  REQUEST_LOCALE,
  REQUEST_PATHNAME,
  REQUEST_QUERY,
} from './constants/system'
import { defaultLocale, locales } from './i18n/config'
import { isUnprefixedContentDetailPath } from './i18n/content-route'
import { routing } from './i18n/routing'
import {
  HTML_CRAWLER_PATTERN,
  skillWantsMarkdown,
} from './lib/skill-content-negotiation'

const intlMiddleware = createIntlMiddleware(routing)
const contentDetailIntlMiddleware = createIntlMiddleware({
  ...routing,
  localeDetection: false,
})

function getLocaleFromPathname(pathname: string): string {
  const firstSegment = pathname.split('/').find(Boolean)
  if (firstSegment && (locales as readonly string[]).includes(firstSegment)) {
    return firstSegment
  }
  return defaultLocale
}

const shouldSkipIntl = (pathname: string) => {
  const isOgRoute =
    pathname === '/og' ||
    pathname.startsWith('/og/') ||
    locales.some(
      (locale) =>
        pathname === `/${locale}/og` || pathname.startsWith(`/${locale}/og/`),
    )

  return (
    isOgRoute ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/_vercel') ||
    pathname.startsWith('/feed') ||
    pathname.startsWith('/sitemap') ||
    pathname.startsWith('/.well-known') ||
    pathname === '/apple-app-site-association' ||
    pathname.startsWith('/home-og') ||
    /^\/skills\/[^/]+\/.+$/.test(pathname) ||
    pathname === '/robots.txt' ||
    pathname.includes('.')
  )
}

const SKILL_DETAIL_PATH = /^\/skills\/([^/]+)\/?$/

/**
 * Append custom request headers to a middleware response by extending
 * the Next.js `x-middleware-override-headers` mechanism.
 * Preserves any headers already set by previous middleware (e.g. next-intl).
 */
function appendRequestHeaders(
  response: NextResponse,
  headers: Record<string, string>,
) {
  const existing = response.headers.get('x-middleware-override-headers') || ''
  const overrideList = existing.split(',').filter(Boolean)

  for (const [name, value] of Object.entries(headers)) {
    const lowerName = name.toLowerCase()
    if (!overrideList.includes(lowerName)) {
      overrideList.push(lowerName)
    }
    response.headers.set(`x-middleware-request-${lowerName}`, value)
  }

  response.headers.set('x-middleware-override-headers', overrideList.join(','))
}

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl

  let geo = geolocation(req)
  const { headers } = req
  let ip = ipAddress(req) ?? headers.get('x-real-ip')
  const forwardedFor = headers.get('x-forwarded-for')
  if (!ip && forwardedFor) {
    ip = forwardedFor.split(',').at(0) ?? ''
  }
  const cfGeo = headers.get('cf-ipcountry')
  if (cfGeo && !geo) {
    geo = {
      country: cfGeo,
      city: headers.get('cf-ipcity') ?? '',
      latitude: headers.get('cf-iplatitude') ?? '',
      longitude: headers.get('cf-iplongitude') ?? '',
      region: headers.get('cf-region') ?? '',
    }
  }

  const { searchParams } = req.nextUrl

  const skillMatch = SKILL_DETAIL_PATH.exec(pathname)
  if (
    skillMatch &&
    skillWantsMarkdown({
      accept: headers.get('accept'),
      userAgent: headers.get('user-agent'),
    })
  ) {
    const url = req.nextUrl.clone()
    url.pathname = `/skills/${skillMatch[1]}/SKILL.md`
    return NextResponse.redirect(url, 302)
  }

  if (searchParams.has('peek-to')) {
    const peekTo = searchParams.get('peek-to')
    if (peekTo) {
      const clonedUrl = req.nextUrl.clone()
      clonedUrl.pathname = peekTo
      clonedUrl.searchParams.delete('peek-to')
      return NextResponse.redirect(clonedUrl)
    }
  }

  const customHeaders: Record<string, string> = {
    [REQUEST_PATHNAME]: pathname,
    [REQUEST_QUERY]: search,
    [REQUEST_GEO]: geo?.country || 'unknown',
    [REQUEST_IP]: ip || '',
    [REQUEST_HOST]: headers.get('host') || '',
    [REQUEST_LOCALE]: getLocaleFromPathname(pathname),
  }

  if (!shouldSkipIntl(pathname)) {
    const keepCanonicalForCrawler =
      isUnprefixedContentDetailPath(pathname) &&
      HTML_CRAWLER_PATTERN.test(headers.get('user-agent') ?? '')
    const response = keepCanonicalForCrawler
      ? contentDetailIntlMiddleware(req)
      : intlMiddleware(req)

    if (response.headers.get('location')) {
      return response
    }

    appendRequestHeaders(response, customHeaders)
    return response
  }

  const response = NextResponse.next()
  appendRequestHeaders(response, customHeaders)
  return response
}

// `dev-demos` must stay excluded, not merely skipped inside `proxy`. Every other
// non-intl path here is a route handler; dev-demos is the one page route, and
// returning `NextResponse.next()` with request-header overrides makes Next bounce
// its RSC requests to a `?_rsc=` variant. The client router then never resolves
// the key it asked for and re-requests forever — a client-side <Link> click into
// the segment loops 307/200 until the tab is closed.
export const config = {
  matcher: [
    '/((?!api|dev-demos|_next/static|_next/image|favicon.ico|sw.js|\\.well-known|apple-app-site-association).*)',
  ],
}
