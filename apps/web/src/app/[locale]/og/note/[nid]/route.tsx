import { renderOg } from '~/lib/og-renderer'

export const runtime = 'nodejs'
export const revalidate = 86400

export const GET = async (
  _req: Request,
  { params }: { params: Promise<{ locale: string; nid: string }> },
) => {
  const { locale, nid } = await params
  return renderOg({ type: 'note', nid }, locale)
}
