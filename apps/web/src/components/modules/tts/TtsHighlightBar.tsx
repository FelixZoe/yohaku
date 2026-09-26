'use client'

import type { AITtsSegmentModel } from '@mx-space/api-client'
import { useAtomValue } from 'jotai'
import { animate } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { useMainMarkdownElement } from '~/atoms/hooks/reading'
import {
  setTtsNarration,
  ttsNarrationAtom,
  ttsRevealRequestAtom,
} from '~/atoms/tts'
import type { BlockInfo } from '~/components/modules/comment/anchor-utils'
import { extractBlockInfos } from '~/components/modules/comment/anchor-utils'

const PROGRAMMATIC_SCROLL_GUARD_MS = 450

export function TtsHighlightBar({
  content,
  segments,
  playingIndex,
}: {
  content: string | null | undefined
  segments: AITtsSegmentModel[]
  playingIndex: number | null
}) {
  const contentEl = useMainMarkdownElement()
  const autoFollow = useAtomValue(ttsNarrationAtom).autoFollow
  const autoFollowRef = useRef(autoFollow)
  const programmaticRef = useRef(false)
  const [barEl, setBarEl] = useState<HTMLDivElement | null>(null)
  const blockInfosRef = useRef<BlockInfo[]>([])

  useEffect(() => {
    autoFollowRef.current = autoFollow
  }, [autoFollow])

  useEffect(() => {
    if (!content) {
      blockInfosRef.current = []
      return
    }
    blockInfosRef.current = extractBlockInfos(content)
  }, [content])

  const scrollToSegment = (idx: number, smooth: boolean) => {
    const richEl = contentEl?.querySelector(
      '.rich-content',
    ) as HTMLElement | null
    if (!richEl) return
    const segment = segments[idx]
    if (!segment) return
    const blockIdx = blockInfosRef.current.findIndex(
      (b) => b.blockId === segment.blockId,
    )
    if (blockIdx === -1) return
    const child = richEl.children[blockIdx] as HTMLElement | undefined
    if (!child) return
    programmaticRef.current = true
    child.scrollIntoView({
      block: 'center',
      behavior: smooth ? 'smooth' : 'auto',
    })
    window.setTimeout(() => {
      programmaticRef.current = false
    }, PROGRAMMATIC_SCROLL_GUARD_MS)
  }

  useEffect(() => {
    if (!barEl) return
    const richEl = contentEl?.querySelector(
      '.rich-content',
    ) as HTMLElement | null
    if (!richEl) return

    if (playingIndex === null) {
      animate(barEl, { opacity: 0 }, { duration: 0.2 })
      return
    }

    const segment = segments[playingIndex]
    if (!segment) return

    const blockIdx = blockInfosRef.current.findIndex(
      (b) => b.blockId === segment.blockId,
    )
    if (blockIdx === -1) return

    const child = richEl.children[blockIdx] as HTMLElement | undefined
    if (!child) return

    const containerRect = contentEl!.getBoundingClientRect()
    const childRect = child.getBoundingClientRect()
    const top = childRect.top - containerRect.top
    const height = childRect.height

    animate(
      barEl,
      { top, height, opacity: 1 },
      { type: 'spring', stiffness: 350, damping: 32, mass: 0.6 },
    )

    if (autoFollowRef.current) {
      const reduceMotion =
        typeof window !== 'undefined' &&
        !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      scrollToSegment(playingIndex, !reduceMotion)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barEl, contentEl, segments, playingIndex])

  useEffect(() => {
    const onUserScroll = () => {
      if (programmaticRef.current) return
      if (!autoFollowRef.current) return
      setTtsNarration({ autoFollow: false })
    }
    window.addEventListener('scroll', onUserScroll, { passive: true })
    return () => window.removeEventListener('scroll', onUserScroll)
  }, [])

  useEffect(() => {
    if (!autoFollow || playingIndex === null) return
    const reduceMotion =
      typeof window !== 'undefined' &&
      !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    scrollToSegment(playingIndex, !reduceMotion)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFollow])

  const revealRequest = useAtomValue(ttsRevealRequestAtom)
  useEffect(() => {
    if (revealRequest === 0 || playingIndex === null) return
    const reduceMotion =
      typeof window !== 'undefined' &&
      !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    scrollToSegment(playingIndex, !reduceMotion)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealRequest])

  if (!contentEl) return null

  return createPortal(
    <div
      aria-hidden
      className="tts-highlight-bar"
      ref={setBarEl}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        opacity: 0,
        pointerEvents: 'none',
        zIndex: 0,
        marginInline: '-1rem',
        background: 'color-mix(in srgb, var(--color-accent) 6%, transparent)',
      }}
    />,
    contentEl,
  )
}
