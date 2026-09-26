export const cachePolicy = {
  page: {
    browser: 'public, max-age=0, must-revalidate',
    cdn: 'max-age=1',
  },
  api: {
    browser: 'public, max-age=0, must-revalidate, stale-while-revalidate=10',
    cdn: 'max-age=10, stale-while-revalidate=60',
  },
  noStore: {
    browser: 'no-store',
    cdn: 'no-store',
  },
  feed: {
    browser: 'public, max-age=300, stale-while-revalidate=3600',
    cdn: 'max-age=600, stale-while-revalidate=86400',
  },
  og: {
    primary: {
      browser: 'public, max-age=86400, stale-while-revalidate=604800',
      cdn: 'max-age=86400, stale-while-revalidate=604800',
    },
    fallback: {
      browser: 'public, max-age=60, stale-while-revalidate=300',
      cdn: 'max-age=60, stale-while-revalidate=300',
    },
    home: {
      browser: 'public, max-age=3600, stale-while-revalidate=600',
      cdn: 'max-age=3600, stale-while-revalidate=600',
    },
  },
}

export function toHeaderRecord(set) {
  return {
    'Cache-Control': set.browser,
    'CDN-Cache-Control': set.cdn,
    'Vercel-CDN-Cache-Control': set.cdn,
    'Cloudflare-CDN-Cache-Control': set.cdn,
  }
}

function toHeaderEntries(set) {
  return Object.entries(toHeaderRecord(set)).map(([key, value]) => ({
    key,
    value,
  }))
}

// Matches every path except _next, OG routes, and dotted static files — those
// have no corrective entry below, so the page catch-all must not touch them.
const PAGE_SOURCE =
  '/:path((?!_next/)(?!(?:[a-z]{2}(?:-[a-zA-Z]+)?/)?og/)(?!home-og)(?!.*\\.).*)'

const FEED_SOURCES = [
  '/feed',
  '/atom.xml',
  '/feed.xml',
  '/sitemap',
  '/sitemap.xml',
  '/thinking/feed',
  '/:locale/thinking/feed',
  '/says/feed',
  '/:locale/says/feed',
]

export function buildHeadersConfig() {
  // Order matters: Next.js headers() applies the LAST matching entry per
  // header key, so the page catch-all comes first and specifics override it.
  return [
    { source: PAGE_SOURCE, headers: toHeaderEntries(cachePolicy.page) },
    ...FEED_SOURCES.map((source) => ({
      source,
      headers: toHeaderEntries(cachePolicy.feed),
    })),
    { source: '/api/:path*', headers: toHeaderEntries(cachePolicy.api) },
    {
      source: '/api/webhook/:path*',
      headers: toHeaderEntries(cachePolicy.noStore),
    },
    { source: '/api/healthz', headers: toHeaderEntries(cachePolicy.noStore) },
  ]
}
