'use client'

import clsx from 'clsx'
import { useAtomValue } from 'jotai'
import { AnimatePresence, m, useReducedMotion } from 'motion/react'
import { useTranslations } from 'next-intl'
import {
  memo,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'

import { liveDeskAtom } from '~/atoms/live-desk'
import { getServerTime } from '~/components/common/SyncServerTime'
import { FloatPopover } from '~/components/ui/float-popover'
import { SlotText } from '~/components/ui/slot-text'
import { usePageIsActive } from '~/hooks/common/use-is-active'
import { resolveActivityAppIconURL } from '~/lib/activity-assets'
import {
  buildMediaByline,
  createLiveDeskPresentation,
  type LiveDeskApplicationPresentation,
  type LiveDeskMediaPresentation,
  projectMediaPositionMs,
} from '~/lib/live-desk/presentation'
import { useAggregationSelector } from '~/providers/root/aggregation-data-provider'

import { measureTicketWidth } from './live-desk-ticket-width'
import styles from './LiveDeskActivity.module.css'

const TICKET_NAV_CLEARANCE = 200
const TICKET_MIN_WIDTH = 140

export const mediaFallbackIconClass: Record<
  LiveDeskMediaPresentation['kind'],
  string
> = {
  music: 'i-mingcute-music-2-line',
  podcast: 'i-mingcute-mic-line',
  unknown: 'i-mingcute-headphone-line',
  video: 'i-mingcute-video-line',
}

export const LiveDeskActivity = memo(
  ({ appIcons }: { appIcons: Record<string, string> }) => {
    const liveDeskState = useAtomValue(liveDeskAtom)
    const presentation = createLiveDeskPresentation(
      liveDeskState,
      getServerTime().getTime(),
    )
    const isPageActive = usePageIsActive()
    const ownerName = useAggregationSelector((data) => data.user.name) || ''
    const t = useTranslations('common')

    if (!isPageActive || !presentation.visible) return null

    const applicationIconURL = presentation.application
      ? resolveActivityAppIconURL(
          presentation.application.displayName,
          presentation.application.iconURL,
          appIcons,
        )
      : null
    const mediaIconURL = presentation.media
      ? (presentation.media.artworkURL ??
        resolveActivityAppIconURL(
          presentation.media.playerDisplayName,
          null,
          appIcons,
        ))
      : null

    const applicationLabel = presentation.application
      ? `${t('activity_process_status', {
          owner: ownerName,
          verb: t('activity_verb_use'),
        })} ${presentation.application.displayName}`
      : ''
    const mediaSubject =
      presentation.media?.title ||
      presentation.media?.artist ||
      presentation.media?.playerDisplayName ||
      ''
    const mediaLabel = presentation.media
      ? `${
          presentation.media.playerDisplayName
            ? t('activity_media_with_app', {
                app: presentation.media.playerDisplayName,
                owner: ownerName,
                verb: t('activity_verb_listen'),
              })
            : t('activity_media_without_app', {
                owner: ownerName,
                verb: t('activity_verb_listen'),
              })
        } ${mediaSubject}`
      : ''

    return (
      <LiveDeskPaperStack
        application={presentation.application}
        applicationIconURL={applicationIconURL}
        applicationLabel={applicationLabel}
        media={presentation.media}
        mediaIconURL={mediaIconURL}
        mediaLabel={mediaLabel}
        ownerName={ownerName}
      />
    )
  },
)
LiveDeskActivity.displayName = 'LiveDeskActivity'

const LiveDeskPaperStack = ({
  application,
  applicationIconURL,
  applicationLabel,
  media,
  mediaIconURL,
  mediaLabel,
  ownerName,
}: {
  application: LiveDeskApplicationPresentation | null
  applicationIconURL: string | null
  applicationLabel: string
  media: LiveDeskMediaPresentation | null
  mediaIconURL: string | null
  mediaLabel: string
  ownerName: string
}) => {
  const [open, setOpen] = useState(false)
  const reduceMotion = useReducedMotion()
  const detailsId = useId()
  const t = useTranslations('common')
  const title = media
    ? media.title || media.artist || media.playerDisplayName || 'Media'
    : application?.displayName || ''
  const subtitle = media
    ? media.artist || media.playerDisplayName || media.album || ''
    : application?.detail || ''
  const trackKey = media
    ? [media.title, media.artist, media.album].filter(Boolean).join(':') ||
      title
    : `${application?.displayName}:${application?.detail || ''}`
  const primaryIconURL = media ? mediaIconURL : applicationIconURL
  const primaryFallbackIconClass = media
    ? mediaFallbackIconClass[media.kind]
    : 'i-mingcute-window-line'
  const label = [mediaLabel, applicationLabel].filter(Boolean).join('. ')
  const playbackState = media?.playbackState
  const playbackURL = media?.playbackURL
  const stateText = media
    ? t(
        media.playbackState === 'playing'
          ? 'activity_media_playing'
          : 'activity_media_paused',
      )
    : t('activity_in_use')

  const wrapRef = useRef<HTMLDivElement>(null)
  const stateRef = useRef<HTMLSpanElement>(null)
  const subRef = useRef<HTMLSpanElement>(null)
  const titleRef = useRef<HTMLSpanElement>(null)
  const [ticketWidth, setTicketWidth] = useState<number | null>(null)

  useLayoutEffect(() => {
    const compute = () => {
      if (!stateRef.current || !titleRef.current || !wrapRef.current) return
      const natural = measureTicketWidth({
        hasMeter: Boolean(playbackState),
        stateEl: stateRef.current,
        stateText,
        subEl: subRef.current,
        subtitle,
        title,
        titleEl: titleRef.current,
      })
      const wrapLeft = wrapRef.current.getBoundingClientRect().left
      const availableToNav =
        window.innerWidth / 2 - TICKET_NAV_CLEARANCE - wrapLeft
      setTicketWidth(
        Math.max(TICKET_MIN_WIDTH, Math.min(natural, availableToNav)),
      )
    }

    compute()
    let cancelled = false
    document.fonts?.ready.then(() => {
      if (!cancelled) compute()
    })
    window.addEventListener('resize', compute)
    return () => {
      cancelled = true
      window.removeEventListener('resize', compute)
    }
  }, [playbackState, stateText, subtitle, title])

  return (
    <div
      className="pointer-events-none absolute left-[calc(50%+2rem)] top-1/2 z-[10] h-[40px] -translate-y-1/2"
      ref={wrapRef}
    >
      <FloatPopover
        asChild
        placement="bottom-start"
        popoverClassNames="w-[21rem] max-w-[calc(100vw-2rem)] break-normal"
        strategy="fixed"
        trigger="hover"
        type="tooltip"
        triggerElement={
          <m.button
            aria-describedby={open ? detailsId : undefined}
            aria-label={label}
            data-open={open || undefined}
            style={ticketWidth === null ? undefined : { width: ticketWidth }}
            type="button"
            whileHover={reduceMotion ? undefined : { y: -1 }}
            whileTap={reduceMotion ? undefined : { scale: 0.96 }}
            className={clsx(
              styles.ticket,
              'pointer-events-auto relative flex h-[40px] items-center gap-2 overflow-hidden pl-1.5 pr-2 text-left font-sans outline-none',
              'focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-1',
              'max-w-[min(250px,calc(100vw-180px))]',
            )}
            onClick={
              playbackURL
                ? () => {
                    window.open(playbackURL, '_blank', 'noopener,noreferrer')
                  }
                : undefined
            }
          >
            <span className="relative grid size-8 shrink-0 place-items-center rounded-[3px] border border-[color:var(--yohaku-paper-hairline)] bg-[var(--surface-paper)] p-0.5 text-neutral-7">
              <PaperSlipIcon
                fallbackIconClass={primaryFallbackIconClass}
                key={primaryIconURL || primaryFallbackIconClass}
                src={primaryIconURL}
              />
            </span>

            <span className="min-w-0 flex-1 overflow-hidden">
              <span className="flex h-[14px] min-w-0 items-center gap-1 overflow-hidden leading-[14px] text-neutral-6">
                {playbackState ? (
                  <LiveDeskInkMeter playbackState={playbackState} />
                ) : null}
                <span
                  className="shrink-0 text-label-12 uppercase leading-[14px] tracking-[0.05em]"
                  ref={stateRef}
                >
                  {stateText}
                </span>
                {subtitle ? (
                  <>
                    <span aria-hidden className="text-label-12 leading-[14px]">
                      ·
                    </span>
                    <span
                      className="truncate text-label-12 leading-[14px]"
                      ref={subRef}
                    >
                      {subtitle}
                    </span>
                  </>
                ) : null}
              </span>
              <span
                className="relative block h-[17px] overflow-hidden text-copy-13 font-medium leading-[17px] text-neutral-9"
                ref={titleRef}
              >
                <AnimatePresence initial={false} mode="wait">
                  <m.span
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute inset-0 truncate"
                    key={trackKey}
                    exit={{
                      opacity: 0,
                      y: reduceMotion ? 0 : -3,
                    }}
                    initial={{
                      opacity: 0,
                      y: reduceMotion ? 0 : 3,
                    }}
                    transition={{
                      duration: reduceMotion ? 0.1 : 0.2,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    {title}
                  </m.span>
                </AnimatePresence>
              </span>
            </span>
          </m.button>
        }
        onClose={() => setOpen(false)}
        onOpen={() => setOpen(true)}
      >
        <div className="space-y-3 font-sans" id={detailsId}>
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <p className="text-caption-10 uppercase tracking-[0.16em] text-neutral-6">
                Live Desk
              </p>
              <p className="text-copy-16 text-neutral-9">{ownerName}</p>
            </div>
            <span className="flex shrink-0 items-center gap-1.5 text-label-12 text-neutral-7">
              <span aria-hidden className={styles.liveDot} />
              {t('activity_desk_online')}
            </span>
          </div>

          {media ? <MediaStage iconURL={mediaIconURL} media={media} /> : null}

          {application ? (
            media ? (
              <ApplicationFootnote
                application={application}
                iconURL={applicationIconURL}
              />
            ) : (
              <ApplicationRow
                application={application}
                iconURL={applicationIconURL}
              />
            )
          ) : null}
        </div>
      </FloatPopover>
    </div>
  )
}

export const LiveDeskInkMeter = ({
  playbackState,
}: {
  playbackState: LiveDeskMediaPresentation['playbackState']
}) => (
  <span aria-hidden className={styles.inkMeter} data-playback={playbackState}>
    <span className={styles.inkMeterBar} />
    <span className={styles.inkMeterBar} />
    <span className={styles.inkMeterBar} />
  </span>
)

export const PaperSlipIcon = memo(
  ({
    fallbackIconClass,
    fallbackSizeClass = 'text-icon-md',
    src,
  }: {
    fallbackIconClass: string
    fallbackSizeClass?: string
    src: string | null
  }) => {
    const [failed, setFailed] = useState(false)

    if (!src || failed) {
      return (
        <i aria-hidden className={clsx(fallbackIconClass, fallbackSizeClass)} />
      )
    }

    return (
      <img
        alt=""
        className="size-full rounded-[2px] object-cover"
        draggable={false}
        src={src}
        onError={() => setFailed(true)}
      />
    )
  },
)
PaperSlipIcon.displayName = 'PaperSlipIcon'

const ApplicationRow = ({
  application,
  iconURL,
}: {
  application: LiveDeskApplicationPresentation
  iconURL: string | null
}) => {
  const t = useTranslations('common')

  return (
    <section className="flex min-w-0 items-start gap-3">
      <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-[color:var(--yohaku-paper-hairline)] bg-[var(--surface-paper)] p-1 text-neutral-7">
        <PaperSlipIcon
          fallbackIconClass="i-mingcute-window-line"
          key={iconURL || application.displayName}
          src={iconURL}
        />
      </span>
      <div className="min-w-0 space-y-0.5">
        <p className="text-caption-10 uppercase tracking-[0.16em] text-neutral-6">
          {t('activity_verb_use')}
        </p>
        <p className="font-medium text-neutral-9">{application.displayName}</p>
        {application.detail ? (
          <p className="break-words text-copy-13 text-neutral-7">
            {application.detail}
          </p>
        ) : null}
      </div>
    </section>
  )
}

const ApplicationFootnote = ({
  application,
  iconURL,
}: {
  application: LiveDeskApplicationPresentation
  iconURL: string | null
}) => {
  const t = useTranslations('common')

  return (
    <div className="flex min-w-0 items-center gap-2.5 text-copy-13 text-neutral-7">
      <span className="grid size-[22px] shrink-0 place-items-center overflow-hidden rounded-md border border-[color:var(--yohaku-paper-hairline)] bg-[var(--surface-paper)] p-0.5 text-neutral-7">
        <PaperSlipIcon
          fallbackIconClass="i-mingcute-window-line"
          fallbackSizeClass="text-icon-sm"
          key={iconURL || application.displayName}
          src={iconURL}
        />
      </span>
      <span className="min-w-0 truncate">
        {t.rich('activity_desk_using_inline', {
          app: (chunks) => (
            <span className="font-medium text-neutral-8">{chunks}</span>
          ),
          name: application.displayName,
        })}
      </span>
    </div>
  )
}

const MediaStage = ({
  iconURL,
  media,
}: {
  iconURL: string | null
  media: LiveDeskMediaPresentation
}) => {
  const t = useTranslations('common')
  const reduceMotion = useReducedMotion()
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
  const progress =
    positionMs !== null && media.durationMs !== null && media.durationMs > 0
      ? Math.min(100, Math.max(0, (positionMs / media.durationMs) * 100))
      : null
  const title =
    media.title || media.artist || media.playerDisplayName || 'Media'
  const byline = buildMediaByline(media)
  const stateText = t(
    media.playbackState === 'playing'
      ? 'activity_media_playing'
      : 'activity_media_paused',
  )
  const timeText =
    positionMs !== null
      ? media.durationMs !== null
        ? ` / ${formatDuration(media.durationMs / 1_000)}`
        : ''
      : ''

  return (
    <section className="rounded-lg bg-neutral-1 p-3 ring-1 ring-border">
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-[color:var(--yohaku-paper-hairline)] bg-[var(--surface-paper)] p-1 text-neutral-7">
          <PaperSlipIcon
            fallbackIconClass={mediaFallbackIconClass[media.kind]}
            key={iconURL || media.playerDisplayName || media.kind}
            src={iconURL}
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-copy-15 font-medium text-neutral-10">
            {title}
          </p>
          {byline ? (
            <p className="truncate text-copy-13 text-neutral-7">{byline}</p>
          ) : null}
          <p className="truncate text-label-12 text-neutral-6">
            {media.playerDisplayName
              ? `${media.playerDisplayName} · ${stateText}`
              : stateText}
          </p>
        </div>
      </div>

      {positionMs !== null ? (
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
      ) : null}
    </section>
  )
}

const formatDuration = (duration: number) => {
  duration = Math.floor(duration)
  const minutes = Math.floor(duration / 60)
  const seconds = duration % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
