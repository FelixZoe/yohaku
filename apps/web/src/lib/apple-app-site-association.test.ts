import { describe, expect, it } from 'vitest'

import {
  appleAppSiteAssociation,
  appleAppSiteAssociationResponse,
} from './apple-app-site-association'

describe('appleAppSiteAssociation', () => {
  it('claims the Yohaku iOS app id', () => {
    expect(appleAppSiteAssociation.applinks.details[0]?.appIDs).toEqual([
      'KAMM5N88X3.in.innei',
    ])
  })

  it('opens post and note paths, with and without a locale prefix', () => {
    const paths = appleAppSiteAssociation.applinks.details[0]?.components.map(
      (component) => component['/'],
    )
    expect(paths).toEqual(['/posts/*', '/notes/*', '/*/posts/*', '/*/notes/*'])
  })
})

describe('appleAppSiteAssociationResponse', () => {
  it('serves unsigned JSON Apple can fetch without a redirect', async () => {
    const response = appleAppSiteAssociationResponse()
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toMatch(/application\/json/)
    await expect(response.json()).resolves.toEqual(appleAppSiteAssociation)
  })
})
