'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import {
  type CompanionMomentMedia,
  type CompanionMomentMetadata,
  formatPlaybackTime,
} from '~/lib/companion-moment'

export const CompanionMomentContext = ({
  metadata,
  primary = false,
}: {
  metadata: CompanionMomentMetadata
  primary?: boolean
}) => {
  const t = useTranslations('thinking')
  const { application, media } = metadata

  return (
    <div
      className={`flex min-w-0 flex-col gap-4 ${primary ? '' : 'mt-5 border-t border-dashed border-border pt-4'}`}
    >
      {media && <MediaContext media={media} primary={primary} />}
      {application && (
        <div className="flex min-w-0 items-start gap-3 text-neutral-7">
          <i
            aria-hidden
            className="i-mingcute-window-line mt-0.5 shrink-0 text-copy-16 text-neutral-5"
          />
          <div className="min-w-0">
            <div
              className={primary ? 'text-copy-15 font-medium' : 'text-copy-13'}
            >
              <span className="sr-only">{t('moment_application')}: </span>
              {application.displayName}
            </div>
            {application.activity?.customLabel && (
              <div className="mt-0.5 text-copy-13 text-neutral-5">
                {application.activity.customLabel}
              </div>
            )}
            {application.window?.title && (
              <div className="mt-1 truncate text-copy-13 text-neutral-5">
                <span className="sr-only">{t('moment_window')}: </span>
                {application.window.title}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const MediaContext = ({
  media,
  primary,
}: {
  media: CompanionMomentMedia
  primary: boolean
}) => {
  const t = useTranslations('thinking')
  const [artworkFailed, setArtworkFailed] = useState(false)
  const identity = media.title ?? media.artist ?? t('moment_media')
  const position = media.playback.positionMs
  const duration = media.playback.durationMs
  const playbackText =
    position === null
      ? null
      : duration === null
        ? t('moment_playback_at', { position: formatPlaybackTime(position) })
        : t('moment_playback_progress', {
            position: formatPlaybackTime(position),
            duration: formatPlaybackTime(duration),
          })

  const body = (
    <>
      <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-neutral-3 md:size-22">
        {media.artwork && !artworkFailed ? (
          <Image
            fill
            alt=""
            className="object-cover"
            sizes="(min-width: 768px) 88px, 64px"
            src={media.artwork.url}
            onError={() => setArtworkFailed(true)}
          />
        ) : (
          <i
            aria-hidden
            className="i-mingcute-music-2-line absolute inset-0 m-auto size-fit text-title-24 text-neutral-5"
          />
        )}
      </div>
      <div className="min-w-0 self-center">
        <div
          className={
            primary
              ? 'text-copy-16 font-medium text-neutral-9'
              : 'text-copy-14 font-medium text-neutral-8'
          }
        >
          {identity}
        </div>
        {media.artist && media.artist !== identity && (
          <div className="mt-0.5 text-copy-13 text-neutral-6">
            {media.artist}
          </div>
        )}
        <div className="mt-1 text-label-12 text-neutral-5">
          {[media.player?.displayName, playbackText]
            .filter(Boolean)
            .join(' · ')}
        </div>
      </div>
    </>
  )

  return media.link ? (
    <a
      className="flex min-w-0 gap-4 transition-opacity hover:opacity-80"
      href={media.link.url}
      rel="noopener noreferrer"
      target="_blank"
    >
      {body}
    </a>
  ) : (
    <div className="flex min-w-0 gap-4">{body}</div>
  )
}
