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
    description: t('terms_acceptance_body'),
    locale: locale as Locale,
    path: '/terms',
    title: t('terms_title'),
  })
}

export default async function TermsPage() {
  const t = await getTranslations('privacy')

  return (
    <NormalContainer>
      <article className="px-2 md:px-0">
        <header className="mb-12">
          <h1 className="font-serif text-title-28 font-medium text-neutral-10 md:text-display-36">
            {t('terms_title')}
          </h1>
          <p className="mt-3 text-label-12 text-neutral-7">
            {t('terms_updated')}
          </p>
        </header>
        <div className="flex flex-col gap-10 text-copy-15 leading-relaxed text-neutral-9">
          <section className="flex flex-col gap-3">
            <h2 className="text-title-20 font-medium text-neutral-10">
              {t('terms_acceptance_title')}
            </h2>
            <p>{t('terms_acceptance_body')}</p>
          </section>
          <section className="flex flex-col gap-3">
            <h2 className="text-title-20 font-medium text-neutral-10">
              {t('terms_safety_title')}
            </h2>
            <p>{t('terms_safety_body')}</p>
          </section>
          <section className="flex flex-col gap-3">
            <h2 className="text-title-20 font-medium text-neutral-10">
              {t('terms_subscription_title')}
            </h2>
            <p>
              {t('terms_subscription_body')}{' '}
              <a
                className="underline underline-offset-4"
                href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"
              >
                {t('terms_eula_link')}
              </a>
            </p>
          </section>
          <section className="flex flex-col gap-3">
            <h2 className="text-title-20 font-medium text-neutral-10">
              {t('terms_contact_title')}
            </h2>
            <p>
              {t('terms_contact_body')}{' '}
              <a
                className="underline underline-offset-4"
                href="mailto:i@innei.in"
              >
                i@innei.in
              </a>
            </p>
          </section>
        </div>
      </article>
    </NormalContainer>
  )
}
