import { resolveOgLocale, withAcceptLanguageVary } from '~/lib/og-locale'
import { renderOg } from '~/lib/og-renderer'

export const runtime = 'nodejs'
export const revalidate = 86400

export const GET = async (
  req: Request,
  { params }: { params: Promise<{ category: string; slug: string }> },
) => {
  const { category, slug } = await params
  return withAcceptLanguageVary(
    await renderOg(
      { type: 'post', category, slug },
      resolveOgLocale(req.headers.get('accept-language')),
    ),
  )
}
