import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { NormalContainer } from '~/components/layout/container/Normal'
import type { Locale } from '~/i18n/config'
import { buildPageMetadata } from '~/lib/seo/metadata.server'

export async function generateMetadata({
  params,
}: NextPageParams<{ locale: string }>): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'privacy' })
  return buildPageMetadata({
    description: t('collect_body'),
    locale: locale as Locale,
    path: '/privacy',
    title: t('title'),
  })
}

export default async function PrivacyPage() {
  const t = await getTranslations('privacy')

  return (
    <NormalContainer>
      <article className="px-2 md:px-0">
        <header className="mb-12">
          <h1 className="font-serif text-title-28 font-medium text-neutral-10 md:text-display-36">
            {t('title')}
          </h1>
          <p className="mt-3 text-label-12 text-neutral-7">{t('updated')}</p>
        </header>
        <div className="flex flex-col gap-10 text-copy-15 leading-relaxed text-neutral-9">
          <section className="flex flex-col gap-3">
            <h2 className="text-title-20 font-medium text-neutral-10">
              {t('collect_title')}
            </h2>
            <p>{t('collect_body')}</p>
          </section>
          <section className="flex flex-col gap-3">
            <h2 className="text-title-20 font-medium text-neutral-10">
              {t('not_title')}
            </h2>
            <p>{t('not_body')}</p>
          </section>
          <section className="flex flex-col gap-3">
            <h2 className="text-title-20 font-medium text-neutral-10">
              {t('delete_title')}
            </h2>
            <p>{t('delete_body')}</p>
          </section>
          <section className="flex flex-col gap-3">
            <h2 className="text-title-20 font-medium text-neutral-10">
              {t('contact_title')}
            </h2>
            <p>{t('contact_body')}</p>
          </section>
        </div>
      </article>
    </NormalContainer>
  )
}
