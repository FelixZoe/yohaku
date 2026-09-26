'use client'

import { clsx } from 'clsx'
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  MapPin,
  Phone,
  Tag,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'

import type { MapPoi } from './types'

interface MapDetailPanelProps {
  activeIndex: number
  onActiveChange: (index: number) => void
  pois: MapPoi[]
}

export function MapDetailPanel({
  activeIndex,
  onActiveChange,
  pois,
}: MapDetailPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const total = pois.length
  const safeIndex = Math.min(Math.max(activeIndex, 0), Math.max(total - 1, 0))
  const poi = pois[safeIndex]

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onKey = (event: KeyboardEvent) => {
      if (total <= 1) return
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        onActiveChange((safeIndex - 1 + total) % total)
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        onActiveChange((safeIndex + 1) % total)
      }
    }
    el.addEventListener('keydown', onKey)
    return () => el.removeEventListener('keydown', onKey)
  }, [safeIndex, total, onActiveChange])

  if (!poi) return null

  const merchant = poi.merchant
  const titleText =
    poi.title?.trim() ||
    merchant?.address?.split(',')[0]?.trim() ||
    `${poi.lat.toFixed(4)}, ${poi.lon.toFixed(4)}`

  return (
    <div
      className="flex h-full min-h-0 flex-col gap-3 p-5 outline-none"
      ref={containerRef}
      tabIndex={-1}
    >
      {total > 1 ? (
        <div className="flex items-center justify-between border-b border-border pb-2 font-mono text-[10px] tracking-[0.08em] text-neutral-6 uppercase">
          <span>
            {safeIndex + 1} / {total}
          </span>
          <div className="flex gap-1">
            <PagerButton
              ariaLabel="Previous place"
              onClick={() => onActiveChange((safeIndex - 1 + total) % total)}
            >
              <ChevronLeft aria-hidden className="size-3.5" />
            </PagerButton>
            <PagerButton
              ariaLabel="Next place"
              onClick={() => onActiveChange((safeIndex + 1) % total)}
            >
              <ChevronRight aria-hidden className="size-3.5" />
            </PagerButton>
          </div>
        </div>
      ) : null}

      <div>
        <h3 className="text-[16px] leading-tight font-semibold text-neutral-10">
          {titleText}
        </h3>
        {merchant && (merchant.category || merchant.priceRange) ? (
          <div className="mt-1 flex gap-1.5 text-[10px] uppercase tracking-[0.04em] text-neutral-7">
            {merchant.category ? <Chip>{merchant.category}</Chip> : null}
            {merchant.priceRange ? <Chip>{merchant.priceRange}</Chip> : null}
          </div>
        ) : null}
      </div>

      <dl className="grid grid-cols-[16px_minmax(0,1fr)] gap-x-2.5 gap-y-2 text-[13px] leading-snug">
        <Row glyph={<MapPin aria-hidden className="size-3.5" />}>
          {merchant?.address ?? null}
        </Row>
        <Row glyph={<Phone aria-hidden className="size-3.5" />}>
          {merchant?.phone ? (
            <a className="text-accent" href={`tel:${merchant.phone}`}>
              {merchant.phone}
            </a>
          ) : null}
        </Row>
        <Row glyph={<ExternalLink aria-hidden className="size-3.5" />}>
          {merchant?.website ? (
            <a
              className="text-accent"
              href={normalizeUrl(merchant.website)}
              rel="noopener noreferrer"
              target="_blank"
            >
              {displayUrl(merchant.website)}
            </a>
          ) : null}
        </Row>
        <Row glyph={<Clock aria-hidden className="size-3.5" />}>
          {merchant?.openingHours ?? null}
        </Row>
        <Row glyph={<Tag aria-hidden className="size-3.5" />}>
          {merchant?.tags && merchant.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {merchant.tags.map((t) => (
                <span
                  className="rounded-sm border border-border bg-neutral-2 px-1.5 py-0.5 text-[10px] text-neutral-7"
                  key={t}
                >
                  {t}
                </span>
              ))}
            </div>
          ) : null}
        </Row>
      </dl>

      {merchant?.socialHandles &&
      (merchant.socialHandles.instagram || merchant.socialHandles.twitter) ? (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {merchant.socialHandles.instagram ? (
            <SocialBadge
              handle={merchant.socialHandles.instagram}
              prefix="IG"
            />
          ) : null}
          {merchant.socialHandles.twitter ? (
            <SocialBadge handle={merchant.socialHandles.twitter} prefix="X" />
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function Row({ children, glyph }: { children: ReactNode; glyph: ReactNode }) {
  if (!children) return null
  return (
    <>
      <span className="pt-0.5 text-center text-neutral-6">{glyph}</span>
      <span className="min-w-0 text-neutral-10 break-words">{children}</span>
    </>
  )
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-border bg-neutral-2 px-2 py-0.5">
      {children}
    </span>
  )
}

function SocialBadge({ handle, prefix }: { handle: string; prefix: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-sm border border-border bg-neutral-1 px-2 py-0.5',
        'font-mono text-[10px] text-neutral-10 lowercase',
      )}
    >
      {prefix} {handle.startsWith('@') ? handle : `@${handle}`}
    </span>
  )
}

function PagerButton({
  ariaLabel,
  children,
  onClick,
}: {
  ariaLabel: string
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button
      aria-label={ariaLabel}
      type="button"
      className={clsx(
        'inline-flex size-6 items-center justify-center rounded-md border border-border bg-neutral-1',
        'text-neutral-7 hover:border-neutral-7 hover:text-neutral-10',
      )}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function normalizeUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url
  return `https://${url}`
}

function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//i, '').replace(/\/$/, '')
}
