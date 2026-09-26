import { renderOg } from '~/lib/og-renderer'

export const runtime = 'nodejs'
export const revalidate = 86400

export const GET = async (
  _req: Request,
  { params }: { params: Promise<{ locale: string; slug: string }> },
) => {
  const { locale, slug } = await params
  return renderOg({ type: 'page', slug }, locale)
}
