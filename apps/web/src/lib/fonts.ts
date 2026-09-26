import {
  Instrument_Sans,
  Noto_Serif_JP,
  Noto_Serif_SC,
  Zen_Kaku_Gothic_New,
} from 'next/font/google'

const sansFont = Instrument_Sans({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--app-font-sans',
  display: 'swap',
})

// MiSans (zh) is loaded via /fonts/misans.css (jsdelivr-backed @font-face).
// No next/font entry is needed; reference family name 'MiSans' in font stacks.

// CJK fonts are loaded on-demand via @font-face (no preload). Google Fonts ships
// each CJK family as 80-110 unicode-range woff2 chunks; preloading them all
// floods the document <head> (123 preloads per page) and saturates bandwidth on
// cold load. With display:'swap' + adjustFontFallback (next/font default), text
// renders in the size-matched fallback and swaps without visible reflow.
const sansFontJa = Zen_Kaku_Gothic_New({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--app-font-sans-ja',
  display: 'swap',
  preload: false,
  fallback: ['Zen Kaku Gothic New'],
})

const serifFontSc = Noto_Serif_SC({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--app-font-serif-sc',
  display: 'swap',
  preload: false,
  fallback: ['Noto Serif SC'],
})

const serifFontJa = Noto_Serif_JP({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--app-font-serif-ja',
  display: 'swap',
  preload: false,
  fallback: ['Noto Serif JP'],
})

// KoPub World (ko) is loaded via /fonts/kopub.css (jsdelivr-backed @font-face).
// No next/font entry is needed; reference family names 'KoPubWorld Batang' /
// 'KoPubWorld Dotum' in font stacks. Linked conditionally for ko in layout.

export const fontVariables = `${sansFont.variable} ${sansFontJa.variable} ${serifFontSc.variable} ${serifFontJa.variable}`
