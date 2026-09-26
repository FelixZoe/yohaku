/* eslint-disable @eslint-react/no-context-provider */
import { Slider } from '@base-ui/react/slider'
import { m, useDragControls, useSpring } from 'motion/react'
import { useTranslations } from 'next-intl'
import type { PropsWithChildren } from 'react'
import {
  memo,
  startTransition,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createContext, useContextSelector } from 'use-context-selector'

import type { HTMLMediaState } from '~/hooks/common/factory/createHTMLMediaHook'
import { useEventCallback } from '~/hooks/common/use-event-callback'
import { useGetState } from '~/hooks/common/use-get-state'
import { useVideo } from '~/hooks/common/useVideo'
import { nextFrame, stopPropagation } from '~/lib/dom'
import { clsxm } from '~/lib/helper'

import { MotionButtonBase } from '../button'
import { FloatPopover } from '../float-popover'
import { IconScaleTransition } from '../transition/IconScaleTransnsition'
import { VolumeSlider } from './VolumeSlider'

type VideoPlayerProps = {
  src: string

  variant?: 'preview' | 'player' | 'thumbnail'
} & React.VideoHTMLAttributes<HTMLVideoElement> &
  PropsWithChildren
type VideoPlayerRef = {
  getElement: () => HTMLVideoElement | null

  getState: () => HTMLMediaState
  controls: {
    play: () => Promise<void> | undefined
    pause: () => void
    seek: (time: number) => void
    volume: (volume: number) => void
    mute: () => void
    unmute: () => void
  }

  wrapperRef: React.RefObject<HTMLDivElement | null>
}

interface VideoPlayerContextValue {
  controls: VideoPlayerRef['controls']
  src: string
  state: HTMLMediaState
  variant: 'preview' | 'player' | 'thumbnail'
  wrapperRef: React.RefObject<HTMLDivElement | null>
}
const VideoPlayerContext = createContext<VideoPlayerContextValue>(null!)
export const VideoPlayer = ({
  ref,
  src,
  className,
  variant = 'player',
  ...rest
}: VideoPlayerProps & { ref?: React.RefObject<VideoPlayerRef> }) => {
  const isPlayer = variant === 'player'
  const [clickToStatus, setClickToStatus] = useState(
    null as 'play' | 'pause' | null,
  )

  const scaleValue = useSpring(1)
  const opacityValue = useSpring(0)
  const handleClick = useEventCallback((e?: any) => {
    if (!isPlayer) return
    e?.stopPropagation()

    if (state.playing) {
      controls.pause()
      setClickToStatus('pause')
    } else {
      controls.play()
      setClickToStatus('play')
    }

    opacityValue.jump(1)
    scaleValue.jump(1)

    nextFrame(() => {
      scaleValue.set(1.3)
      opacityValue.set(0)
    })
  })

  const [element, state, controls, videoRef] = useVideo({
    src,
    className,
    playsInline: true,
    ...rest,
    controls: false,
    onClick(e) {
      rest.onClick?.(e)
      handleClick(e)
    },
    muted: (rest.muted ?? isPlayer) ? false : true,
    onDoubleClick(e) {
      rest.onDoubleClick?.(e)
      if (!isPlayer) return
      e.preventDefault()
      e.stopPropagation()
      if (!document.fullscreenElement) {
        wrapperRef.current?.requestFullscreen()
      } else {
        document.exitFullscreen()
      }
    },
  })

  const stateRef = useGetState(state)
  const memoedControls = useState(controls)[0]
  const wrapperRef = useRef<HTMLDivElement>(null)
  useImperativeHandle(
    ref,
    () => ({
      getElement: () => videoRef.current,
      getState: () => stateRef(),
      controls: memoedControls,
      wrapperRef,
    }),

    [stateRef, videoRef, memoedControls],
  )

  return (
    <div className="group center relative size-full" ref={wrapperRef}>
      {element}

      <div className="center pointer-events-none absolute inset-0 flex">
        <m.div
          className="center flex size-20 rounded-full bg-neutral-10 p-3"
          style={{ scale: scaleValue, opacity: opacityValue }}
        >
          <i
            className={clsxm(
              'size-8 text-white',
              clickToStatus === 'play'
                ? 'i-mingcute-play-fill'
                : 'i-mingcute-pause-fill',
            )}
          />
        </m.div>
      </div>

      <VideoPlayerContext.Provider
        value={useMemo(
          () => ({ state, controls, wrapperRef, src, variant }),
          [state, controls, src, variant],
        )}
      >
        {variant === 'preview' && state.hasAudio && <FloatMutedButton />}
        {isPlayer && <ControlBar />}
      </VideoPlayerContext.Provider>
    </div>
  )
}
const FloatMutedButton = () => {
  const isMuted = useContextSelector(
    VideoPlayerContext,
    (value) => value.state.muted,
  )
  const controls = useContextSelector(
    VideoPlayerContext,
    (value) => value.controls,
  )
  return (
    <MotionButtonBase
      className="center absolute right-4 top-4 z-10 size-7 rounded-full bg-neutral-10/50 opacity-0 duration-200 group-hover:opacity-100"
      onClick={(e) => {
        e.stopPropagation()
        if (isMuted) {
          controls.unmute()
        } else {
          controls.mute()
        }
      }}
    >
      <IconScaleTransition
        className="size-4 text-white"
        icon1="i-mgc-volume-cute-re"
        icon2="i-mgc-volume-mute-cute-re"
        status={isMuted ? 'done' : 'init'}
      />
    </MotionButtonBase>
  )
}

const ControlBar = memo(() => {
  const t = useTranslations('common')
  const controls = useContextSelector(VideoPlayerContext, (v) => v.controls)
  const isPaused = useContextSelector(VideoPlayerContext, (v) => v.state.paused)
  const dragControls = useDragControls()

  return (
    <m.div
      drag
      dragControls={dragControls}
      dragElastic={0}
      dragListener={false}
      dragMomentum={false}
      className={clsxm(
        'absolute inset-x-8 bottom-2 h-10 rounded-full border bg-neutral-2/90 backdrop-blur-xl',
        'flex items-center gap-3 px-4',
        'mx-auto max-w-[80vw]',
      )}
      dragConstraints={{
        current:
          typeof document !== 'undefined' ? document.documentElement : null,
      }}
      onClick={stopPropagation}
    >
      {/* Drag Area */}
      <div
        className="absolute inset-0 z-[1]"
        onPointerDownCapture={dragControls.start.bind(dragControls)}
      />

      <ActionIcon
        className="center relative flex"
        label={isPaused ? t('video_play') : t('video_pause')}
        onClick={() => {
          if (isPaused) {
            controls.play()
          } else {
            controls.pause()
          }
        }}
      >
        <span className="center flex">
          <IconScaleTransition
            icon1="i-mingcute-play-fill size-5"
            icon2="i-mingcute-pause-fill size-5"
            status={isPaused ? 'init' : 'done'}
          />
        </span>
      </ActionIcon>

      {/* Progress bar */}
      <PlayProgressBar />

      {/* Right Action */}
      <m.div className="relative z-[1] flex items-center gap-2">
        <VolumeControl />
        <DownloadVideo />
        <FullScreenControl />
      </m.div>
    </m.div>
  )
})

const FullScreenControl = () => {
  const t = useTranslations('common')
  const ref = useContextSelector(VideoPlayerContext, (v) => v.wrapperRef)
  const [isFullScreen, setIsFullScreen] = useState(!!document.fullscreenElement)

  useEffect(() => {
    const onFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', onFullScreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', onFullScreenChange)
    }
  }, [])

  return (
    <ActionIcon
      label={isFullScreen ? t('video_exit_fullscreen') : t('video_fullscreen')}
      onClick={() => {
        if (!ref.current) return

        if (isFullScreen) {
          document.exitFullscreen()
        } else {
          ref.current.requestFullscreen()
        }
      }}
    >
      {isFullScreen ? (
        <i className="i-mingcute-fullscreen-2-fill size-5" />
      ) : (
        <i className="i-mingcute-fullscreen-exit-fill size-5" />
      )}
    </ActionIcon>
  )
}

const DownloadVideo = () => {
  const t = useTranslations('common')
  const src = useContextSelector(VideoPlayerContext, (v) => v.src)
  const [isDownloading, setIsDownloading] = useState(false)
  const download = useEventCallback(() => {
    setIsDownloading(true)
    fetch(src)
      .then((res) => res.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = src.split('/').pop()!
        a.click()
        URL.revokeObjectURL(url)
        setIsDownloading(false)
      })
  })

  return (
    <ActionIcon label={t('video_download')} onClick={download}>
      {isDownloading ? (
        <i className="i-mingcute-loading-3-fill size-5 animate-spin" />
      ) : (
        <i className="i-mingcute-download-2-fill size-5" />
      )}
    </ActionIcon>
  )
}
const VolumeControl = () => {
  const t = useTranslations('common')
  const hasAudio = useContextSelector(
    VideoPlayerContext,
    (v) => v.state.hasAudio,
  )

  const controls = useContextSelector(VideoPlayerContext, (v) => v.controls)
  const volume = useContextSelector(VideoPlayerContext, (v) => v.state.volume)
  const muted = useContextSelector(VideoPlayerContext, (v) => v.state.muted)
  if (!hasAudio) return null
  return (
    <ActionIcon
      label={<VolumeSlider volume={volume} onVolumeChange={controls.volume} />}
      onClick={() => {
        if (muted) {
          controls.unmute()
        } else {
          controls.mute()
        }
      }}
    >
      {muted ? (
        <i
          className="i-mingcute-volume-mute-fill size-5"
          title={t('video_mute')}
        />
      ) : (
        <i
          className="i-mingcute-volume-fill size-5"
          title={t('video_unmute')}
        />
      )}
    </ActionIcon>
  )
}

const PlayProgressBar = () => {
  const t = useTranslations('common')
  const state = useContextSelector(VideoPlayerContext, (value) => value.state)
  const controls = useContextSelector(
    VideoPlayerContext,
    (value) => value.controls,
  )
  const [currentDragging, setCurrentDragging] = useState(false)
  const [dragTime, setDragTime] = useState(0)

  return (
    <Slider.Root
      className="relative z-[1] flex size-full items-center transition-all duration-200 ease-in-out"
      max={state.duration}
      min={0}
      step={0.01}
      value={currentDragging ? dragTime : state.time}
      onValueChange={(value) => {
        setDragTime(value)
        startTransition(() => {
          controls.seek(value)
        })
      }}
      onValueCommitted={() => {
        controls.play()
        setCurrentDragging(false)
        controls.seek(dragTime)
      }}
    >
      <Slider.Control
        className="relative flex size-full grow items-center"
        onPointerDown={() => {
          if (state.playing) {
            controls.pause()
          }
          setDragTime(state.time)
          setCurrentDragging(true)
        }}
      >
        <Slider.Track className="relative h-1 w-full grow rounded bg-neutral-1">
          <Slider.Indicator className="absolute h-1 rounded bg-neutral-6/40" />

          {/* indicator */}
          <Slider.Thumb
            aria-label={t('aria_progress')}
            className="block h-3 w-[3px] rounded-[1px] bg-neutral-6"
          />
        </Slider.Track>
      </Slider.Control>
    </Slider.Root>
  )
}

const ActionIcon = ({
  className,
  onClick,
  children,
  label,
}: {
  className?: string
  onClick?: () => void
  label: React.ReactNode
  children?: React.ReactNode
}) => {
  return (
    <FloatPopover
      placement="top"
      type="tooltip"
      wrapperClassName="flex center"
      triggerElement={
        <MotionButtonBase
          className={clsxm('z-[2] flex center', className)}
          onClick={onClick}
        >
          {children || <i className={className} />}
        </MotionButtonBase>
      }
    >
      {label}
    </FloatPopover>
  )
}
