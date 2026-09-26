import type { Viewport } from 'next'

export const DEFAULT_VIEWPORT: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#1c1c1e' },
    { media: '(prefers-color-scheme: light)', color: '#faf7f0' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}
