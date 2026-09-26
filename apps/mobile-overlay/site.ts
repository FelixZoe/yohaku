import type { SiteOverlay } from '../mobile/src/site-config'

/** Self-host overlay for root.mom (Felix). Replaces the upstream App Store overlay. */
export const siteOverlay: SiteOverlay = {
  apiUrl: 'https://api.root.mom/api/v3',
  siteUrl: 'https://root.mom',
  siteHosts: ['root.mom', 'www.root.mom'],
  privacyUrl: 'https://root.mom/privacy',
  scheme: 'yohaku',
  bundleId: 'app.root.mom',
  bundledOwner: null,
}
