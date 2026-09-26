'use client'

import { useQuery } from '@tanstack/react-query'
import { useAtomValue } from 'jotai'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

import { liveDeskAtom } from '~/atoms/live-desk'
import { getServerTime } from '~/components/common/SyncServerTime'
import { SlotText } from '~/components/ui/slot-text'
import { usePageIsActive } from '~/hooks/common/use-is-active'
import {
  emptyActivityAssets,
  fetchActivityAssets,
  resolveActivityAppIconURL,
} from '~/lib/activity-assets'
import { clsxm } from '~/lib/helper'
import {
  buildMediaByline,
  createLiveDeskPresentation,
  type LiveDeskMediaPresentation,
  type LiveDeskPresentation,
  projectMediaPositionMs,
} from '~/lib/live-desk/presentation'
import { useAppConfigSelector } from '~/providers/root/aggregation-data-provider'

import {
  LiveDeskInkMeter,
  mediaFallbackIconClass,
  PaperSlipIcon,
} from './LiveDeskActivity'
import { useFlip, usePrefersReducedMotion } from './use-flip'

const hiddenPresentation: LiveDeskPresentation = { visible: false }

export const useMobileLiveDesk = () => {
  const enabled =
    useAppConfigSelector((config) => config.module.liveDesk.enable) === true
  const liveDeskState = useAtomValue(liveDeskAtom)
  const isPageActive = usePageIsActive()
  const { data } = useQuery({
    queryKey: ['app-icon', 'app-desc'],
    queryFn: fetchActivityAssets,
    staleTime: Number.POSITIVE_INFINITY,
    enabled,
  })
  const appIcons = data?.[0] ?? emptyActivityAssets.appIcon

  const presentation =
    enabled && isPageActive
      ? createLiveDeskPresentation(liveDeskState, getServerTime().getTime())
      : hiddenPresentation

  return { appIcons, presentation }
}

const resolvePrimaryIcon = (
  presentation: Extract<LiveDeskPresentation, { visible: true }>,
  appIcons: Record<string, string>,
) => {
  const { application, media } = presentation
  if (media) {
    return {
      fallbackIconClass: mediaFallbackIconClass[media.kind],
      url:
        media.artworkURL ??
        resolveActivityAppIconURL(
          media.playerDisplayName ?? '',
          null,
          appIcons,
        ),
    }
  }
  return {
    fallbackIconClass: 'i-mingcute-window-line',
    url: application
      ? resolveActivityAppIconURL(
          application.displayName,
          application.iconURL,
          appIcons,
        )
      : null,
  }
}

export const CapsuleLiveDot = ({ active }: { active: boolean }) => {
  const ref = useFlip<HTMLSpanElement>('capsule-live-dot')

  return (
    <span
      ref={ref}
      className={clsxm(
        'size-1.5 shrink-0 rounded-full',
        active ? 'animate-pulse bg-accent' : 'bg-neutral-5',
      )}
    />
  )
}

const CapsuleTicketIcon = ({
  appIcons,
  className,
  fallbackSizeClass,
  presentation,
}: {
  appIcons: Record<string, string>
  className: string
  fallbackSizeClass?: string
  presentation: Extract<LiveDeskPresentation, { visible: true }>
}) => {
  const ref = useFlip<HTMLSpanElement>('capsule-ld-icon')
  const icon = resolvePrimaryIcon(presentation, appIcons)

  return (
    <span
      ref={ref}
      className={clsxm(
        'grid shrink-0 place-items-center overflow-hidden border border-[color:var(--yohaku-paper-hairline)] bg-[var(--surface-paper)] text-neutral-7',
        className,
      )}
    >
      <PaperSlipIcon
        fallbackIconClass={icon.fallbackIconClass}
        fallbackSizeClass={fallbackSizeClass}
        key={icon.url || icon.fallbackIconClass}
        src={icon.url}
      />
    </span>
  )
}

export const CapsuleTicketRow = ({
  appIcons,
  presentation,
  showIcon,
}: {
  appIcons: Record<string, string>
  presentation: Extract<LiveDeskPresentation, { visible: true }>
  showIcon: boolean
}) => {
  const { application, media } = presentation
  const title = media
    ? media.title || media.artist || media.playerDisplayName || 'Media'
    : application?.displayName || ''

  return (
    <span className="flex min-w-0 items-center gap-2">
      <CapsuleLiveDot active />
      {showIcon ? (
        <CapsuleTicketIcon
          appIcons={appIcons}
          className="size-6 rounded-[5px] p-px"
          fallbackSizeClass="text-icon-sm"
          presentation={presentation}
        />
      ) : (
        <span className="size-6 shrink-0" />
      )}
      <span className="min-w-0 truncate font-serif text-label-12 italic text-neutral-7">
        <SlotText text={title} />
      </span>
    </span>
  )
}

export const CapsuleExpandedCard = ({
  appIcons,
  ownerName,
  presentation,
  showIcon,
}: {
  appIcons: Record<string, string>
  ownerName: string
  presentation: Extract<LiveDeskPresentation, { visible: true }>
  showIcon: boolean
}) => {
  const t = useTranslations('common')
  const { application, media } = presentation
  const title = media
    ? media.title || media.artist || media.playerDisplayName || 'Media'
    : application?.displayName || ''
  const byline = media ? buildMediaByline(media) : (application?.detail ?? null)
  const stateText = media
    ? t(
        media.playbackState === 'playing'
          ? 'activity_media_playing'
          : 'activity_media_paused',
      )
    : t('activity_verb_use')
  const bylineLine = media?.playerDisplayName
    ? `${media.playerDisplayName} · ${stateText}`
    : stateText

  return (
    <div className="px-4 pb-3 pt-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <span className="text-caption-10 uppercase tracking-[0.16em] text-neutral-6">
          Live Desk
        </span>
        <span className="flex items-center gap-1.5 text-label-12 text-neutral-7">
          <span aria-hidden className="size-1.5 rounded-full bg-accent" />
          {ownerName}
        </span>
      </div>

      <div className="flex min-w-0 items-start gap-3">
        {showIcon ? (
          <CapsuleTicketIcon
            appIcons={appIcons}
            className="size-11 rounded-lg p-1"
            presentation={presentation}
          />
        ) : (
          <span className="size-11 shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-copy-15 font-medium text-neutral-10">
            {title}
          </p>
          {byline ? (
            <p className="truncate text-copy-13 text-neutral-7">{byline}</p>
          ) : null}
          <p className="truncate text-label-12 text-neutral-6">{bylineLine}</p>
        </div>
      </div>

      {media ? <CapsuleMediaProgress media={media} /> : null}

      {media && application ? (
        <p className="mt-3 truncate text-label-12 italic text-neutral-6">
          {t.rich('activity_desk_using_inline', {
            app: (chunks) => (
              <span className="font-medium not-italic text-neutral-8">
                {chunks}
              </span>
            ),
            name: application.displayName,
          })}
        </p>
      ) : null}
    </div>
  )
}

const CapsuleMediaProgress = ({
  media,
}: {
  media: LiveDeskMediaPresentation
}) => {
  const t = useTranslations('common')
  const reduceMotion = usePrefersReducedMotion()
  const [now, setNow] = useState(() => getServerTime().getTime())

  useEffect(() => {
    if (media.playbackState !== 'playing' || media.positionMs === null) return
    const timer = window.setInterval(
      () => setNow(getServerTime().getTime()),
      1_000,
    )
    return () => window.clearInterval(timer)
  }, [media.anchorAt, media.playbackState, media.positionMs])

  const positionMs = projectMediaPositionMs(media, now)
  if (positionMs === null) return null

  const progress =
    media.durationMs !== null && media.durationMs > 0
      ? Math.min(100, Math.max(0, (positionMs / media.durationMs) * 100))
      : null
  const timeText =
    media.durationMs !== null
      ? ` / ${formatDuration(media.durationMs / 1_000)}`
      : ''

  return (
    <div className="mt-3 flex items-center gap-2 text-neutral-6">
      <LiveDeskInkMeter playbackState={media.playbackState} />
      {progress !== null ? (
        <div
          aria-label={t('aria_progress')}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={Math.round(progress)}
          aria-valuetext={`${formatDuration(positionMs / 1_000)}${timeText}`}
          className="h-1 flex-1 overflow-hidden rounded-full bg-neutral-3"
          role="progressbar"
        >
          <div
            className="h-full rounded-full bg-neutral-8 transition-[width] ease-linear"
            style={{
              transitionDuration: reduceMotion
                ? '0ms'
                : media.playbackState === 'playing'
                  ? '1000ms'
                  : '200ms',
              width: `${progress}%`,
            }}
          />
        </div>
      ) : (
        <span className="flex-1" />
      )}
      <span className="flex shrink-0 items-center text-label-12 tabular-nums">
        <SlotText text={formatDuration(positionMs / 1_000)} />
        {timeText}
      </span>
    </div>
  )
}

const formatDuration = (duration: number) => {
  duration = Math.floor(duration)
  const minutes = Math.floor(duration / 60)
  const seconds = duration % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
