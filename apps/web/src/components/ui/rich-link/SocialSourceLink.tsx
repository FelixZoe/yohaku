import type { FC } from 'react'

import { Favicon } from './Favicon'

const prefixToUrlMap = {
  GH: 'https://github.com/',
  TW: 'https://twitter.com/',
  TG: 'https://t.me/',
  ZH: 'https://www.zhihu.com/people/',
}

export const SocialSourceLink: FC<{
  source: string
  name: React.ReactNode
  href?: string
}> = ({ name, source, href }) => {
  // @ts-ignore
  const urlPrefix = prefixToUrlMap[source]

  if (!urlPrefix) return null

  return (
    <span className="mx-1 space-x-1 align-text-bottom">
      <Favicon source={source} />
      <a
        className="underline-offset-2"
        href={href ?? `${urlPrefix}${name}`}
        rel="noreferrer nofollow inline"
        target="_blank"
      >
        {name}
      </a>
    </span>
  )
}
