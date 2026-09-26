import type { SiteOverlay } from '../mobile/src/site-config'

/** Closed-source App Store overlay. Do not copy this directory to Innei/Yohaku. */
export const siteOverlay: SiteOverlay = {
  apiUrl: 'https://mx.innei.in/api/v3',
  siteUrl: 'https://innei.in',
  siteHosts: ['innei.in', 'www.innei.in'],
  privacyUrl: 'https://innei.in/privacy',
  scheme: 'yohaku',
  bundleId: 'in.innei',
  bundledOwner: {
    name: 'Innei',
    avatarUrl: 'https://avatars.githubusercontent.com/u/41265413?v=4',
    siteHost: 'innei.in',
    webUrl: 'https://innei.in',
  },
}
