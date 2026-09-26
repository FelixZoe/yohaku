import { describe, expect, it } from 'vitest'

import {
  buildSkillOgText,
  clampSentences,
  extractSections,
  skillTitleFontSize,
  splitSentences,
  truncateToWidth,
  visualWidth,
} from './skill-og-text'

describe('visualWidth', () => {
  it('counts latin characters as one unit', () => {
    expect(visualWidth('hello')).toBe(5)
  })

  it('counts cjk and fullwidth characters as two units', () => {
    expect(visualWidth('调试')).toBe(4)
    expect(visualWidth('デバッグ')).toBe(8)
    expect(visualWidth('디버깅')).toBe(6)
    expect(visualWidth('系统 debug')).toBe(10)
  })
})

describe('splitSentences', () => {
  it('splits on latin terminators', () => {
    expect(splitSentences('One thing. Two things! Three?')).toEqual([
      'One thing.',
      'Two things!',
      'Three?',
    ])
  })

  it('splits on cjk terminators', () => {
    expect(splitSentences('遇到缺陷时使用。其余内容忽略。')).toEqual([
      '遇到缺陷时使用。',
      '其余内容忽略。',
    ])
  })

  it('does not split on abbreviations or version numbers', () => {
    expect(splitSentences('Covers tooling, e.g. vitest setup')).toEqual([
      'Covers tooling, e.g. vitest setup',
    ])
    expect(splitSentences('Requires next 16.1. Older is untested.')).toEqual([
      'Requires next 16.1. Older is untested.',
    ])
  })

  it('requires whitespace or end after a latin terminator', () => {
    expect(splitSentences('Reads foo.md and bar.md files')).toEqual([
      'Reads foo.md and bar.md files',
    ])
  })

  it('keeps only the first non-empty line', () => {
    expect(splitSentences('\n\nFirst line.\nTRIGGER — second line')).toEqual([
      'First line.',
    ])
  })
})

describe('clampSentences', () => {
  it('keeps whole sentences up to the budget', () => {
    expect(
      clampSentences(
        'Use when encountering any bug. Read this before opening the file. A third sentence that will not fit at all in the remaining budget.',
        70,
      ),
    ).toBe('Use when encountering any bug. Read this before opening the file.')
  })

  it('falls back to truncating when even the first sentence overflows', () => {
    const result = clampSentences(
      'Use when encountering any bug, test failure, or unexpected behavior.',
      30,
    )
    expect(visualWidth(result)).toBeLessThanOrEqual(30)
    expect(result.endsWith('…')).toBe(true)
  })

  it('returns an empty string for blank input', () => {
    expect(clampSentences('', 100)).toBe('')
    expect(clampSentences('   \n  ', 100)).toBe('')
  })
})

describe('truncateToWidth', () => {
  it('leaves short values untouched', () => {
    expect(truncateToWidth('short', 20)).toBe('short')
  })

  it('retreats to a word boundary for latin text', () => {
    const result = truncateToWidth(
      'Use when encountering any bug, test failure, or unexpected behavior',
      30,
    )
    expect(result).toBe('Use when encountering any…')
    expect(visualWidth(result)).toBeLessThanOrEqual(30)
  })

  it('cuts mid-string for cjk text that has no spaces', () => {
    const result = truncateToWidth('遇到任何缺陷测试失败或非预期行为时使用', 20)
    expect(visualWidth(result)).toBeLessThanOrEqual(20)
    expect(result.endsWith('…')).toBe(true)
  })
})

describe('extractSections', () => {
  const body = `# Title

Intro paragraph.

## Overview
text
## The Process
text
### Nested
text
## Red Flags
text
## Overview
duplicate heading
`

  it('prefers level-2 headings, in order, without duplicates', () => {
    expect(extractSections(body)).toEqual([
      'Overview',
      'The Process',
      'Red Flags',
    ])
  })

  it('falls back to level-1 headings when there are no level-2 ones', () => {
    expect(extractSections('# Alpha\ntext\n# Beta\n')).toEqual([
      'Alpha',
      'Beta',
    ])
  })

  it('ignores headings inside fenced code blocks', () => {
    expect(
      extractSections('## Real\n\n```md\n## Fake\n```\n\n## Also Real\n'),
    ).toEqual(['Real', 'Also Real'])
  })

  it('strips inline markdown from heading text', () => {
    expect(extractSections('## `useThing` and **bold**\n')).toEqual([
      'useThing and bold',
    ])
    expect(extractSections('## [Docs](https://example.com/a)\n')).toEqual([
      'Docs',
    ])
  })

  it('keeps parenthesised prose in heading text', () => {
    expect(extractSections('## Setup (advanced)\n')).toEqual([
      'Setup (advanced)',
    ])
  })

  it('drops overlong headings and caps the row', () => {
    const long = `## ${'x'.repeat(40)}\n## Short\n`
    expect(extractSections(long)).toEqual(['Short'])
    expect(
      extractSections('## One\n## Two\n## Three\n## Four\n## Five\n').length,
    ).toBeLessThanOrEqual(4)
  })

  it('returns nothing for a body without headings', () => {
    expect(extractSections('just prose\n\nmore prose')).toEqual([])
  })
})

describe('skillTitleFontSize', () => {
  it('picks tiers by visual width', () => {
    expect(skillTitleFontSize(10)).toBe(54)
    expect(skillTitleFontSize(28)).toBe(54)
    expect(skillTitleFontSize(29)).toBe(44)
    expect(skillTitleFontSize(44)).toBe(44)
    expect(skillTitleFontSize(45)).toBe(34)
  })
})

describe('buildSkillOgText', () => {
  it('keeps the name as the title and the description as supporting copy', () => {
    expect(
      buildSkillOgText({
        name: 'systematic-debugging',
        description:
          'Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes.\nTRIGGER — read this first.',
        body: '## Overview\n## Red Flags\n',
      }),
    ).toEqual({
      eyebrow: 'AI SKILL',
      title: 'systematic-debugging',
      titleFontSize: 54,
      description:
        'Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes.',
      sections: ['Overview', 'Red Flags'],
    })
  })

  it('degrades to title only when there is no description or body', () => {
    expect(buildSkillOgText({ name: 'gsap' })).toEqual({
      eyebrow: 'AI SKILL',
      title: 'gsap',
      titleFontSize: 54,
      description: '',
      sections: [],
    })
  })

  it('truncates an overlong name and shrinks its tier', () => {
    const { title, titleFontSize } = buildSkillOgText({
      name: 'an-extremely-long-skill-name-that-will-not-fit-on-a-single-title-line',
    })
    expect(visualWidth(title)).toBeLessThanOrEqual(60)
    expect(title.endsWith('…')).toBe(true)
    expect(titleFontSize).toBe(34)
  })

  it('caps a runaway description at the description budget', () => {
    const { description } = buildSkillOgText({
      name: 'claude-api',
      description:
        'Reference for the Claude API and Anthropic SDK covering model ids, pricing, params, streaming, tool use, MCP, agents, caching, token counting and model migration across every supported runtime',
    })
    expect(visualWidth(description)).toBeLessThanOrEqual(170)
    expect(description.endsWith('…')).toBe(true)
  })
})
