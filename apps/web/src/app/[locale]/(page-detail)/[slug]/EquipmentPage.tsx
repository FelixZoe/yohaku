'use client'

import { load } from 'js-yaml'
import { m } from 'motion/react'
import { useTranslations } from 'next-intl'
import { memo, useMemo, useState } from 'react'

import { LazyLoad } from '~/components/common/Lazyload'
import { CommentModal } from '~/components/modules/shared/CommentModal'
import { ImageLoadStatus } from '~/components/ui/image/ZoomedImage'
import { useModalStack } from '~/components/ui/modal'
import { MAIN_CONTENT_ID } from '~/constants/dom-id'
import { clsxm } from '~/lib/helper'
import { useCurrentPageDataSelector } from '~/providers/page/CurrentPageDataProvider'

const ImagePlaceholder = () => (
  <div className="mb-4 flex h-64 animate-pulse items-center justify-center overflow-hidden rounded-lg bg-neutral-2 p-4" />
)

interface Equipment {
  custom?: string
  deprecated?: boolean
  details?: string
  image?: string
  name: string
  opinion?: string
  posts?: string
}

interface EquipmentClass {
  desc?: string
  list: Equipment[]
  title: string
}

export const EquipmentPage = memo(() => {
  const t = useTranslations('common')
  const tPost = useTranslations('post')
  const text = useCurrentPageDataSelector((data) => data?.text)
  const modified = useCurrentPageDataSelector((data) => data?.modifiedAt)

  const equipmentData = useMemo(() => {
    if (!text) return null
    try {
      return load(text) as EquipmentClass[]
    } catch {
      return null
    }
  }, [text])

  if (!equipmentData || !Array.isArray(equipmentData)) {
    return null
  }

  return (
    <div className="space-y-12" id={MAIN_CONTENT_ID}>
      {equipmentData.map((category, categoryIndex) => (
        <section key={category.title}>
          <m.div
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
            initial={{ opacity: 0, y: 20 }}
            transition={{ delay: categoryIndex * 0.1 }}
          >
            <h2
              className="group flex items-center text-title-24 font-bold text-neutral-9"
              data-markdown-heading="true"
              id={`${categoryIndex}__${category.title}`}
            >
              {category.title}
            </h2>
            {category.desc && (
              <p className="mt-2 text-neutral-7">{category.desc}</p>
            )}
          </m.div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {category.list.map((item, itemIndex) => (
              <EquipmentCard
                categoryIndex={categoryIndex}
                index={itemIndex}
                item={item}
                key={item.name}
              />
            ))}
          </div>
        </section>
      ))}

      {modified && (
        <p className="text-right text-copy-13 text-neutral-6">
          {t('last_updated')} {new Date(modified).toLocaleDateString()}
        </p>
      )}
    </div>
  )
})

EquipmentPage.displayName = 'EquipmentPage'

const EquipmentCard = memo(
  ({
    item,
    index,
    categoryIndex,
  }: {
    item: Equipment
    index: number
    categoryIndex: number
  }) => {
    const t = useTranslations('common')
    const tPost = useTranslations('post')
    const link = item.details || item.posts
    const { present } = useModalStack()
    const { id: pageId, title: pageTitle } =
      useCurrentPageDataSelector((data) => ({
        id: data?.id,
        title: data?.title,
      })) || {}

    const handleComment = () => {
      present({
        title: t('comment'),
        content: (rest) => (
          <CommentModal
            initialValue={`> ${item.name}\n\n`}
            refId={pageId!}
            title={pageTitle!}
            {...rest}
          />
        ),
      })
    }

    return (
      <m.div
        animate={{ opacity: 1, y: 0 }}
        className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-neutral-3 bg-neutral-1 p-4 shadow-xs transition-all duration-300 hover:shadow-lg"
        initial={{ opacity: 0, y: 20 }}
        transition={{ delay: categoryIndex * 0.1 + index * 0.05 }}
      >
        {item.image && (
          <EquipmentImage
            alt={item.name}
            deprecated={item.deprecated}
            src={item.image}
          />
        )}

        <div className="flex-1 space-y-2">
          <h3
            className={clsxm(
              'font-semibold text-neutral-9',
              item.deprecated && 'line-through',
            )}
          >
            {item.name}
          </h3>

          {item.custom && (
            <p
              className={clsxm(
                'text-copy-13 text-neutral-7',
                item.deprecated && 'line-through',
              )}
            >
              {item.custom}
            </p>
          )}

          {item.opinion && (
            <p
              className={clsxm(
                'line-clamp-3 text-copy-13 leading-relaxed text-neutral-8',
                item.deprecated && 'line-through',
              )}
            >
              {item.opinion}
            </p>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2">
          {link && (
            <a
              className="inline-flex w-fit items-center rounded-lg bg-accent/10 px-3 py-1.5 text-copy-13 text-neutral-7 no-underline transition-all duration-300 hover:text-accent sm:bg-transparent sm:text-transparent sm:hover:bg-accent/10 sm:hover:text-accent"
              href={link}
              rel="noopener noreferrer"
              target="_blank"
            >
              {link.includes('/posts/')
                ? tPost('view_article')
                : tPost('details')}
            </a>
          )}
          <button
            className="ml-auto inline-flex items-center rounded-lg bg-accent/10 p-2 text-neutral-7 transition-all duration-300 hover:text-accent sm:bg-transparent sm:text-transparent sm:hover:bg-accent/10 sm:hover:text-accent"
            title={t('comment')}
            onClick={handleComment}
          >
            <i className="i-mingcute-chat-3-line text-copy-16" />
          </button>
        </div>
      </m.div>
    )
  },
)

EquipmentCard.displayName = 'EquipmentCard'

const EquipmentImage = memo(
  ({
    src,
    alt,
    deprecated,
  }: {
    src: string
    alt: string
    deprecated?: boolean
  }) => {
    const t = useTranslations('common')
    const [status, setStatus] = useState(ImageLoadStatus.Loading)

    const handleLoad = () => setStatus(ImageLoadStatus.Loaded)
    const handleError = () => setStatus(ImageLoadStatus.Error)

    return (
      <LazyLoad triggerOnce offset={100} placeholder={<ImagePlaceholder />}>
        <div className="group/image relative mb-4 flex h-64 items-center justify-center overflow-hidden rounded-lg bg-neutral-2 p-4">
          {status === ImageLoadStatus.Loading && (
            <div className="absolute inset-0 animate-pulse bg-neutral-2" />
          )}
          {status === ImageLoadStatus.Error && (
            <div className="flex flex-col items-center gap-2 text-neutral-6">
              <i className="i-mingcute-image-line text-title-28" />
              <span className="text-copy-13">{t('loading_failed')}</span>
            </div>
          )}
          <img
            alt={alt}
            src={src}
            className={clsxm(
              'size-auto max-h-64 max-w-full transition-all duration-300',
              status === ImageLoadStatus.Loaded
                ? 'opacity-100 group-hover/image:scale-105'
                : 'opacity-0 absolute',
            )}
            onError={handleError}
            onLoad={handleLoad}
          />
          {deprecated && <div className="absolute inset-0 bg-neutral-7/40" />}
        </div>
      </LazyLoad>
    )
  },
)

EquipmentImage.displayName = 'EquipmentImage'
