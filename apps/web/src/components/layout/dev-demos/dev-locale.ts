import type { Locale } from '~/i18n/config'

// The dev segment lives outside `[locale]`, so there is no request locale to
// resolve. Messages are imported statically to keep the segment API-free.
export const DEV_LOCALE = 'zh' satisfies Locale
