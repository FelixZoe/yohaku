import { useCallback, useEffect, useRef, useState } from 'react'

import { setTtsNarration } from '~/atoms/tts'

export interface TtsPlayback {
  isPlaying: boolean
  playAll: () => void
  playbackRate: number
  playingIndex: null | number
  reset: () => void
  setPlaybackRate: (rate: number) => void
  stop: () => void
  toggleSegment: (index: number) => void
}

export function useTtsPlayback(urls: string[]): TtsPlayback {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const preloadAudioRef = useRef<HTMLAudioElement | null>(null)
  const urlsRef = useRef(urls)
  const playingIndexRef = useRef<null | number>(null)
  const playFromRef = useRef<(index: number) => void>(() => undefined)
  const playbackRateRef = useRef(1)
  const [playingIndex, setPlayingIndex] = useState<null | number>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackRate, setPlaybackRateState] = useState(1)

  const setCurrentIndex = useCallback((index: null | number) => {
    playingIndexRef.current = index
    setPlayingIndex(index)
  }, [])
  const setPlaybackRate = useCallback((rate: number) => {
    playbackRateRef.current = rate
    setPlaybackRateState(rate)
    if (audioRef.current) audioRef.current.playbackRate = rate
  }, [])

  const stop = useCallback(() => {
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.currentTime = 0
    }
    setCurrentIndex(null)
  }, [setCurrentIndex])
  const reset = useCallback(() => {
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.currentTime = 0
    }
    setCurrentIndex(null)
    setTtsNarration({ elapsed: 0, duration: 0 })
  }, [setCurrentIndex])

  const playFrom = useCallback(
    (index: number) => {
      const url = urlsRef.current[index]
      if (!url) return

      const nextUrl = urlsRef.current[index + 1]

      let audio = audioRef.current
      if (!audio) {
        audio = new Audio()
        audio.preload = 'auto'
        audio.addEventListener('play', () => setIsPlaying(true))
        audio.addEventListener('pause', () => setIsPlaying(false))
        audio.addEventListener('ended', () => {
          const current = playingIndexRef.current
          if (current !== null && current + 1 < urlsRef.current.length) {
            playFromRef.current(current + 1)
          } else {
            setCurrentIndex(null)
            setIsPlaying(false)
          }
        })
        audio.addEventListener('error', () => {
          setCurrentIndex(null)
          setIsPlaying(false)
        })
        audio.addEventListener('timeupdate', () => {
          const a = audioRef.current
          if (a) setTtsNarration({ elapsed: a.currentTime })
        })
        audio.addEventListener('loadedmetadata', () => {
          const a = audioRef.current
          if (a) {
            setTtsNarration({
              duration: Number.isFinite(a.duration) ? a.duration : 0,
              elapsed: 0,
            })
          }
        })
        audioRef.current = audio
      }

      setCurrentIndex(index)
      audio.src = url
      setTtsNarration({ elapsed: 0, duration: 0 })
      audio.playbackRate = playbackRateRef.current
      const playPromise = audio.play()
      if (playPromise) {
        playPromise.catch(() => {
          setCurrentIndex(null)
          setIsPlaying(false)
        })
      }

      if (nextUrl) {
        let preloader = preloadAudioRef.current
        if (!preloader || preloader.src !== nextUrl) {
          preloader = new Audio()
          preloader.preload = 'auto'
          preloader.src = nextUrl
          preloadAudioRef.current = preloader
        }
      }
    },
    [setCurrentIndex],
  )

  useEffect(() => {
    playFromRef.current = playFrom
  }, [playFrom])

  useEffect(() => {
    const previous = urlsRef.current
    urlsRef.current = urls
    const current = playingIndexRef.current
    if (current !== null && previous[current] !== urls[current]) {
      stop()
    }
  }, [urls, stop])

  useEffect(() => {
    return () => {
      const audio = audioRef.current
      if (!audio) return
      audio.pause()
      audio.removeAttribute('src')
      if (typeof audio.load === 'function') audio.load()
      audioRef.current = null
    }
  }, [])

  const playAll = useCallback(() => {
    playFrom(0)
  }, [playFrom])

  const toggleSegment = useCallback(
    (index: number) => {
      const audio = audioRef.current
      if (playingIndexRef.current === index && audio) {
        if (audio.paused) {
          const playPromise = audio.play()
          if (playPromise) playPromise.catch(() => undefined)
        } else {
          audio.pause()
        }
        return
      }
      playFrom(index)
    },
    [playFrom],
  )

  return {
    isPlaying,
    playAll,
    playbackRate,
    playingIndex,
    reset,
    setPlaybackRate,
    stop,
    toggleSegment,
  }
}
