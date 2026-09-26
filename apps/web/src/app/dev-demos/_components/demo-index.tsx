'use client'

import Link from 'next/link'
import type { KeyboardEvent } from 'react'
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'

import { SlotText } from '~/components/ui/slot-text'

import type { DevDemo } from '../_demos'
import { devDemoGroups, devDemos } from '../_demos'

const matches = (demo: DevDemo, query: string) => {
  const haystack = [demo.name, demo.meta, demo.href, ...demo.tags]
    .join(' ')
    .toLowerCase()
  return query
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term))
}

const IndexRow = ({ demo, ordinal }: { demo: DevDemo; ordinal: number }) => (
  <li>
    <Link
      className="group flex items-baseline gap-x-8 border-b border-neutral-3 py-7 transition-colors duration-150 hover:border-accent/30"
      href={demo.href}
    >
      <span className="w-9 shrink-0 font-mono text-label-12 tabular-nums text-neutral-5 transition-colors duration-150 group-hover:text-accent">
        {String(ordinal).padStart(2, '0')}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <span className="text-copy-15 text-neutral-9 transition-colors duration-150 group-hover:text-accent">
            {demo.name}
          </span>
          <span className="font-mono text-caption-10 uppercase tracking-[0.2em] text-neutral-5">
            {demo.href}
          </span>
        </span>
        <span className="mt-2.5 block text-copy-13 text-neutral-7">
          {demo.meta}
        </span>
      </span>
    </Link>
  </li>
)

export const DemoIndex = () => {
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) {
        return
      }
      if (document.activeElement instanceof HTMLInputElement) return
      event.preventDefault()
      inputRef.current?.focus()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Escape') return
    if (query) {
      setQuery('')
    } else {
      inputRef.current?.blur()
    }
  }

  const visible = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase()
    if (!normalized) return devDemos
    return devDemos.filter((demo) => matches(demo, normalized))
  }, [deferredQuery])

  const grouped = useMemo(() => {
    let ordinal = 0
    return devDemoGroups
      .map((group) => ({
        ...group,
        items: visible
          .filter((demo) => demo.group === group.id)
          .map((demo) => ({ demo, ordinal: ++ordinal })),
      }))
      .filter((group) => group.items.length > 0)
  }, [visible])

  return (
    <>
      <div className="flex items-center gap-x-4 border-b border-neutral-3 pb-3">
        <i
          aria-hidden
          className="i-mingcute-search-line shrink-0 text-icon-md text-neutral-5"
        />
        <input
          aria-label="筛选 demo"
          className="h-7 min-w-0 flex-1 appearance-none bg-transparent text-copy-14 leading-7 text-neutral-9 outline-none placeholder:text-neutral-5"
          placeholder="筛选 · 名称 / 路径 / 标签"
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onInputKeyDown}
        />
        {query ? null : (
          <kbd className="shrink-0 rounded border border-neutral-3 px-1.5 font-mono text-caption-10 leading-5 text-neutral-6">
            /
          </kbd>
        )}
        <span className="shrink-0 font-mono text-label-12 tabular-nums text-neutral-6">
          <SlotText text={String(visible.length).padStart(2, '0')} />
          <span className="text-neutral-5">
            {` / ${String(devDemos.length).padStart(2, '0')}`}
          </span>
        </span>
      </div>

      {grouped.length === 0 ? (
        <p className="py-20 text-center text-copy-13 text-neutral-6">
          无匹配 · 试试 <code className="font-mono text-neutral-7">webgl</code>{' '}
          或 <code className="font-mono text-neutral-7">editor</code>
        </p>
      ) : (
        grouped.map((group) => (
          <section className="mt-14 first:mt-12" key={group.id}>
            <header className="mb-4 flex items-baseline gap-x-3">
              <h2 className="font-mono text-caption-10 uppercase tracking-[0.3em] text-neutral-6">
                {group.label}
              </h2>
              <span className="text-label-12 text-neutral-5">{group.hint}</span>
            </header>
            <ul>
              {group.items.map(({ demo, ordinal }) => (
                <IndexRow demo={demo} key={demo.href} ordinal={ordinal} />
              ))}
            </ul>
          </section>
        ))
      )}
    </>
  )
}
