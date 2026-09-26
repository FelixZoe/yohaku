'use client'

import { useTranslations } from 'next-intl'

import {
  setIsBackgroundEffectEnabled,
  useIsBackgroundEffectEnabled,
} from '~/atoms/hooks/background'
import { SlotText } from '~/components/ui/slot-text'
import { useIsClient } from '~/hooks/common/use-is-client'

import { FooterKv, footerKvValueClass } from './FooterKv'

export const FooterBackgroundSwitcher = () => {
  const t = useTranslations('common')
  const enabled = useIsBackgroundEffectEnabled()
  const isClient = useIsClient()
  const on = isClient ? enabled : true

  return (
    <FooterKv label={t('footer_background_effect')}>
      <button
        aria-checked={on}
        className={footerKvValueClass}
        role="switch"
        type="button"
        onClick={() => setIsBackgroundEffectEnabled(!on)}
      >
        <SlotText text={on ? t('footer_on') : t('footer_off')} />
      </button>
    </FooterKv>
  )
}
