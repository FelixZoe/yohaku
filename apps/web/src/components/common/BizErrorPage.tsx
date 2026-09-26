'use client'

import { useTranslations } from 'next-intl'
import type { FC } from 'react'

export const BizErrorPage: FC<{
  bizMessage: string
  status: number
}> = ({ bizMessage, status }) => {
  const t = useTranslations('error')
  return (
    <div className="center flex min-h-[calc(100vh-10rem)] flex-col">
      <h2 className="mb-5 flex flex-col gap-2 text-center">
        <p>{t('biz_error_title')}</p>
        <p>{t('biz_error_http_status', { status: String(status) })}</p>
        <p>{t('biz_error_message', { message: bizMessage })}</p>
      </h2>
    </div>
  )
}
