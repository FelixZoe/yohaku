import { load } from 'js-yaml'

export interface ParsedSkill {
  body: string
  description?: string
  name?: string
}

const asTrimmedString = (value: unknown) =>
  typeof value === 'string' ? value.trim() : undefined

export const stripLeadingHeading = (body: string): string => {
  const match = body.match(/^\s*# [^\n]*\n*/)
  return match ? body.slice(match[0].length) : body
}

export const parseSkillFrontmatter = (raw: string): ParsedSkill => {
  if (!raw.startsWith('---\n')) return { body: raw }
  const end = raw.indexOf('\n---\n', 4)
  if (end < 0) return { body: raw }
  const head = raw.slice(4, end)
  const body = raw.slice(end + 5).replace(/^\n+/, '')

  let fields: Record<string, unknown> = {}
  try {
    const parsed = load(head)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      fields = parsed as Record<string, unknown>
    }
  } catch {
    return { body }
  }

  return {
    name: asTrimmedString(fields.name),
    description: asTrimmedString(fields.description),
    body,
  }
}
