import { renderSkillOg } from '~/lib/og-skill'

export const runtime = 'nodejs'
export const revalidate = 86400

export const GET = async (
  _req: Request,
  { params }: { params: Promise<{ name: string }> },
) => {
  const { name } = await params
  return renderSkillOg(name)
}
