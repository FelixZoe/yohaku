import type { CSSProperties } from 'react'

import type { Locale } from '~/i18n/config'

const sansFontStacks: Record<Locale, string> = {
  zh: [
    "'MiSans'",
    'system-ui',
    '-apple-system',
    "'PingFang SC'",
    "'Microsoft YaHei'",
    "'Segoe UI'",
    'Roboto',
    'Helvetica',
    "'Noto Sans SC'",
    "'Hiragino Sans GB'",
    'sans-serif',
    'Apple Color Emoji',
    'Segoe UI Emoji',
    'Not Color Emoji',
  ].join(', '),
  'zh-TW': [
    "'MiSans'",
    'system-ui',
    '-apple-system',
    "'PingFang TC'",
    "'Microsoft JhengHei'",
    "'Segoe UI'",
    'Roboto',
    'Helvetica',
    "'Noto Sans TC'",
    "'Heiti TC'",
    'sans-serif',
    'Apple Color Emoji',
    'Segoe UI Emoji',
    'Not Color Emoji',
  ].join(', '),
  en: [
    'system-ui',
    '-apple-system',
    "'Segoe UI'",
    'Roboto',
    'Helvetica',
    'Arial',
    'sans-serif',
    'Apple Color Emoji',
    'Segoe UI Emoji',
    'Not Color Emoji',
  ].join(', '),
  ja: [
    'var(--app-font-sans-ja)',
    'system-ui',
    '-apple-system',
    "'Hiragino Sans'",
    "'Hiragino Kaku Gothic ProN'",
    "'Yu Gothic'",
    'Meiryo',
    'sans-serif',
    'Apple Color Emoji',
    'Segoe UI Emoji',
    'Not Color Emoji',
  ].join(', '),
  ko: [
    "'KoPubWorld Dotum'",
    'system-ui',
    '-apple-system',
    "'Apple SD Gothic Neo'",
    "'Noto Sans KR'",
    "'Malgun Gothic'",
    'sans-serif',
    'Apple Color Emoji',
    'Segoe UI Emoji',
    'Not Color Emoji',
  ].join(', '),
}

const serifFontStacks: Record<Locale, string> = {
  zh: [
    'var(--app-font-serif-sc)',
    "'Noto Serif CJK SC'",
    "'Noto Serif SC'",
    "'Source Han Serif SC'",
    "'Source Han Serif'",
    'source-han-serif-sc',
    "'SongTi SC'",
    'SimSun',
    'serif',
  ].join(', '),
  'zh-TW': [
    'var(--app-font-serif-sc)',
    "'Noto Serif CJK TC'",
    "'Noto Serif TC'",
    "'Source Han Serif TC'",
    "'Source Han Serif'",
    "'Songti TC'",
    "'PMingLiU'",
    'serif',
  ].join(', '),
  // English serif: avoid pulling in the Noto Serif SC unicode-range chunks. CJK
  // glyphs in English copy are negligible; system serif is fine.
  en: ['Georgia', "'Times New Roman'", 'serif'].join(', '),
  ja: [
    'var(--app-font-serif-ja)',
    "'Hiragino Mincho ProN'",
    "'Yu Mincho'",
    "'BIZ UDPMincho'",
    "'MS PMincho'",
    'serif',
  ].join(', '),
  ko: [
    "'KoPubWorld Batang'",
    "'Noto Serif KR'",
    "'AppleMyungjo'",
    "'Apple SD Gothic Neo'",
    'serif',
  ].join(', '),
}

export const getLocaleFontStyle = (locale: Locale) =>
  ({
    '--app-font-sans-cjk': sansFontStacks[locale],
    '--app-font-serif': serifFontStacks[locale],
  }) as CSSProperties
