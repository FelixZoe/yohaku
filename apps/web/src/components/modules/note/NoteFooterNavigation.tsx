'use client'

import { useTranslations } from 'next-intl'

import { MdiClockTimeThreeOutline } from '~/components/icons/clock'
import { Link, useRouter } from '~/i18n/navigation'
import { routeBuilder, Routes } from '~/lib/route-builder'
import { springScrollToTop } from '~/lib/scroller'
import { useCurrentNoteDataSelector } from '~/providers/note/CurrentNoteDataProvider'

export const NoteFooterNavigation = () => {
  const t = useTranslations('note')
  const tCommon = useTranslations('common')
  const data = useCurrentNoteDataSelector((data) =>
    !data
      ? null
      : {
          next:
            data.next && data.next.nid
              ? {
                  nid: data.next.nid,
                  slug: data.next.slug,
                  createdAt: data.next.createdAt,
                }
              : null,
          prev:
            data.prev && data.prev.nid
              ? {
                  nid: data.prev.nid,
                  slug: data.prev.slug,
                  createdAt: data.prev.createdAt,
                }
              : null,
          currentObjectId: data.data.id,
        },
  )

  const router = useRouter()

  if (!data) return null

  const { next, prev, currentObjectId } = data

  return (
    <>
      {/* // 没有 0 的情况 */}
      {(!!prev || !!next) && (
        <>
          <section data-hide-print className="relative mt-4 py-2 text-center">
            <div className="flex items-center justify-between [&>*]:inline-flex [&>*]:items-center [&>*]:space-x-2 [&>*]:p-2">
              {!!next && (
                <Link
                  className="hover:text-accent"
                  href={routeBuilder(Routes.Note, {
                    id: next.nid.toString(),
                    slug: next.slug,
                    createdAt: next.createdAt,
                  })}
                >
                  <i className="i-mingcute-arrow-left-line" />
                  <span>{t('previous_note')}</span>
                </Link>
              )}

              {!!prev && (
                <Link
                  className="hover:text-accent"
                  href={routeBuilder(Routes.Note, {
                    id: prev.nid.toString(),
                    slug: prev.slug,
                    createdAt: prev.createdAt,
                  })}
                >
                  <span>{t('next_note')}</span>
                  <i className="i-mingcute-arrow-right-line" />
                </Link>
              )}
            </div>
            <div
              className="absolute inset-y-0 left-1/2 flex -translate-x-1/2 items-center space-x-2 text-accent opacity-80 hover:text-accent"
              role="button"
              tabIndex={1}
              onClick={() => {
                springScrollToTop()
                router.push(
                  routeBuilder(Routes.Timelime, {
                    type: 'note',
                    selectId: currentObjectId,
                  }),
                )
              }}
            >
              <span>{tCommon('page_title_timeline')}</span>
              <MdiClockTimeThreeOutline />
            </div>
          </section>
        </>
      )}
    </>
  )
}
