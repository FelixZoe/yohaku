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
    description: t('support_intro'),
    locale: locale as Locale,
    path: '/support',
    title: t('support_title'),
  })
}

export default async function SupportPage() {
  const t = await getTranslations('privacy')

  return (
    <NormalContainer>
      <article className="px-2 md:px-0">
        <header className="mb-12">
          <h1 className="font-serif text-title-28 font-medium text-neutral-10 md:text-display-36">
            {t('support_title')}
          </h1>
          <p className="mt-3 text-copy-15 leading-relaxed text-neutral-8">
            {t('support_intro')}
          </p>
        </header>
        <div className="flex flex-col gap-10 text-copy-15 leading-relaxed text-neutral-9">
          <section className="flex flex-col gap-3">
            <h2 className="text-title-20 font-medium text-neutral-10">
              {t('support_contact_title')}
            </h2>
            <p>
              {t('support_contact_body')}{' '}
              <a
                className="underline underline-offset-4"
                href="mailto:i@innei.in"
              >
                i@innei.in
              </a>
            </p>
          </section>
          <section className="flex flex-col gap-3">
            <h2 className="text-title-20 font-medium text-neutral-10">
              {t('support_report_title')}
            </h2>
            <p>{t('support_report_body')}</p>
          </section>
          <section className="flex flex-col gap-3">
            <h2 className="text-title-20 font-medium text-neutral-10">
              {t('support_response_title')}
            </h2>
            <p>{t('support_response_body')}</p>
          </section>
        </div>
      </article>
    </NormalContainer>
  )
}
