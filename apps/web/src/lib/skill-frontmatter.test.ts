import { describe, expect, it } from 'vitest'

import { parseSkillFrontmatter, stripLeadingHeading } from './skill-frontmatter'

describe('parseSkillFrontmatter', () => {
  it('parses plain scalar fields', () => {
    const result = parseSkillFrontmatter(
      '---\nname: my-skill\ndescription: A short one\n---\n\nBody here.\n',
    )
    expect(result.name).toBe('my-skill')
    expect(result.description).toBe('A short one')
    expect(result.body).toBe('Body here.\n')
  })

  it('parses folded block scalar descriptions', () => {
    const result = parseSkillFrontmatter(
      '---\nname: my-skill\ndescription: >\n  Use when migrating a site\n  so SSR HTML is cacheable.\n---\nBody.\n',
    )
    expect(result.description).toBe(
      'Use when migrating a site so SSR HTML is cacheable.',
    )
  })

  it('parses literal block scalar descriptions', () => {
    const result = parseSkillFrontmatter(
      '---\nname: my-skill\ndescription: |\n  line one\n  line two\n---\nBody.\n',
    )
    expect(result.description).toBe('line one\nline two')
  })

  it('returns raw as body when there is no frontmatter', () => {
    const result = parseSkillFrontmatter('Just markdown.\n')
    expect(result).toEqual({ body: 'Just markdown.\n' })
  })

  it('returns raw as body when frontmatter is unterminated', () => {
    const raw = '---\nname: broken\n'
    expect(parseSkillFrontmatter(raw)).toEqual({ body: raw })
  })

  it('drops the head but keeps the body on invalid yaml', () => {
    const result = parseSkillFrontmatter('---\n{ not: [valid\n---\nBody.\n')
    expect(result.name).toBeUndefined()
    expect(result.body).toBe('Body.\n')
  })

  it('ignores non-string name and description values', () => {
    const result = parseSkillFrontmatter(
      '---\nname: 42\ndescription: [a, b]\n---\nBody.\n',
    )
    expect(result.name).toBeUndefined()
    expect(result.description).toBeUndefined()
  })
})

describe('stripLeadingHeading', () => {
  it('strips a leading H1 and following blank lines', () => {
    expect(stripLeadingHeading('# My Skill\n\nBody here.\n')).toBe(
      'Body here.\n',
    )
  })

  it('strips a leading H1 preceded by blank lines', () => {
    expect(stripLeadingHeading('\n\n# My Skill\nBody.\n')).toBe('Body.\n')
  })

  it('keeps lower-level headings', () => {
    const body = '## Section\nBody.\n'
    expect(stripLeadingHeading(body)).toBe(body)
  })

  it('keeps a body without headings', () => {
    const body = 'Just text.\n\n# Later heading\n'
    expect(stripLeadingHeading(body)).toBe(body)
  })

  it('keeps an H1 that is not the first block', () => {
    const body = 'Intro.\n\n# Heading\nBody.\n'
    expect(stripLeadingHeading(body)).toBe(body)
  })
})
