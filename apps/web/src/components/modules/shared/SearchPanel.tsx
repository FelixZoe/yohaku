'use client'

import { Dialog } from '@base-ui/react/dialog'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { atom, useAtomValue, useSetAtom } from 'jotai'
import { AnimatePresence, m } from 'motion/react'
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

import { LoadingMark } from '~/components/ui/loading/LoadingMark'
import { useDebounceValue } from '~/hooks/common/use-debounce-value'
import { Link } from '~/i18n/navigation'
import { buildNotePath } from '~/lib/note-route'
import { apiClient } from '~/lib/request'
import { jotaiStore } from '~/lib/store'

// ─── Atoms ───────────────────────────────────────────────────────────────────

const searchPanelOpenAtom = atom(false)
const searchPanelInitialKeywordAtom = atom('')
const isComposingAtom = atom(false)
const currentSelectAtom = atom(0)

// ─── Public API ──────────────────────────────────────────────────────────────

export const openSearchPanel = () => {
  jotaiStore.set(searchPanelOpenAtom, true)
}

export const SearchPanelWithHotKey = () => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        openSearchPanel()
      }

      if (
        e.key === 'Escape' &&
        jotaiStore.get(searchPanelOpenAtom) &&
        !jotaiStore.get(isComposingAtom)
      ) {
        e.preventDefault()
        jotaiStore.set(searchPanelOpenAtom, false)
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  return <SearchPanel />
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface SearchListItem {
  highlight?: {
    keywords: string[]
    snippet: string | null
  }
  id: string
  isFallback?: boolean
  subtitle?: string
  title: string
  url: string
}

// ─── Animation ───────────────────────────────────────────────────────────────

const EASE_OUT_EXPO: [number, number, number, number] = [0.22, 1, 0.36, 1]

// ─── Search Panel ────────────────────────────────────────────────────────────

const SearchPanel = () => {
  const t = useTranslations('common')
  const panelOpen = useAtomValue(searchPanelOpenAtom)

  return (
    <Dialog.Root open modal="trap-focus">
      <Dialog.Portal keepMounted>
        <AnimatePresence>
          {panelOpen && (
            <Dialog.Popup>
              <Dialog.Title className="hidden">
                {t('search_title')}
              </Dialog.Title>
              <div className="fixed inset-0 z-20 flex items-start justify-center pt-[4.5rem] md:pt-[6rem]">
                <m.div
                  animate={{ opacity: 1 }}
                  className="fixed inset-0 z-[-1] bg-black/6 dark:bg-black/25"
                  exit={{ opacity: 0 }}
                  initial={{ opacity: 0 }}
                  tabIndex={-1}
                  transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
                  onClick={() => jotaiStore.set(searchPanelOpenAtom, false)}
                />
                <SearchPanelImpl />
              </div>
            </Dialog.Popup>
          )}
        </AnimatePresence>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

const EMPTY_LIST: SearchListItem[] = []

const SearchPanelImpl = () => {
  const t = useTranslations('common')
  const locale = useLocale()
  const initialKeyword = useAtomValue(searchPanelInitialKeywordAtom)
  const [keyword, setKeyword] = useState(initialKeyword)
  const listRef = useRef<HTMLUListElement>(null)
  const setCurrentSelect = useSetAtom(currentSelectAtom)

  const debouncedKeyword = useDebounceValue(keyword, 360)

  useEffect(() => {
    if (initialKeyword) {
      setKeyword(initialKeyword)
      jotaiStore.set(searchPanelInitialKeywordAtom, '')
    }
  }, [initialKeyword])

  const { data, isLoading } = useQuery({
    queryKey: ['search', debouncedKeyword, locale],
    queryFn: ({ queryKey: [, kw] }) => {
      if (!kw) return
      return apiClient.search.searchAll(kw)
    },
    select: useCallback(
      (res: any): SearchListItem[] | undefined => {
        const items = res?.data
        if (!items) return

        const list: SearchListItem[] = items
          .map((item: any): SearchListItem | undefined => {
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
              default: {
                return undefined
              }
            }
          })
          .filter(Boolean) as SearchListItem[]

        setCurrentSelect(0)
        return list
      },
      [setCurrentSelect, t],
    ),
  })

  const list = data ?? EMPTY_LIST

  const handleKeyDown: KeyboardEventHandler<HTMLDivElement> = useCallback(
    (e) => {
      if (!listRef.current) return
      const $ = listRef.current
      const current = jotaiStore.get(currentSelectAtom)

      switch (e.key) {
        case 'Enter': {
          const link = (
            $.children.item(current) as HTMLLIElement | null
          )?.querySelector('a')
          link?.click()
          break
        }
        case 'ArrowDown': {
          setCurrentSelect((i) => (i + 1) % list.length)
          break
        }
        case 'ArrowUp': {
          setCurrentSelect((i) => (i - 1 + list.length) % list.length)
          break
        }
        default: {
          return
        }
      }

      $.children.item(jotaiStore.get(currentSelectAtom))?.scrollIntoView({
        behavior: 'smooth',
      })
    },
    [list.length, setCurrentSelect],
  )

  return (
    <m.div
      initial={{ y: -12, opacity: 0, scaleY: 0.97 }}
      role="dialog"
      style={{ transformOrigin: 'top center' }}
      animate={{
        y: 0,
        opacity: 1,
        scaleY: 1,
        transition: { duration: 0.24, ease: EASE_OUT_EXPO },
      }}
      className={clsx(
        'w-full max-w-screen md:w-[680px] md:max-w-[84vw]',
        'flex h-[80vh] min-h-[50px] flex-col md:h-[min(520px,60vh)]',
        'bg-paper',
        'shadow-[0_2px_12px_rgba(0,0,0,0.04),0_0_0_0.5px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3),0_0_0_0.5px_rgba(255,255,255,0.04)]',
        'rounded-none border-0 md:rounded-xl md:border md:border-black/5 md:dark:border-white/8',
      )}
      exit={{
        y: -18,
        opacity: 0,
        scaleY: 0.96,
        transition: { duration: 0.18, ease: EASE_OUT_EXPO },
      }}
      onKeyDown={handleKeyDown}
    >
      {/* Input */}
      <div className="shrink-0 px-5 pt-4 pb-3">
        <input
          autoFocus
          className="w-full bg-transparent text-copy-15 leading-normal text-neutral-9 outline-none placeholder:text-neutral-5"
          placeholder={t('search_placeholder')}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onCompositionEnd={() => jotaiStore.set(isComposingAtom, false)}
          onCompositionStart={() => jotaiStore.set(isComposingAtom, true)}
          onKeyDown={(e) => {
            if (
              e.key === 'ArrowDown' ||
              e.key === 'ArrowUp' ||
              e.key === 'Enter'
            ) {
              e.preventDefault()
            }
          }}
        />
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-neutral-3 to-transparent" />

      {/* Results */}
      <div className="relative min-h-0 flex-1 overflow-auto">
        <ul className="h-full px-2 py-2" ref={listRef}>
          {list.length === 0 && !isLoading ? (
            <div className="flex h-full items-center justify-center py-10">
              <span className="font-serif text-copy-13 italic text-neutral-5">
                {!keyword ? t('search_placeholder') : t('search_empty')}
              </span>
            </div>
          ) : (
            list.map((item, index) => (
              <SearchItem index={index} item={item} key={item.id} />
            ))
          )}

          {list.length === 0 && isLoading && (
            <div className="center flex h-full grow py-10">
              <LoadingMark size="md" />
            </div>
          )}
        </ul>
      </div>
    </m.div>
  )
}

// ─── Search Item ─────────────────────────────────────────────────────────────

const SearchItem = memo(
  ({ index, item }: { index: number; item: SearchListItem }) => {
    const t = useTranslations('common')
    const selectIndex = useAtomValue(currentSelectAtom)
    const isSelected = selectIndex === index

    return (
      <li
        className={clsx(
          'relative flex w-full px-1',
          'before:content-[""] before:absolute before:inset-0 before:rounded-lg',
          'before:z-0 before:transition-colors before:duration-150',
          'hover:before:bg-neutral-3/60',
          isSelected && 'before:bg-neutral-3/60',
        )}
        onMouseEnter={() => {
          startTransition(() => jotaiStore.set(currentSelectAtom, index))
        }}
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

SearchItem.displayName = 'SearchItem'

// ─── Highlight Text ──────────────────────────────────────────────────────────

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
        {segments.map((seg) =>
          seg.highlighted ? (
            <mark
              className="rounded-[3px] bg-accent px-[1px] text-white"
              key={seg.key}
            >
              {seg.text}
            </mark>
          ) : (
            <span key={seg.key}>{seg.text}</span>
          ),
        )}
      </span>
    )
  },
)

HighlightText.displayName = 'HighlightText'

// ─── Utilities ───────────────────────────────────────────────────────────────

interface HighlightSegment {
  highlighted: boolean
  key: string
  text: string
}

function getHighlightSegments(
  text: string,
  keywords?: string[],
): HighlightSegment[] {
  const normalized = [...new Set(keywords?.filter(Boolean) ?? [])]
    .sort((a, b) => b.length - a.length)
    .slice(0, 8)

  if (!text || !normalized.length) {
    return [{ key: 'plain-0', text, highlighted: false }]
  }

  const regex = new RegExp(`(${normalized.map(escapeRegExp).join('|')})`, 'gi')
  const keywordSet = new Set(normalized.map((kw) => kw.toLocaleLowerCase()))

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
