'use client'

import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { useSearchParams } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import type { KeyboardEventHandler } from 'react'
import {
  memo,
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import { MotionButtonBase } from '~/components/ui/button'
import { LoadingMark } from '~/components/ui/loading/LoadingMark'
import { useDebounceValue } from '~/hooks/common/use-debounce-value'
import { Link, useRouter } from '~/i18n/navigation'
import { noopArr } from '~/lib/noop'
import { buildNotePath } from '~/lib/note-route'
import { apiClient } from '~/lib/request'

type SearchListType = {
  title: string
  subtitle?: string
  url: string
  id: string
  isFallback?: boolean
  highlight?: {
    keywords: string[]
    snippet: string | null
  }
}

export function SearchPageClient() {
  const t = useTranslations('common')
  const locale = useLocale()
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q') || ''

  const [keyword, setKeyword] = useState(initialQuery)
  const [currentSelect, setCurrentSelect] = useState(0)
  const listRef = useRef<HTMLUListElement>(null)
  const debouncedKeyword = useDebounceValue(keyword, 360)

  useEffect(() => {
    const url = debouncedKeyword
      ? `?q=${encodeURIComponent(debouncedKeyword)}`
      : window.location.pathname
    window.history.replaceState(null, '', url)
  }, [debouncedKeyword])

  const { data: _data, isLoading } = useQuery({
    queryKey: ['search', debouncedKeyword, locale],
    queryFn: () => apiClient.search.searchAll(debouncedKeyword),
    enabled: !!debouncedKeyword,
    select: useCallback(
      (data: any) => {
        if (!data?.data) return

        const list: SearchListType[] = data.data.map((item: any) => {
          switch (item.type) {
            case 'post': {
              return {
                title: item.title,
                subtitle: item.category.name,
                id: item.id,
                url: `/posts/${item.category.slug}/${item.slug}`,
                highlight: item.highlight,
                isFallback: item.isFallback,
              }
            }
            case 'note': {
              return {
                title: item.title,
                subtitle: t('search_note'),
                id: item.id,
                url: buildNotePath(item),
                highlight: item.highlight,
                isFallback: item.isFallback,
              }
            }
            case 'page': {
              return {
                title: item.title,
                subtitle: t('search_page'),
                id: item.id,
                url: `/${item.slug}`,
                highlight: item.highlight,
                isFallback: item.isFallback,
              }
            }
          }
        })
        setCurrentSelect(0)
        return list
      },
      [t],
    ),
  })

  const data = _data || noopArr

  const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      if (!listRef.current) return

      switch (e.key) {
        case 'Enter': {
          const li = listRef.current.children.item(
            currentSelect,
          ) as HTMLLIElement | null
          const link = li?.children.item(0) as HTMLAnchorElement | null
          link?.click()
          break
        }
        case 'ArrowDown': {
          e.preventDefault()
          setCurrentSelect((prev) =>
            data.length ? (prev + 1) % data.length : 0,
          )
          break
        }
        case 'ArrowUp': {
          e.preventDefault()
          setCurrentSelect((prev) =>
            prev - 1 < 0 ? data.length - 1 : prev - 1,
          )
          break
        }
      }
    },
    [currentSelect, data.length],
  )

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Sticky header */}
      <div className="sticky top-0 z-100 border-b border-neutral-3/60 bg-paper/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[680px] items-center gap-3 px-4 py-3">
          <MotionButtonBase
            aria-label="Back"
            className="flex shrink-0 items-center justify-center rounded-lg p-1.5 text-neutral-7 transition-colors hover:bg-neutral-3/60"
            onClick={() => router.back()}
          >
            <i className="i-mingcute-arrow-left-line text-copy-16" />
          </MotionButtonBase>
          <input
            autoFocus
            className="min-w-0 flex-1 bg-transparent text-copy-15 leading-normal text-neutral-9 outline-none placeholder:text-neutral-5"
            placeholder={t('search_placeholder')}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {keyword && (
            <MotionButtonBase
              aria-label="Clear"
              className="flex shrink-0 items-center justify-center rounded-lg p-1.5 text-neutral-5 transition-colors hover:text-neutral-7"
              onClick={() => setKeyword('')}
            >
              <i className="i-mingcute-close-line text-copy-14" />
            </MotionButtonBase>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="mx-auto w-full max-w-[680px] flex-1 px-2 py-2">
        <ul ref={listRef}>
          {data.length === 0 && !isLoading ? (
            <div className="flex items-center justify-center py-20">
              <span className="font-serif text-copy-13 italic text-neutral-5">
                {!keyword ? t('search_placeholder') : t('search_empty')}
              </span>
            </div>
          ) : (
            data.map((item, index) => (
              <SearchItem
                key={item.id}
                {...item}
                isSelect={currentSelect === index}
                onHover={() => startTransition(() => setCurrentSelect(index))}
              />
            ))
          )}

          {data.length === 0 && isLoading && (
            <div className="flex justify-center py-20">
              <LoadingMark size="md" />
            </div>
          )}
        </ul>
      </div>
    </div>
  )
}

const SearchItem = memo(
  ({
    isSelect,
    onHover,
    ...item
  }: {
    isSelect: boolean
    onHover: () => void
  } & SearchListType) => {
    const t = useTranslations('common')
    return (
      <li
        className={clsx(
          'relative flex w-full px-1',
          'before:content-auto before:absolute before:inset-0 before:rounded-lg',
          'before:z-0 before:transition-colors before:duration-150',
          'hover:before:bg-neutral-3/60',
          isSelect && 'before:bg-neutral-3/60',
        )}
        onMouseEnter={onHover}
      >
        <Link
          className="relative z-10 flex w-full items-start justify-between gap-4 px-3 py-2.5"
          href={item.url}
        >
          <span className="block min-w-0 flex-1">
            <HighlightText
              className="block truncate text-copy-13 text-neutral-9"
              keywords={item.highlight?.keywords}
              text={item.title}
            />
            {item.highlight?.snippet && (
              <HighlightText
                className="mt-1 line-clamp-2 block text-label-12 leading-5 text-neutral-6"
                keywords={item.highlight.keywords}
                text={item.highlight.snippet}
              />
            )}
          </span>
          <span className="mt-0.5 flex shrink-0 flex-col items-end gap-0.5">
            <span className="block font-serif text-label-12 italic text-neutral-5">
              {item.subtitle}
            </span>
            {item.isFallback && (
              <span className="block text-label-12 italic text-neutral-5">
                {t('search_fallback_to_source')}
              </span>
            )}
          </span>
        </Link>
      </li>
    )
  },
)

const HighlightText = memo(
  ({
    text,
    keywords,
    className,
  }: {
    text: string
    keywords?: string[]
    className?: string
  }) => {
    const segments = getHighlightSegments(text, keywords)
    return (
      <span className={className}>
        {segments.map((segment) =>
          segment.highlighted ? (
            <mark
              className="rounded-[3px] bg-accent px-[1px] text-white"
              key={segment.key}
            >
              {segment.text}
            </mark>
          ) : (
            <span key={segment.key}>{segment.text}</span>
          ),
        )}
      </span>
    )
  },
)

function getHighlightSegments(text: string, keywords?: string[]) {
  const normalizedKeywords = [...new Set(keywords?.filter(Boolean) ?? [])]
    .sort((a, b) => b.length - a.length)
    .slice(0, 8)

  if (!text || !normalizedKeywords.length) {
    return [{ key: 'plain-0', text, highlighted: false }]
  }

  const regex = new RegExp(
    `(${normalizedKeywords.map(escapeRegExp).join('|')})`,
    'gi',
  )
  const keywordSet = new Set(
    normalizedKeywords.map((keyword) => keyword.toLocaleLowerCase()),
  )

  let cursor = 0
  return text
    .split(regex)
    .filter(Boolean)
    .map((segment) => {
      const start = text.indexOf(segment, cursor)
      cursor = start + segment.length

      return {
        key: `${start}-${segment}`,
        text: segment,
        highlighted: keywordSet.has(segment.toLocaleLowerCase()),
      }
    })
}

function escapeRegExp(input: string) {
  return input.replaceAll(/[$()*+.?[\\\]^{|}]/g, '\\$&')
}
