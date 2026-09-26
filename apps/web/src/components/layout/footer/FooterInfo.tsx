'use client'

import { useTranslations } from 'next-intl'
import type { JSX, ReactNode } from 'react'

import { SubscribeTextButton } from '~/components/modules/subscribe/SubscribeTextButton'
import { FloatPopover } from '~/components/ui/float-popover'
import { Link } from '~/i18n/navigation'
import { clsxm } from '~/lib/helper'
import { useAggregationSelector } from '~/providers/root/aggregation-data-provider'

import type { FooterConfig } from './config'
import { getDefaultLinkSections } from './config'
import { Heartbeat } from './GatewayInfo'
import { OwnerName } from './OwnerName'

interface FooterInfoProps {
  backgroundSwitcher: ReactNode
  footerConfig?: FooterConfig
  localeSwitcher: ReactNode
  themeSwitcher: ReactNode
}

export const FooterInfo = ({
  localeSwitcher,
  themeSwitcher,
  backgroundSwitcher,
  footerConfig: footerConfigProp,
}: FooterInfoProps) => {
  const t = useTranslations('common')
  const socialIds = useAggregationSelector((state) => state.user.socialIds)
  const footerConfig: FooterConfig = footerConfigProp || {
    linkSections: getDefaultLinkSections(t, socialIds || undefined),
    otherInfo: {} as any,
  }
  const { otherInfo, linkSections } = footerConfig
  const currentYear = new Date().getFullYear().toString()
  const { date: dateRaw, icp } = otherInfo || {}
  const copyrightDate = (dateRaw || currentYear).replace('{{now}}', currentYear)

  return (
    <>
      <div>
        <div className="font-serif text-copy-16 tracking-[0.1em] text-neutral-9">
          <a href="/">
            <OwnerName />
          </a>
        </div>
        <div className="mt-1 text-copy-13 italic text-neutral-7">
          {t('footer_motto')}
        </div>
      </div>

      <Colophon copyrightDate={copyrightDate} icp={icp} />

      <div className="mt-3 flex flex-wrap items-center gap-x-0 gap-y-1.5 border-t border-black/4 pt-3 text-copy-13 text-neutral-6 dark:border-white/4">
        <Group>
          {linkSections.flatMap((section, si) =>
            section.links.map((link, li) => (
              <span key={link.href}>
                {(si > 0 || li > 0) && <DotSep />}
                <StyledLink
                  className="text-neutral-8 hover:underline hover:decoration-current/30 hover:underline-offset-2"
                  external={link.external}
                  href={link.href}
                >
                  {link.name}
                </StyledLink>
              </span>
            )),
          )}
        </Group>
        <SectionSep />
        <Group>
          <a
            className="text-neutral-8"
            href="/feed"
            rel="noreferrer"
            target="_blank"
          >
            {t('rss_subscribe')}
          </a>
          <DotSep />
          <a
            className="text-neutral-8"
            href="/sitemap.xml"
            rel="noreferrer"
            target="_blank"
          >
            {t('sitemap')}
          </a>
          <SubscribeTextButton>
            <DotSep />
          </SubscribeTextButton>
        </Group>
        <span className="basis-full md:flex-1" />
        <Group>
          {themeSwitcher}
          <DotSep />
          {localeSwitcher}
          <DotSep />
          {backgroundSwitcher}
        </Group>
      </div>
    </>
  )
}

const Colophon = ({
  copyrightDate,
  icp,
}: {
  copyrightDate: string
  icp?: FooterConfig['otherInfo']['icp']
}) => {
  const t = useTranslations('common')
  const hash = process.env.COMMIT_HASH
  const buildTime = process.env.BUILD_TIME

  return (
    <div className="mt-5 flex flex-col gap-2 font-mono text-label-12 text-neutral-6 md:flex-row md:items-baseline md:justify-between md:gap-8">
      <div className="flex flex-wrap items-baseline">
        <span>
          © {copyrightDate} <OwnerName />
        </span>
        {hash && process.env.COMMIT_URL && (
          <>
            <DotSep />
            <StyledLink
              external
              className={colophonLinkClass}
              href={process.env.COMMIT_URL}
            >
              {hash.slice(0, 8)}
            </StyledLink>
          </>
        )}
        {buildTime && (
          <>
            <DotSep />
            <span>
              {t('colophon_printed_at', {
                time: new Date(buildTime).toLocaleDateString(),
              })}
            </span>
          </>
        )}
        <DotSep />
        <StyledLink
          external
          className={colophonLinkClass}
          href="https://github.com/mx-space"
        >
          Mix Space
        </StyledLink>
        <DotSep />
        <YohakuLink />
        {icp && (
          <>
            <DotSep />
            <StyledLink external className={colophonLinkClass} href={icp.link}>
              {icp.text}
            </StyledLink>
          </>
        )}
      </div>
      <Heartbeat />
    </div>
  )
}

const YohakuLink = () => {
  const t = useTranslations('common')
  const rich = (key: string, href: string) =>
    t.rich(key, {
      link: (chunks) => (
        <StyledLink
          external
          className="underline decoration-current/30 underline-offset-2"
          href={href}
        >
          {chunks}
        </StyledLink>
      ),
    })

  return (
    <FloatPopover
      asChild
      mobileAsSheet
      as="span"
      type="tooltip"
      triggerElement={
        <StyledLink
          external
          className={clsxm(colophonLinkClass, 'cursor-help')}
          href="https://github.com/Innei/Yohaku"
        >
          余白 / Yohaku
        </StyledLink>
      }
    >
      <div className="max-w-xs space-y-2 text-copy-13 leading-relaxed">
        <p>{rich('yohaku_footer_line', 'https://github.com/Innei/Yohaku')}</p>
        <p>
          {rich('yohaku_footer_sponsor', 'https://github.com/sponsors/Innei')}
        </p>
      </div>
    </FloatPopover>
  )
}

const colophonLinkClass =
  'border-b border-transparent transition-colors hover:border-neutral-5 hover:text-neutral-8'

const Group = ({ children }: { children: ReactNode }) => (
  <span className="flex basis-full flex-wrap items-center md:basis-auto">
    {children}
  </span>
)

const DotSep = () => (
  <span aria-hidden className="mx-1.5 select-none text-neutral-5">
    ·
  </span>
)

const SectionSep = () => (
  <span
    aria-hidden
    className="mx-3.5 hidden select-none text-neutral-4 md:inline"
  >
    |
  </span>
)

const StyledLink = (
  props: JSX.IntrinsicElements['a'] & {
    external?: boolean
  },
) => {
  const { external, ...rest } = props
  const As = external ? 'a' : Link

  return (
    // @ts-ignore
    <As
      rel={external ? 'noreferrer' : undefined}
      target={external ? '_blank' : props.target}
      {...rest}
    >
      {props.children}
      {external && <span className="ml-0.5 text-neutral-6">↗</span>}
    </As>
  )
}
