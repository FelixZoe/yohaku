'use client'

import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { AnimatePresence, m } from 'motion/react'
import { useTranslations } from 'next-intl'
import * as React from 'react'
import {
  createContext,
  memo,
  use,
  useDeferredValue,
  useEffect,
  useMemo,
} from 'react'

import { setActivityMediaInfo, setActivityProcessInfo } from '~/atoms/activity'
import { useActivity } from '~/atoms/hooks/activity'
import { useIsMobile } from '~/atoms/hooks/viewport'
import { ImpressionView } from '~/components/common/ImpressionTracker'
import { FloatPopover } from '~/components/ui/float-popover'
import { softBouncePreset } from '~/constants/spring'
import { TrackerAction } from '~/constants/tracker'
import { usePageIsActive } from '~/hooks/common/use-is-active'
import {
  ACTIVITY_ASSET_CDN,
  emptyActivityAssets,
  fetchActivityAssets,
} from '~/lib/activity-assets'
import { apiClient } from '~/lib/request'
import {
  useAggregationSelector,
  useAppConfigSelector,
} from '~/providers/root/aggregation-data-provider'

import { LiveDeskActivity } from './LiveDeskActivity'

const ActivityIconContext = createContext(emptyActivityAssets)
export const Activity = () => {
  const liveDeskEnabled =
    useAppConfigSelector((config) => config.module.liveDesk.enable) === true
  const {
    data = [emptyActivityAssets.appIcon, emptyActivityAssets.appDescription],
  } = useQuery({
    queryKey: ['app-icon', 'app-desc'],
    queryFn: fetchActivityAssets,
    staleTime: Number.POSITIVE_INFINITY,
  })

  const [appLabels, appDescription] = data
  return (
    <ActivityIconContext value={{ appIcon: appLabels, appDescription }}>
      {liveDeskEnabled ? (
        <LiveDeskActivity appIcons={appLabels} />
      ) : (
        <LegacyActivityIcon />
      )}
    </ActivityIconContext>
  )
}

const LegacyActivityIcon = memo(() => {
  const t = useTranslations('common')
  const activityConfig = useAppConfigSelector(
    (config) => config.module.activity,
  )
  const { enable = false, endpoint = '/fn/ps/update' } = activityConfig || {}
  const activity = useActivity()

  const isPageActive = usePageIsActive()
  const { data } = useQuery({
    queryKey: ['activity'],
    queryFn: async () =>
      await apiClient
        .proxy(endpoint)
        .post<{
          processName: string
          processInfo?: {
            name: string
            iconBase64?: string
            iconUrl?: string
            description?: string
          }
          mediaInfo?: {
            title: string
            artist: string
            processName?: string
            duration?: number
          }
        }>()
        .then((res) => res)
        .catch(() => ({
          processName: '',
          processInfo: undefined,
          mediaInfo: undefined,
        })),
    refetchInterval: 1000 * 5 * 60,
    refetchOnMount: 'always',
    retry: false,
    refetchOnReconnect: true,
    refetchOnWindowFocus: 'always',
    enabled: enable && isPageActive,
    meta: {
      persist: false,
    },
  })

  useEffect(() => {
    if (!data) return
    if (data.mediaInfo && data.mediaInfo.title) {
      setActivityMediaInfo(data.mediaInfo)
    } else {
      setActivityMediaInfo(null)
    }
    const nextProcessName = data.processInfo?.name || data.processName
    setActivityProcessInfo(
      nextProcessName
        ? {
            name: nextProcessName,
            iconUrl: data.processInfo?.iconUrl,
            iconBase64: data.processInfo?.iconBase64,
            description: data.processInfo?.description,
          }
        : null,
    )
  }, [data])

  const ownerName = useAggregationSelector((data) => data.user.name)
  const ownerLabel = ownerName || ''

  const { process, media } = activity
  const deferredProcess = useDeferredValue(process)
  const processName = deferredProcess?.name || ''
  const processIcon = deferredProcess?.iconBase64 || deferredProcess?.iconUrl

  const { appDescription, appIcon } = use(ActivityIconContext)
  const renderDescription =
    deferredProcess?.description || appDescription[deferredProcess?.name || '']

  const memoProcessName = useMemo(
    () => ({ processName: processName || '', icon: processIcon }),
    [processIcon, processName],
  )
  const isMobile = useIsMobile()
  const cMusicProps = useMemo(() => {
    const size = isMobile ? 32 : 24
    if (!media?.processName) {
      return { processName: 'cmusic', size }
    }
    return { processName: media?.processName || '', size }
  }, [media, isMobile])

  const mediaVerb = media?.verb || t('activity_verb_listen')
  const processVerb = process?.verb || t('activity_verb_use')

  const hasProcessIcon =
    !!processName && !!(processIcon || appIcon?.[processName])
  const shouldShowProcess = isPageActive && hasProcessIcon
  const shouldShowMedia = !!(
    media &&
    media.title &&
    media.artist &&
    hasProcessIcon
  )

  return (
    <>
      {shouldShowMedia && (
        <m.div className="absolute inset-y-0 left-0 z-[11] flex items-center lg:left-auto lg:right-[-55px] lg:translate-y-1">
          <FloatPopover
            TriggerComponent={TriggerComponent}
            strategy="fixed"
            triggerComponentProps={cMusicProps}
            type="tooltip"
          >
            <p className="text-copy-13">
              {media.processName
                ? t('activity_media_with_app', {
                    owner: ownerLabel,
                    app: media.processName,
                    verb: mediaVerb,
                  })
                : t('activity_media_without_app', {
                    owner: ownerLabel,
                    verb: mediaVerb,
                  })}
            </p>
            <p>
              <span className="font-bold">
                {media.title} - {media.artist}
              </span>
              <span className="ml-4">
                {media.duration ? formatDuration(media.duration) : ''}
              </span>
            </p>
          </FloatPopover>
        </m.div>
      )}
      {isPageActive && (
        <AnimatePresence>
          {shouldShowProcess && (
            <m.div
              className="pointer-events-auto absolute inset-y-0 right-3 z-10 flex items-center overflow-hidden lg:right-[-30px]"
              key={processName}
              transition={softBouncePreset}
              animate={{
                opacity: 1,
                x: 0,
                y: 0,
              }}
              exit={{
                opacity: 0,
                x: -10,
              }}
              initial={{
                opacity: 0.0001,
                y: 15,
              }}
            >
              <FloatPopover
                TriggerComponent={TriggerComponent}
                strategy="fixed"
                triggerComponentProps={memoProcessName}
                type="tooltip"
              >
                <ImpressionView
                  action={TrackerAction.Impression}
                  trackerMessage="Activity"
                >
                  <p className="text-copy-13">
                    {t('activity_process_status', {
                      owner: ownerLabel,
                      verb: processVerb,
                    })}
                  </p>
                  <p>
                    <span className="font-bold">{processName}</span>
                    <span className="whitespace-pre-wrap break-words">
                      {renderDescription ? ` ${renderDescription}` : ''}
                    </span>
                  </p>
                </ImpressionView>
              </FloatPopover>
            </m.div>
          )}
        </AnimatePresence>
      )}
    </>
  )
})
LegacyActivityIcon.displayName = 'LegacyActivityIcon'

const ErrorFallback = `data:image/png;base64,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`
const TriggerComponent = memo<{
  processName: string
  icon?: string
  className?: string
  size?: number
}>(({ processName, icon, className: classNameProp, size = 36 }) => {
  const { appIcon } = use(ActivityIconContext)
  const isBuiltIn = !!appIcon[processName]

  const src =
    !isBuiltIn && icon
      ? icon
      : isBuiltIn
        ? `${ACTIVITY_ASSET_CDN}/apps/${appIcon[processName]}.png`
        : ''

  const className = clsx(
    'pointer-events-none select-none',
    {
      'rounded-md': !isBuiltIn,
    },
    classNameProp,
  )
  const [error, setError] = React.useState(false)

  if (!src) return null

  return (
    <img
      alt={processName}
      className={className}
      fetchPriority="low"
      height={size}
      src={error ? ErrorFallback : src}
      width={size}
      onError={() => setError(true)}
    />
  )
})

TriggerComponent.displayName = 'ActivityIcon'

const formatDuration = (duration: number) => {
  duration = Math.floor(duration)
  const minutes = Math.floor(duration / 60)
  const seconds = duration % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
