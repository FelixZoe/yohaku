import clsx from 'clsx'
import type { ComponentPropsWithoutRef } from 'react'

import type { AuthSocialProviders } from '~/lib/authjs'

import { AUTH_PROVIDER_LOGO_ICONS } from './auth-provider-logo-icons'

type AuthProviderBrandIconProps = {
  provider: AuthSocialProviders
} & Pick<ComponentPropsWithoutRef<'svg'>, 'className' | 'aria-hidden'>

export function AuthProviderBrandIcon({
  provider,
  className,
  ...rest
}: AuthProviderBrandIconProps) {
  const { viewBox, body } = AUTH_PROVIDER_LOGO_ICONS[provider]
  return (
    <svg
      aria-hidden
      viewBox={viewBox}
      xmlns="http://www.w3.org/2000/svg"
      className={clsx(
        'size-4 shrink-0 fill-current text-neutral-10',
        provider === 'github' && 'dark:invert',
        className,
      )}
      {...rest}
      dangerouslySetInnerHTML={{ __html: body }}
    />
  )
}
