import { describe, expect, it } from 'vitest'

import { createTagLabeler, tagGlossaryPairsOf } from './tag-glossary'

describe('tag glossary', () => {
  it('labels tags from meta pairs and falls back to the source', () => {
    const label = createTagLabeler(
      tagGlossaryPairsOf({
        glossary: {
          tags: [{ source: '机器学习', translated: 'Machine Learning' }],
        },
      }),
    )
    expect(label('机器学习')).toBe('Machine Learning')
    expect(label('Rust')).toBe('Rust')
  })

  it('is identity without glossary meta', () => {
    expect(createTagLabeler(tagGlossaryPairsOf(undefined))('a')).toBe('a')
  })
})
