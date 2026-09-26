'use client'

import { LinkFavicon } from '@haklex/rich-editor'

import { clsxm } from '~/lib/helper'

import { getPlatformFromUrl, platformIconMap } from './favicon-config'

type FaviconProps = {
  source?: string
  href?: string
  noIcon?: boolean
}

export const Favicon: Component<FaviconProps> = (props) => {
  const { source, href, className, noIcon } = props

  return (
    <LinkFavicon
      getPlatformFromUrl={getPlatformFromUrl}
      href={href}
      noIcon={noIcon}
      platformIconMap={platformIconMap}
      source={source}
      className={clsxm(
        'mr-1 inline-flex shrink-0 [&_svg]:inline [&_svg]:h-[0.8em]!',
        className,
      )}
    />
  )
}
