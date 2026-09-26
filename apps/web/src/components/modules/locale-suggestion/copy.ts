import type { Locale } from '~/i18n/config'

export interface LocaleSuggestionCopy {
  dismissLabel: string
  message: string
  switchLabel: string
}

export const localeSuggestionCopy: Record<Locale, LocaleSuggestionCopy> = {
  zh: {
    message: '本站提供简体中文版',
    switchLabel: '切换到简体中文',
    dismissLabel: '暂不',
  },
  'zh-TW': {
    message: '本站提供繁體中文版',
    switchLabel: '切換到繁體中文',
    dismissLabel: '暫時不用',
  },
  en: {
    message: 'This site is available in English',
    switchLabel: 'Switch to English',
    dismissLabel: 'Not now',
  },
  ja: {
    message: 'このサイトは日本語でもご覧いただけます',
    switchLabel: '日本語に切り替える',
    dismissLabel: '今はしない',
  },
  ko: {
    message: '이 사이트는 한국어로도 제공됩니다',
    switchLabel: '한국어로 전환',
    dismissLabel: '나중에',
  },
}
