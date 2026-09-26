'use client'

import { useTranslations } from 'next-intl'

import { useIsOwnerLogged } from '~/atoms/hooks/owner'
import { useResolveAdminUrl } from '~/atoms/hooks/url'
import { clsxm } from '~/lib/helper'

interface Props {
  id: string
  type: 'notes' | 'pages' | 'posts'
}
export const GoToAdminEditingButton: Component<Props> = (props) => {
  const t = useTranslations('common')
  const isLogin = useIsOwnerLogged()
  const resolveAdminUrl = useResolveAdminUrl()
  const { id, type, className } = props
  if (!isLogin) return null

  const adminUrl = resolveAdminUrl(`#/${type}/edit?id=${id}`)
  if (!adminUrl) return null
  return (
    <a
      data-hide-print
      href={adminUrl}
      rel="noreferrer"
      target="_blank"
      className={clsxm(
        'flex size-8 rounded-full text-accent no-underline opacity-80 ring-1 ring-neutral-3 duration-200 center hover:opacity-100',
        className,
      )}
    >
      <i className="i-mingcute-quill-pen-line" />
      <span className="sr-only">{t('actions_edit')}</span>
    </a>
  )
}
