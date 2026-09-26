import { permanentRedirect } from 'next/navigation'
import type { PropsWithChildren } from 'react'

import { getContentRedirectPath } from '~/lib/content-locale'

import type { PageParams } from './api'
import { getData } from './api'

export default async function PostDetailRouteGuard({
  children,
  params,
}: PropsWithChildren<{ params: Promise<PageParams> }>) {
  const resolvedParams = await params
  const { post } = await getData(resolvedParams)
  const { data } = post

  const canonicalPath = `/posts/${data.category.slug}/${data.slug}`
  const requestedPath = `/posts/${resolvedParams.category}/${resolvedParams.slug}`
  const redirectPath = getContentRedirectPath({
    requestedLocale: resolvedParams.locale,
    requestedPath,
    canonicalPath,
  })

  if (redirectPath) {
    permanentRedirect(redirectPath)
  }

  return children
}
