import { describe, expect, it } from 'vitest'

import { getSummaryFromMd, getWordCountFromMd } from './markdown'

describe('markdown word count', () => {
  it('counts semantic words after removing markdown syntax', () => {
    const markdown = '## Hello, **world**! This is [Yohaku](https://innei.in).'

    expect(getWordCountFromMd(markdown, 'en')).toBe(5)
    expect(getSummaryFromMd(markdown, { count: true }).wordCount).toBe(5)
  })

  it('segments CJK text instead of reporting its character length', () => {
    const markdown = '这是一个测试。你好世界。'
    const count = getWordCountFromMd(markdown, 'zh')

    expect(count).toBeGreaterThan(0)
    expect(count).toBeLessThan(markdown.length)
  })

  it('returns zero for empty content', () => {
    expect(getWordCountFromMd('')).toBe(0)
  })
})
