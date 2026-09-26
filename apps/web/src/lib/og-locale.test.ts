import { describe, expect, it } from 'vitest'

import { resolveOgLocale, withAcceptLanguageVary } from './og-locale'

describe('resolveOgLocale', () => {
  it.each([
    { name: 'missing header', header: null, expected: 'zh' },
    { name: 'empty header', header: '', expected: 'zh' },
    { name: 'unrelated language', header: 'fr-FR,de;q=0.8', expected: 'zh' },
    { name: 'exact en', header: 'en', expected: 'en' },
    { name: 'en-US region', header: 'en-US,en;q=0.9', expected: 'en' },
    { name: 'ja-JP region', header: 'ja-JP', expected: 'ja' },
    { name: 'ko-KR region', header: 'ko-KR,ko;q=0.9', expected: 'ko' },
    { name: 'zh-CN as simplified', header: 'zh-CN', expected: 'zh' },
    { name: 'zh-TW', header: 'zh-TW', expected: 'zh-TW' },
    { name: 'zh-HK as traditional', header: 'zh-HK', expected: 'zh-TW' },
    {
      name: 'highest q wins',
      header: 'en;q=0.7,zh-TW;q=0.9,ja;q=0.8',
      expected: 'zh-TW',
    },
    {
      name: 'skips q=0 entries',
      header: 'en;q=0,ja;q=0.8',
      expected: 'ja',
    },
    {
      name: 'wildcard falls through to default',
      header: '*',
      expected: 'zh',
    },
    {
      name: 'preferred language before wildcard',
      header: 'en,*;q=0.5',
      expected: 'en',
    },
  ])('$name', ({ header, expected }) => {
    expect(resolveOgLocale(header)).toBe(expected)
  })
})

describe('withAcceptLanguageVary', () => {
  it('marks the response as varying on Accept-Language', () => {
    const response = withAcceptLanguageVary(new Response(null))
    expect(response.headers.get('Vary')).toBe('Accept-Language')
  })
})
