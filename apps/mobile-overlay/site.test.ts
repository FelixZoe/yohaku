import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { mergeSite } from '../mobile/src/site-config'
import { siteOverlay } from './site'

const overlayDir = path.dirname(fileURLToPath(import.meta.url))

describe('self-host overlay (root.mom)', () => {
  it('writes current production identity', () => {
    const resolved = mergeSite(siteOverlay)
    expect(resolved).toMatchObject({
      apiUrl: 'https://api.root.mom/api/v3',
      siteUrl: 'https://root.mom',
      siteHosts: ['root.mom', 'www.root.mom'],
      privacyUrl: 'https://root.mom/privacy',
      scheme: 'yohaku',
      bundleId: 'in.innei',
      bundledOwner: {
        name: 'Innei',
        avatarUrl: 'https://avatars.githubusercontent.com/u/41265413?v=4',
        siteHost: 'innei.in',
        webUrl: 'https://innei.in',
      },
    })
  })

  it('bakes production EAS env including the Push Relay origin', () => {
    const expo = JSON.parse(
      readFileSync(path.join(overlayDir, 'expo.json'), 'utf8'),
    ) as {
      eas?: { build?: { production?: { env?: Record<string, string> } } }
    }
    expect(expo.eas?.build?.production?.env).toMatchObject({
      EXPO_PUBLIC_API_URL: 'https://mx.innei.in/api/v3',
      EXPO_PUBLIC_PUSH_APP_ID: 'yohaku',
      EXPO_PUBLIC_PUSH_RELAY_URL:
        'https://push-relay-production-b0fb.up.railway.app',
      EXPO_PUBLIC_APNS_ENV: 'production',
    })
  })

  it('keeps OTA code-signing in overlay, not the public mobile tree', () => {
    const expo = JSON.parse(
      readFileSync(path.join(overlayDir, 'expo.json'), 'utf8'),
    ) as {
      updates?: {
        url?: string
        codeSigningCertificate?: string
        codeSigningMetadata?: { alg: string; keyid: string }
      }
    }
    expect(expo.updates).toMatchObject({
      url: 'https://ota.innei.in/manifest',
      codeSigningCertificate: './certs/certificate.pem',
      codeSigningMetadata: {
        keyid: 'main',
        alg: 'rsa-v1_5-sha256',
      },
    })
    expect(existsSync(path.join(overlayDir, 'certs/certificate.pem'))).toBe(
      true,
    )
  })
})
