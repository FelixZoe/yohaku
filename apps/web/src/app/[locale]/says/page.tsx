'use client'

import { useTranslations } from 'next-intl'

import { useIsOwnerLogged } from '~/atoms/hooks/owner'
import { CreateSayButton } from '~/components/modules/say/Button'
import { useSayListQuery } from '~/components/modules/say/hooks'
import {
  SayListSkeleton,
  SayMasonry,
} from '~/components/modules/say/SayMasonry'
import { NothingFound } from '~/components/modules/shared/NothingFound'
import { BottomToUpSoftSpringTransitionView } from '~/components/ui/transition'

export default function Page() {
  const t = useTranslations('says')
  const { data, isLoading, status } = useSayListQuery()
  const isLogged = useIsOwnerLogged()

  if (isLoading || status === 'pending') {
    return <SayListSkeleton />
  }

  if (!data || data.pages.length === 0) return <NothingFound />

  return (
    <div>
      <BottomToUpSoftSpringTransitionView lcpOptimization delay={0}>
        <header className="mb-[80px] flex items-center gap-3 text-title-28">
          <h1 className="text-display-36 font-bold">{t('page_title')}</h1>

          <a
            className="center flex size-8 text-[#EE802F]"
            data-event="Say RSS click"
            href="/says/feed"
            rel="noreferrer"
            target="_blank"
          >
            <i className="i-mingcute-rss-fill" />
          </a>
          {isLogged && <CreateSayButton />}
        </header>
      </BottomToUpSoftSpringTransitionView>

      <main className="mt-10">
        <SayMasonry />
      </main>
    </div>
  )
}
