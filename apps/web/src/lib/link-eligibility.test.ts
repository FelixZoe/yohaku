import { describe, expect, it } from 'vitest'

import { isExternalHttpUrl } from './link-eligibility'

describe('isExternalHttpUrl', () => {
  const cases: Array<{
    name: string
    href: string
    currentHost: string
    expected: boolean
  }> = [
    {
      name: 'external https url',
      href: 'https://example.com/foo',
      currentHost: 'mysite.com',
      expected: true,
    },
    {
      name: 'external http url',
      href: 'http://example.com/foo',
      currentHost: 'mysite.com',
      expected: true,
    },
    {
      name: 'same-origin https url',
      href: 'https://mysite.com/foo',
      currentHost: 'mysite.com',
      expected: false,
    },
    {
      name: 'same-origin with mixed-case host',
      href: 'https://MySite.com/foo',
      currentHost: 'mysite.com',
      expected: false,
    },
    {
      name: 'host with non-default port differs from bare host',
      href: 'https://example.com:8080/foo',
      currentHost: 'example.com',
      expected: true,
    },
    {
      name: 'mailto protocol',
      href: 'mailto:foo@bar.com',
      currentHost: 'mysite.com',
      expected: false,
    },
    {
      name: 'tel protocol',
      href: 'tel:+1234567890',
      currentHost: 'mysite.com',
      expected: false,
    },
    {
      name: 'javascript protocol',
      href: 'javascript:alert(1)',
      currentHost: 'mysite.com',
      expected: false,
    },
    {
      name: 'ftp protocol',
      href: 'ftp://files.example.com/x',
      currentHost: 'mysite.com',
      expected: false,
    },
    {
      name: 'absolute path (relative)',
      href: '/posts/foo',
      currentHost: 'mysite.com',
      expected: false,
    },
    {
      name: 'bare relative path',
      href: 'posts/foo',
      currentHost: 'mysite.com',
      expected: false,
    },
    {
      name: 'fragment-only',
      href: '#section',
      currentHost: 'mysite.com',
      expected: false,
    },
    {
      name: 'empty string',
      href: '',
      currentHost: 'mysite.com',
      expected: false,
    },
    {
      name: 'external url with credentials',
      href: 'https://user:pass@example.com/foo',
      currentHost: 'mysite.com',
      expected: true,
    },
    {
      name: 'IDN host (punycode-encoded by URL)',
      href: 'https://例え.jp/foo',
      currentHost: 'mysite.com',
      expected: true,
    },
    {
      name: 'same IDN host should be internal',
      href: 'https://例え.jp/foo',
      currentHost: 'xn--r8jz45g.jp',
      expected: false,
    },
    {
      name: 'currentHost provided in mixed case',
      href: 'https://example.com/foo',
      currentHost: 'Example.com',
      expected: false,
    },
    {
      name: 'malformed url',
      href: 'http://',
      currentHost: 'mysite.com',
      expected: false,
    },
  ]

  for (const { name, href, currentHost, expected } of cases) {
    it(`${expected ? 'accepts' : 'rejects'}: ${name}`, () => {
      expect(isExternalHttpUrl(href, currentHost)).toBe(expected)
    })
  }
})
