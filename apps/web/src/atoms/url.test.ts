import { describe, expect, it } from 'vitest'

import { applyUrlConfig, getAdminUrl, getWebUrl } from './url'

describe('applyUrlConfig', () => {
  it('stores the owner admin dashboard URL', () => {
    applyUrlConfig({ adminUrl: 'https://admin.example.com/' })

    expect(getAdminUrl()).toBe('https://admin.example.com/')
  })

  it('stores the public web URL', () => {
    applyUrlConfig({ webUrl: 'https://blog.example.com/' })

    expect(getWebUrl()).toBe('https://blog.example.com/')
  })
})
