'use client'

import { useTranslations } from 'next-intl'
import type { FC } from 'react'

import { Link } from '~/i18n/navigation'
import { clsxm } from '~/lib/helper'

const iconMotion = clsxm(
  'transition-[transform,background-color,opacity] duration-300 ease-out',
  'group-hover:duration-200 group-hover:ease-[cubic-bezier(0.22,1,0.36,1)]',
  'motion-reduce:transition-none motion-reduce:transform-none',
)

export const BackToListLine: FC<{
  className?: string
  href: string
  label: string
}> = ({ href, label, className }) => (
  <Link
    data-hide-print
    href={href}
    className={clsxm(
      'group mb-7 inline-flex items-center gap-2 text-label-12 text-neutral-6',
      'transition-colors duration-300 ease-out hover:text-neutral-9 duration-200',
      className,
    )}
  >
    <i
      className={clsxm(
        'i-mingcute-corner-up-left-line text-icon-sm text-neutral-5 duration-200',
        'group-hover:text-accent',
        iconMotion,
      )}
    />
    <span
      className={clsxm(
        'size-1.5 shrink-0 rounded-full bg-accent opacity-45',
        'group-hover:opacity-70',
        iconMotion,
      )}
    />
    {label}
  </Link>
)

export const BackToListExit: FC<{
  allHref?: string
  href: string
  label: string
}> = ({ href, label, allHref }) => {
  const t = useTranslations('common')
  return (
    <section data-hide-print className="mt-10">
      <div className="flex items-center gap-3.5">
        <span className="h-px flex-1 bg-border" />
        <span className="size-[5px] rotate-45 bg-neutral-4" />
        <span className="h-px flex-1 bg-border" />
      </div>

      <div
        className={clsxm(
          'flex items-center gap-4 pt-5 text-label-12',
          allHref ? 'justify-between' : 'justify-center',
        )}
      >
        <Link
          href={href}
          className={clsxm(
            'group inline-flex items-center gap-2 text-neutral-7',
            'transition-colors duration-300 ease-out hover:text-neutral-10 hover:duration-200',
          )}
        >
          <i
            className={clsxm(
              'i-mingcute-arrow-left-line text-icon-sm text-neutral-5',
              'group-hover:text-accent',
              iconMotion,
            )}
          />
          {t('back_to_list', { name: label })}
        </Link>

        {allHref ? (
          <Link
            href={allHref}
            className={clsxm(
              'group inline-flex items-center gap-2 text-neutral-6',
              'transition-colors duration-300 ease-out hover:text-neutral-9 hover:duration-200',
            )}
          >
            {t('nav_dropdown_view_all_posts')}
            <i
              className={clsxm(
                'i-mingcute-right-line text-icon-sm text-neutral-5',
                'group-hover:text-accent',
                iconMotion,
              )}
            />
          </Link>
        ) : null}
      </div>
    </section>
  )
}
