import { resolveOgLocale, withAcceptLanguageVary } from '~/lib/og-locale'
import { renderOg } from '~/lib/og-renderer'

export const runtime = 'nodejs'
export const revalidate = 86400

export const GET = async (
  req: Request,
  { params }: { params: Promise<{ nid: string }> },
) => {
  const { nid } = await params
  return withAcceptLanguageVary(
    await renderOg(
      { type: 'note', nid },
      resolveOgLocale(req.headers.get('accept-language')),
    ),
  )
}
