'use client'

import type { LinkModel } from '@mx-space/api-client'
import { LinkState, LinkType } from '@mx-space/api-client'
import { useQuery } from '@tanstack/react-query'
import Markdown from 'markdown-to-jsx'
import { m } from 'motion/react'
import { useTranslations } from 'next-intl'
import type { FC } from 'react'
import { memo, useCallback, useMemo, useRef } from 'react'

import { NotSupport } from '~/components/common/NotSupport'
import { Avatar } from '~/components/ui/avatar'
import { MotionButtonBase, StyledButton } from '~/components/ui/button'
import { Collapse } from '~/components/ui/collapse'
import type { FormContextType } from '~/components/ui/form'
import { Form, FormInput } from '~/components/ui/form'
import { FullPageLoading } from '~/components/ui/loading'
import { useModalStack } from '~/components/ui/modal'
import { BottomToUpSoftSpringTransitionView } from '~/components/ui/transition'
import { staggeredEntrance } from '~/constants/spring'
import { useIsDark } from '~/hooks/common/use-is-dark'
import { addAlphaToHSL, getColorScheme, stringToHue } from '~/lib/color'
import { shuffle } from '~/lib/lodash'
import { apiClient } from '~/lib/request'
import { springScrollToTop } from '~/lib/scroller'
import { toast } from '~/lib/toast'
import { useAggregationSelector } from '~/providers/root/aggregation-data-provider'

const renderTitle = (text: string) => (
  <h1 className="my-12! text-title-20! font-bold">{text}</h1>
)

export default function Page() {
  const t = useTranslations('friends')
  const tCommon = useTranslations('common')
  const { data, isLoading } = useQuery({
    queryKey: ['friends'],
    queryFn: async () => {
      return await apiClient.link.getAll()
    },
    select: useCallback((data: LinkModel[]) => {
      const friends: LinkModel[] = []
      const collections: LinkModel[] = []
      const outdated: LinkModel[] = []
      const banned: LinkModel[] = []

      for (const link of data) {
        if (link.hide) {
          continue
        }

        switch (link.state) {
          case LinkState.Banned: {
            banned.push(link)
            continue
          }
          case LinkState.Outdate: {
            outdated.push(link)
            continue
          }
        }

        switch (link.type) {
          case LinkType.Friend: {
            friends.push(link)
            break
          }
          case LinkType.Collection: {
            collections.push(link)
          }
        }
      }

      return { friends: shuffle(friends), collections, outdated, banned }
    }, []),
  })

  if (isLoading) return <FullPageLoading />
  if (!data) return null
  const { banned, collections, friends, outdated } = data
  return (
    <div>
      <BottomToUpSoftSpringTransitionView lcpOptimization delay={0}>
        <header className="prose prose-p:my-2">
          <h1>{t('page_title')}</h1>
          <h3>{t('page_subtitle')}</h3>
        </header>
      </BottomToUpSoftSpringTransitionView>

      <main className="mt-10 flex w-full flex-col">
        {friends.length > 0 && (
          <>
            {collections.length > 0 && renderTitle(t('section_friends'))}
            <FriendSection data={friends} />
          </>
        )}
        {collections.length > 0 && (
          <>
            {friends.length > 0 && renderTitle(t('section_collections'))}
            <FavoriteSection data={collections} />
          </>
        )}

        {outdated.length > 0 && (
          <>
            <Collapse
              title={
                <div className="mt-8 font-bold">{t('section_outdated')}</div>
              }
            >
              <OutdateSection data={outdated} />
            </Collapse>
          </>
        )}
        {banned.length > 0 && (
          <>
            <Collapse
              title={
                <div className="mt-8 font-bold">{t('section_banned')}</div>
              }
            >
              <BannedSection data={banned} />
            </Collapse>
          </>
        )}
      </main>

      <ApplyLinkInfo />
      <div className="mt-10 flex justify-center border-t border-black/[0.06] pt-6 dark:border-white/[0.06]">
        <MotionButtonBase
          className="inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-copy-13 text-neutral-10/55 transition-colors duration-200 hover:bg-black/[0.02] hover:text-neutral-10/85 dark:hover:bg-white/4"
          onClick={springScrollToTop}
        >
          <i className="i-mingcute-arrow-up-circle-line text-copy-14 opacity-70" />
          <span>{tCommon('back_to_top')}</span>
        </MotionButtonBase>
      </div>
    </div>
  )
}
type FriendSectionProps = {
  data: LinkModel[]
}

const FriendSection: FC<FriendSectionProps> = ({ data }) => (
  <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
    {data.map((link, index) => (
      <FriendCard index={index} key={link.id} link={link} />
    ))}
  </section>
)

const FriendCard = memo<{ link: LinkModel; index: number }>(
  ({ link, index }) => {
    const { dark: darkColors, light: lightColors } = useMemo(
      () => getColorScheme(stringToHue(link.id)),
      [link.id],
    )
    const isDark = useIsDark()
    const accentColor = isDark ? darkColors.accent : lightColors.accent

    return (
      <m.a
        animate={staggeredEntrance.animate}
        aria-label={`Go to ${link.name}'s website`}
        className="group relative flex items-center gap-3 overflow-hidden rounded-xl border border-black/5 bg-paper px-4 py-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.05)] ring-[0.5px] ring-black/3 transition-shadow duration-300 hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:border-white/8 dark:ring-white/5"
        href={link.url}
        initial={staggeredEntrance.initial}
        rel="noreferrer"
        target="_blank"
        transition={staggeredEntrance.transition(index)}
        style={{
          backgroundImage: `linear-gradient(150deg, ${addAlphaToHSL(
            accentColor,
            isDark ? 0.08 : 0.045,
          )} 0%, transparent 55%)`,
        }}
      >
        <Avatar
          randomColor
          alt={`Avatar of ${link.name}`}
          className="shrink-0 ring-2 ring-black/5 dark:ring-white/8"
          rounded={8}
          size="lg"
          src={link.avatar}
          text={link.name[0]}
        />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-copy-13 font-medium">{link.name}</span>
          <span className="line-clamp-2 text-label-12 text-neutral-9/60">
            {link.description}
          </span>
        </span>
      </m.a>
    )
  },
)
FriendCard.displayName = 'FriendCard'

const FavoriteSection: FC<FriendSectionProps> = ({ data }) => (
  <ul className="relative flex w-full grow flex-col gap-4">
    {data.map((link) => (
      <li className="flex w-full items-end" key={link.id}>
        <a
          className="shrink-0 text-copy-14 leading-none"
          href={link.url}
          rel="noreferrer"
          target="_blank"
        >
          {link.name}
        </a>

        <span className="ml-2 h-[12px] max-w-full truncate break-all text-label-12 leading-none text-neutral-9/80">
          {link.description || ''}
        </span>
      </li>
    ))}
  </ul>
)

const OutdateSection: FC<FriendSectionProps> = ({ data }) => (
  <ul className="space-y-1 p-4 opacity-80">
    {data.map((link) => (
      <li key={link.id}>
        <span className="cursor-not-allowed font-medium">{link.name}</span>
        <span className="ml-2 text-copy-13">{link.description || ''}</span>
      </li>
    ))}
  </ul>
)

const BannedSection: FC<FriendSectionProps> = ({ data }) => (
  <ul className="space-y-1 p-4 opacity-40">
    {data.map((link) => (
      <li key={link.id}>
        <span className="cursor-not-allowed">{link.name}</span>
      </li>
    ))}
  </ul>
)

const ApplyLinkInfo: FC = () => {
  const t = useTranslations('friends')
  const {
    seo,
    user: { avatar, name },
  } = useAggregationSelector((a) => ({
    seo: a.seo!,
    user: a.user!,
  }))!

  const { data: canApply } = useQuery({
    queryKey: ['can-apply'],
    queryFn: () => apiClient.link.canApplyLink(),
    initialData: true,
    refetchOnMount: 'always',
  })
  const { present } = useModalStack()
  if (!canApply) {
    return <NotSupport className="mt-20" text={t('apply_disabled')} />
  }
  return (
    <>
      <div className="prose mt-20">
        <Markdown>
          {[
            t('rule_mutual'),
            t('rule_unavailable'),
            t('rule_content'),
            t('rule_https'),
            t('rule_domain'),
            t('rule_personal'),
          ].join('\n\n')}
        </Markdown>
        <Markdown className="[&_p]:my-1!">
          {[
            '',
            `${t('info_title')}: [${
              seo.title
            }](${`${location.protocol}//${location.host}`})`,
            `${t('info_description')}: ${seo.description}`,
            `${t('info_avatar')}: [${t('info_avatar_download')}](${avatar})`,
            `${t('info_name')}: ${name}`,
          ].join('\n\n')}
        </Markdown>
      </div>

      <StyledButton
        className="mt-5"
        variant="primary"
        onClick={() => {
          present({
            title: t('apply_modal_title'),

            content: () => <FormModal />,
          })
        }}
      >
        {t('apply_button')}
      </StyledButton>
    </>
  )
}

const FormModal = () => {
  const t = useTranslations('friends')
  const { dismissTop } = useModalStack()
  const inputs = [
    {
      name: 'author',
      label: t('form_nickname'),
      placeholder: 'innei',
      rules: [
        {
          validator: (value: string) => !!value,
          message: t('validation_nickname_required'),
        },
        {
          validator: (value: string) => value.length <= 20,
          message: t('validation_nickname_length'),
        },
      ],
    },
    {
      name: 'name',
      label: t('form_site_title'),
      placeholder: 'Yohaku',
      rules: [
        {
          validator: (value: string) => !!value,
          message: t('validation_title_required'),
        },
        {
          validator: (value: string) => value.length <= 20,
          message: t('validation_title_length'),
        },
      ],
    },
    {
      name: 'url',
      label: t('form_url'),
      placeholder: 'https://',
      rules: [
        {
          validator: isHttpsUrl,
          message: t('validation_url'),
        },
      ],
    },
    {
      name: 'avatar',
      label: t('form_avatar'),
      placeholder: 'https://',
      rules: [
        {
          validator: isHttpsUrl,
          message: t('validation_avatar'),
        },
      ],
    },
    {
      name: 'email',
      label: t('form_email'),
      placeholder: 'mail@example.com',

      rules: [
        {
          validator: isEmail,
          message: t('validation_email'),
        },
      ],
    },
    {
      name: 'description',
      label: t('form_description'),
      placeholder: '...',

      rules: [
        {
          validator: (value: string) => !!value,
          message: t('validation_description_required'),
        },
        {
          validator: (value: string) => value.length <= 50,
          message: t('validation_description_length'),
        },
      ],
    },
  ]

  const formRef = useRef<FormContextType>(null)

  const handleSubmit = useCallback(
    (e: any) => {
      e.preventDefault()
      const currentValues = formRef.current?.getCurrentValues()
      if (!currentValues) return

      apiClient.link
        .applyLink({ ...(currentValues as any) })
        .catch((err) => {
          console.error('[friends] applyLink failed:', err)
        })
        .finally(() => {
          dismissTop()
          toast.success(t('submit_success'))
        })
    },
    [dismissTop, t],
  )

  return (
    <Form
      className="flex w-full flex-col gap-4 text-left lg:w-[420px]"
      ref={formRef}
      onSubmit={handleSubmit}
    >
      <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2">
        <FormInput {...inputs[0]} />
        <FormInput {...inputs[1]} />

        <FormInput {...inputs[2]} />
        <FormInput {...inputs[3]} />
      </div>

      <div className="flex flex-col gap-3">
        <FormInput {...inputs[4]} />
        <FormInput {...inputs[5]} />
      </div>

      <div className="mt-2 flex justify-end">
        <StyledButton type="submit" variant="primary">
          {t('submit_button')}
        </StyledButton>
      </div>
    </Form>
  )
}

const isHttpsUrl = (value: string) =>
  /^https?:\/\/.*/.test(value) &&
  (() => {
    try {
      const parsedUrl = new URL(value)
      return Boolean(parsedUrl)
    } catch {
      return false
    }
  })()

const isEmail = (value: string) =>
  /^.[^\n\r@\u2028\u2029]*@.[^\n\r.\u2028\u2029]*\..+$/.test(value)
