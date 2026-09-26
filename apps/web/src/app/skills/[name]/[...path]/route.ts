import { NextResponse } from 'next/server'

import { API_URL } from '~/constants/env'

interface RouteContext {
  params: Promise<{ name: string; path: string[] }>
}

const FORBIDDEN_SEGMENT = /[#?\\]/

const isSafeName = (name: string) =>
  Boolean(name) && !FORBIDDEN_SEGMENT.test(name) && !name.includes('/')

const isSafePath = (segments: string[]) => {
  if (segments.length === 0) return false
  for (const seg of segments) {
    if (!seg) return false
    if (seg === '.' || seg === '..') return false
    if (FORBIDDEN_SEGMENT.test(seg)) return false
  }
  return true
}

export async function GET(_req: Request, ctx: RouteContext) {
  const { name, path } = await ctx.params
  if (!isSafeName(name) || !isSafePath(path)) {
    return new NextResponse('Not Found', { status: 404 })
  }

  const upstream = `${API_URL.replace(/\/$/, '')}/s/sk/${encodeURIComponent(name)}/${path.map(encodeURIComponent).join('/')}`

  try {
    const upstreamRes = await fetch(upstream, {
      headers: { accept: 'text/markdown, text/plain, */*' },
      next: { revalidate: 300 },
    })
    if (!upstreamRes.ok) {
      return new NextResponse('Not Found', { status: upstreamRes.status })
    }

    const contentType =
      upstreamRes.headers.get('content-type') ||
      (path.at(-1)?.endsWith('.md')
        ? 'text/markdown; charset=utf-8'
        : 'text/plain; charset=utf-8')

    const body = await upstreamRes.arrayBuffer()
    return new NextResponse(body, {
      status: 200,
      headers: {
        'content-type': contentType,
        'cache-control':
          'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
      },
    })
  } catch {
    return new NextResponse('Not Found', { status: 502 })
  }
}
