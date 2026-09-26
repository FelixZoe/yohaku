'use client'

import type { SayModel } from '@mx-space/api-client'
import type { MarkdownToJSX } from 'markdown-to-jsx'
import Markdown from 'markdown-to-jsx'
import { m } from 'motion/react'
import { useTranslations } from 'next-intl'
import { memo, useMemo } from 'react'
import Masonry from 'react-responsive-masonry'

import { useIsOwnerLogged } from '~/atoms/hooks/owner'
import { useIsMobile } from '~/atoms/hooks/viewport'
import { LoadMoreIndicator } from '~/components/modules/shared/LoadMoreIndicator'
import { RelativeTime } from '~/components/ui/relative-time'
import { staggeredEntrance } from '~/constants/spring'
import { useIsDark } from '~/hooks/common/use-is-dark'
import { addAlphaToHSL, getColorScheme, stringToHue } from '~/lib/color'
import { clsxm } from '~/lib/helper'

import { useSayListQuery, useSayModal } from './hooks'

export const SayMasonry = () => {
  const { fetchNextPage, hasNextPage, data } = useSayListQuery()

  const isMobile = useIsMobile()

  if (!data) return null

  const list = data.pages
    .flatMap((page) => page.data)
    .map((say) => ({
      text: say.text,
      item: say,
      id: say.id,
    }))

  return (
    <>
      <Masonry columnsCount={isMobile ? 1 : 2} gutter="1rem">
        {list.map((item, index) => (
          <Item index={index} item={item.item} key={item.id} />
        ))}
      </Masonry>
      {hasNextPage && (
        <LoadMoreIndicator className="mt-4" onLoading={fetchNextPage} />
      )}
    </>
  )
}

const SkeletonBar: Component<{ lineHeight: number; barHeight: number }> = ({
  lineHeight,
  barHeight,
  className,
}) => (
  <span className="flex items-center" style={{ height: lineHeight }}>
    <span
      className={clsxm('block rounded-[3px] bg-neutral-4/45', className)}
      style={{ height: barHeight }}
    />
  </span>
)

const SaySkeleton = memo<{ lines?: number }>(({ lines = 1 }) => (
  <div className="relative w-full overflow-hidden rounded-xl bg-paper px-5 py-[18px] pt-[14px] shadow-[0_1px_4px_rgba(0,0,0,0.05)]">
    <span className="pointer-events-none absolute left-3 top-1.5 select-none font-serif text-display-48 leading-none text-neutral-4/20">
      {'\u201C'}
    </span>
    <div className="mb-2 pl-1 pt-4">
      {Array.from({ length: lines }).map((_, index) => (
        <SkeletonBar
          barHeight={13}
          className={index === lines - 1 ? 'w-1/2' : 'w-full'}
          key={index}
          lineHeight={21}
        />
      ))}
    </div>
    <div className="flex justify-between pl-1">
      <SkeletonBar barHeight={12} className="w-[7.5rem]" lineHeight={20} />
      <SkeletonBar barHeight={12} className="w-[5.5rem]" lineHeight={20} />
    </div>
  </div>
))
SaySkeleton.displayName = 'SaySkeleton'

const skeletonLines = [3, 1, 2, 4, 1, 2, 3, 1]

export const SayListSkeleton = () => {
  const isMobile = useIsMobile()

  return (
    <div data-hide-print className="animate-pulse motion-reduce:animate-none">
      <div className="mb-[80px] flex items-center gap-3">
        <SkeletonBar barHeight={26} className="w-[72px]" lineHeight={44} />
        <span className="size-8 rounded-full bg-neutral-4/35" />
      </div>
      <div className="mt-10">
        <Masonry columnsCount={isMobile ? 1 : 2} gutter="1rem">
          {skeletonLines.map((lines, index) => (
            <SaySkeleton key={index} lines={lines} />
          ))}
        </Masonry>
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  )
}

const options = {
  disableParsingRawHTML: true,
  forceBlock: true,
} satisfies MarkdownToJSX.Options

const Item = memo<{
  item: SayModel
  index: number
}>(({ item: say, index: i }) => {
  const t = useTranslations('says')

  const hasSource = !!say.source
  const hasAuthor = !!say.author
  const { dark: darkColors, light: lightColors } = useMemo(
    () => getColorScheme(stringToHue(say.id)),
    [say.id],
  )
  const isDark = useIsDark()

  const isLogged = useIsOwnerLogged()
  const present = useSayModal()

  const accentColor = isDark ? darkColors.accent : lightColors.accent

  return (
    <m.blockquote
      layout
      animate={staggeredEntrance.animate}
      className="group relative w-full overflow-hidden rounded-xl bg-paper px-5 py-[18px] pt-[14px] shadow-[0_1px_4px_rgba(0,0,0,0.05)]"
      initial={staggeredEntrance.initial}
      key={say.id}
      transition={staggeredEntrance.transition(i)}
      style={{
        backgroundImage: `linear-gradient(150deg, ${addAlphaToHSL(
          accentColor,
          isDark ? 0.08 : 0.045,
        )} 0%, transparent 55%)`,
      }}
    >
      <span
        className="pointer-events-none absolute left-3 top-1.5 z-0 select-none font-serif text-display-48 leading-none"
        style={{
          color: addAlphaToHSL(accentColor, isDark ? 0.15 : 0.12),
        }}
      >
        {'\u201C'}
      </span>
      <Markdown
        className="relative z-[1] mb-2 pl-1 pt-4"
        options={options}
      >{`${say.text}`}</Markdown>
      <div className="relative z-[1] flex flex-wrap pl-1 text-copy-13 text-neutral-9/60 md:justify-between">
        <div className="mb-2 w-full md:mb-0 md:w-auto">
          <RelativeTime date={say.createdAt} />
        </div>
        <div className="w-full text-right md:ml-auto md:w-auto">
          <div>
            {hasSource && `\u51FA\u81EA\u201C${say.source}\u201D`}
            {hasSource && hasAuthor && ', '}
            {hasAuthor && t('author_label', { author: say.author! })}
            {!hasAuthor && !hasSource && t('owner_says')}
          </div>
        </div>
      </div>
      {isLogged && (
        <button
          className={clsxm(
            'absolute right-2 top-2 bg-paper',
            'center flex size-6 rounded-full text-accent opacity-0 ring-1 ring-black/5 dark:ring-white/8 duration-200 group-hover:opacity-100',
          )}
          onClick={() => present(say)}
        >
          <i className="i-mingcute-quill-pen-line" />
          <span className="sr-only">edit</span>
        </button>
      )}
    </m.blockquote>
  )
})
Item.displayName = 'Item'
