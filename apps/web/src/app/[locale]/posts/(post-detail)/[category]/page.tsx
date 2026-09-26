import { getTranslations } from 'next-intl/server'

import type { Locale } from '~/i18n/config'
import { redirect } from '~/i18n/navigation'
import { apiClient } from '~/lib/request'
import { definePrerenderPage } from '~/lib/request.server'

export default definePrerenderPage<{
  category: string
  locale: Locale
}>()({
  fetcher({ category }) {
    return apiClient.post.getFullUrl(category)
  },
  async Component({ data, params }) {
    const { locale } = params
    const t = await getTranslations({
      locale,
      namespace: 'common',
    })
    redirect({ href: `/posts${data.path}`, locale })

    return (
      <div>
        {t('redirecting_to')} <pre>{`/posts${data.path}`}</pre>
      </div>
    )
  },
})
