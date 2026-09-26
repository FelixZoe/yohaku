import 'server-only'

import { apiClient } from '~/lib/request'
import type { ParsedSkill } from '~/lib/skill-frontmatter'
import { parseSkillFrontmatter } from '~/lib/skill-frontmatter'

export const isSafeSkillName = (name: string) =>
  Boolean(name) && !/[#/?\\]/.test(name)

export const fetchSkill = async (name: string): Promise<ParsedSkill | null> => {
  if (!isSafeSkillName(name)) return null
  try {
    const upstream = apiClient.proxy.s.sk(name).toString(true)
    const res = await fetch(upstream, {
      headers: { accept: 'text/markdown, text/plain, */*' },
      next: { revalidate: 300 },
    })
    if (!res.ok) return null
    const text = await res.text()
    return parseSkillFrontmatter(text)
  } catch {
    return null
  }
}
