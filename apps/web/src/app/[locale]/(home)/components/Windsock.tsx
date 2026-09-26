'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { m } from 'motion/react'
import { useTranslations } from 'next-intl'
import { useMemo } from 'react'

import { usePresentSubscribeModal } from '~/components/modules/subscribe'
import { SlotText } from '~/components/ui/slot-text'
import { Link } from '~/i18n/navigation'
import { apiClient } from '~/lib/request'
import { toast } from '~/lib/toast'

const EASING = [0.22, 1, 0.36, 1] as const

const rise = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-12%' as const },
  transition: { duration: 0.5, ease: EASING, delay },
})

// 节气-aligned seasons (立春/立夏/立秋/立冬), each split into three phases.
const MONTH_GREETING_KEYS: Record<number, string> = {
  2: 'ending_greeting_spring_early',
  3: 'ending_greeting_spring_mid',
  4: 'ending_greeting_spring_late',
  5: 'ending_greeting_summer_early',
  6: 'ending_greeting_summer_mid',
  7: 'ending_greeting_summer_late',
  8: 'ending_greeting_autumn_early',
  9: 'ending_greeting_autumn_mid',
  10: 'ending_greeting_autumn_late',
  11: 'ending_greeting_winter_early',
  12: 'ending_greeting_winter_mid',
  1: 'ending_greeting_winter_late',
}

function getHolidayKey(month: number, day: number): string | null {
  if (month === 1 && day <= 3) return 'windsock_newYear'
  if (month === 2 && day === 14) return 'windsock_valentine'
  if (month === 10 && day === 31) return 'windsock_halloween'
  if (month === 12 && day >= 24 && day <= 25) return 'windsock_christmas'
  return null
}

const SUBTLE_NAV = [
  { key: 'ending_nav_friends', path: '/friends' },
  { key: 'ending_nav_projects', path: '/projects' },
  { key: 'ending_nav_says', path: '/says' },
  { key: 'ending_nav_travel', path: 'https://travel.moe/go.html' },
] as const

export const Windsock = () => {
  const t = useTranslations('home')
  const tCommon = useTranslations('common')

  const greetingKey = useMemo(() => {
    const now = new Date()
    const month = now.getMonth() + 1
    const holiday = getHolidayKey(month, now.getDate())
    if (holiday) return holiday
    return MONTH_GREETING_KEYS[month]
  }, [])

  const likeQueryKey = ['site-like']
  const { data: count } = useQuery({
    queryKey: likeQueryKey,
    queryFn: () => apiClient.proxy('like_this').get(),
    refetchInterval: 1000 * 60 * 5,
  })
  const queryClient = useQueryClient()

  const { present: presentSubscribe } = usePresentSubscribeModal()

  return (
    <section className="mx-auto mt-16 max-w-[1400px] px-6 pb-8 lg:px-12">
      {/* Greeting */}
      <m.div
        className="pt-20 text-center font-serif text-title-20 tracking-[2px] text-neutral-7 lg:text-title-24"
        {...rise(0)}
      >
        {t(greetingKey)}
      </m.div>
      <m.div
        className="mb-16 text-center font-serif text-title-20 tracking-[2px] text-neutral-7 lg:mb-20 lg:text-title-24"
        {...rise(0.06)}
      >
        {t('ending_invitation')}
      </m.div>

      {/* Interaction */}
      <m.div
        className="mb-16 flex items-center justify-center gap-12 lg:mb-20"
        {...rise(0.12)}
      >
        <button
          className="group text-center"
          onClick={() => {
            apiClient
              .proxy('like_this')
              .post()
              .then(() => {
                queryClient.setQueryData(likeQueryKey, (prev: any) => prev + 1)
              })

            toast.success(tCommon('thanks'), {
              iconElement: <i className="i-mingcute-heart-fill text-error" />,
            })
          }}
        >
          <div className="font-serif text-copy-14 text-neutral-6 transition-colors duration-300 group-hover:text-accent">
            {t('ending_like_label')}
          </div>
          <div className="font-serif text-copy-13 italic text-neutral-6">
            <span className="text-error">♥</span>{' '}
            <SlotText text={String((count as any as number) ?? 0)} />
          </div>
        </button>

        <div className="h-6 w-px bg-border" />

        <button className="group text-center" onClick={presentSubscribe}>
          <div className="font-serif text-copy-14 text-neutral-6 transition-colors duration-300 group-hover:text-accent">
            {t('ending_subscribe_label')}
          </div>
          <div className="font-serif text-copy-13 italic text-neutral-6">
            {t('ending_subscribe_sub')}
          </div>
        </button>
      </m.div>

      {/* Subtle nav */}
      <m.div
        className="flex flex-wrap items-center justify-center gap-y-1 font-serif text-copy-13 text-neutral-7/80 hover:text-neutral-7"
        {...rise(0.18)}
      >
        {SUBTLE_NAV.map((item, index) => (
          <span className="inline-flex items-center" key={item.key}>
            {index > 0 && <span className="mx-2.5">·</span>}
            <Link
              className="transition-colors duration-300 hover:text-accent"
              href={item.path}
            >
              {t(item.key)}
            </Link>
          </span>
        ))}
      </m.div>
    </section>
  )
}
