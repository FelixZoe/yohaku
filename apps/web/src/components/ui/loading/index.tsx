'use client'

import { m } from 'motion/react'
import { useLocale, useTranslations } from 'next-intl'
import { useRef } from 'react'

import { useIsClient } from '~/hooks/common/use-is-client'
import { clsxm } from '~/lib/helper'
import { sample } from '~/lib/lodash'

import { LoadingMark } from './LoadingMark'

export { LoadingMark } from './LoadingMark'
export { Spinner } from './Spinner'

type LoadingProps = {
  loadingText?: string
  useDefaultLoadingText?: boolean
}

type AnimatedLoadingTextProps = {
  locale: string
  text: string
  className?: string
}

type CenterRevealLoadingTextProps = {
  text: string
  className?: string
}

const inkEase = [0.22, 1, 0.36, 1] as const

const getDefaultLoadingText = (items: string[]) => items[0] ?? ''

const useSampledLoadingText = (items: string[], locale: string) => {
  const isClient = useIsClient()
  const fallback = getDefaultLoadingText(items)
  const sampledTextRef = useRef<{ locale: string; text: string } | null>(null)

  if (!isClient) return fallback

  if (sampledTextRef.current?.locale !== locale) {
    sampledTextRef.current = {
      locale,
      text: sample(items) ?? fallback,
    }
  }

  return sampledTextRef.current.text
}

const tokenizeLoadingText = (text: string, locale: string) => {
  if (locale === 'zh' || locale === 'zh-TW') {
    return Array.from(text).map((value, index) => ({
      key: `${index}-${value}`,
      value,
      delay: index * 0.03,
      initial: { opacity: 0, y: 4, filter: 'blur(2px)' },
      animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    }))
  }

  if (locale === 'ja') {
    return text.split(/\u3000+/).map((value, index, arr) => ({
      key: `${index}-${value}`,
      value: index === arr.length - 1 ? value : `${value}\u3000`,
      delay: index * 0.11,
      initial: { opacity: 0, y: 3, filter: 'blur(2px)' },
      animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    }))
  }

  return (text.match(/\S+\s*/g) ?? [text]).map((value, index) => ({
    key: `${index}-${value}`,
    value,
    delay: index * 0.06,
    initial: { opacity: 0.15, x: 3, filter: 'blur(2px)' },
    animate: { opacity: 1, x: 0, filter: 'blur(0px)' },
  }))
}

const AnimatedLoadingText = ({
  locale,
  text,
  className,
}: AnimatedLoadingTextProps) => {
  const tokens = tokenizeLoadingText(text, locale)

  return (
    <m.span
      animate={{ opacity: [0.9, 1, 0.94] }}
      className={clsxm(
        'mt-6 block max-w-[32rem] text-center text-copy-13 leading-7 text-neutral-10/80',
        className,
      )}
      transition={{
        delay: 0.6,
        duration: 2.4,
        ease: 'easeInOut',
        repeat: Infinity,
        repeatType: 'mirror',
      }}
    >
      {tokens.map((token) => (
        <m.span
          animate={token.animate}
          className="inline-block whitespace-pre"
          initial={token.initial}
          key={token.key}
          transition={{
            duration: 0.36,
            ease: inkEase,
            delay: token.delay,
          }}
        >
          {token.value}
        </m.span>
      ))}
    </m.span>
  )
}

const CenterRevealLoadingText = ({
  text,
  className,
}: CenterRevealLoadingTextProps) => {
  return (
    <m.span
      animate={{
        opacity: 1,
        filter: 'blur(0px)',
        clipPath: 'inset(0 0% 0 0%)',
      }}
      className={clsxm(
        'mt-2 block max-w-[28rem] overflow-hidden text-center text-copy-13 leading-7 whitespace-pre text-neutral-8',
        className,
      )}
      initial={{
        opacity: 0.24,
        filter: 'blur(8px)',
        clipPath: 'inset(0 50% 0 50%)',
      }}
      transition={{
        delay: 0.12,
        duration: 0.92,
        ease: inkEase,
      }}
    >
      {text}
    </m.span>
  )
}

const capillaryRipplePauseDuration = 0.42
const ring1IntroDuration = 1.02
const ring2IntroDuration = 1.24
const capillaryRippleOutDuration = 1.35
const capillaryRippleOutStagger = 0.42

const capillaryCycleDuration =
  ring2IntroDuration +
  capillaryRipplePauseDuration +
  capillaryRippleOutStagger +
  capillaryRippleOutDuration

const capillaryT = capillaryCycleDuration

const ring1IntroMid = (0.72 * ring1IntroDuration) / capillaryT
const ring1IntroEnd = ring1IntroDuration / capillaryT
const ring2IntroMid = (0.74 * ring2IntroDuration) / capillaryT
const ring2IntroEnd = ring2IntroDuration / capillaryT
const capillaryPauseEnd =
  (ring2IntroDuration + capillaryRipplePauseDuration) / capillaryT
const capillaryRing1OutroEnd =
  (ring2IntroDuration +
    capillaryRipplePauseDuration +
    capillaryRippleOutDuration) /
  capillaryT
const capillaryRing2OutroStart =
  (ring2IntroDuration +
    capillaryRipplePauseDuration +
    capillaryRippleOutStagger) /
  capillaryT

const CapillaryInkLoadingMark = () => {
  return (
    <div aria-hidden className="relative size-[11rem]">
      <m.span
        className="absolute left-1/2 top-1/2 size-[18px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-neutral-10"
        initial={{ scale: 0.18, opacity: 0, filter: 'blur(1px)' }}
        animate={{
          scale: [0.18, 1.06, 1],
          opacity: [0, 1, 1],
          filter: ['blur(1px)', 'blur(0px)', 'blur(0px)'],
        }}
        transition={{
          duration: 0.34,
          delay: 0.04,
          ease: inkEase,
          times: [0, 0.7, 1],
        }}
      />

      <m.span
        className="absolute left-1/2 top-1/2 size-[78px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-neutral-10/15 will-change-[transform,opacity,filter]"
        animate={{
          scale: [0.14, 1.04, 1, 1, 1.38, 0.14],
          opacity: [0, 0.95, 1, 1, 0, 0],
          filter: [
            'blur(0px)',
            'blur(0.2px)',
            'blur(0.2px)',
            'blur(0.2px)',
            'blur(18px)',
            'blur(0px)',
          ],
        }}
        transition={{
          duration: capillaryCycleDuration,
          delay: 0.18,
          ease: inkEase,
          repeat: Infinity,
          times: [
            0,
            ring1IntroMid,
            ring1IntroEnd,
            capillaryPauseEnd,
            capillaryRing1OutroEnd,
            1,
          ],
        }}
      />

      <m.span
        className="absolute left-1/2 top-1/2 size-[116px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-neutral-10/12 will-change-[transform,opacity,filter]"
        animate={{
          scale: [0.12, 1.03, 1, 1, 1, 1.34, 0.12],
          opacity: [0, 0.85, 1, 1, 1, 0, 0],
          filter: [
            'blur(0px)',
            'blur(0.2px)',
            'blur(0.2px)',
            'blur(0.2px)',
            'blur(0.2px)',
            'blur(16px)',
            'blur(0px)',
          ],
        }}
        transition={{
          duration: capillaryCycleDuration,
          delay: 0.32,
          ease: inkEase,
          repeat: Infinity,
          times: [
            0,
            ring2IntroMid,
            ring2IntroEnd,
            capillaryPauseEnd,
            capillaryRing2OutroStart,
            0.995,
            1,
          ],
        }}
      />

      <m.span
        className="absolute left-1/2 top-1/2 size-[152px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-neutral-10/[0.07] blur-2xl"
        initial={{ scale: 0.26, opacity: 0 }}
        animate={{
          scale: [0.26, 1.03, 1],
          opacity: [0, 0.82, 1],
        }}
        transition={{
          duration: 1.38,
          delay: 0.26,
          ease: inkEase,
          times: [0, 0.72, 1],
        }}
      />
    </div>
  )
}

export const Loading: Component<LoadingProps> = ({
  loadingText,
  className,
  useDefaultLoadingText = false,
}) => {
  const locale = useLocale()
  const t = useTranslations('common')
  const defaultLoadingText = useSampledLoadingText(
    t.raw('loading_default') as string[],
    locale,
  )
  const nextLoadingText = useDefaultLoadingText
    ? defaultLoadingText
    : loadingText
  return (
    <div
      data-hide-print
      className={clsxm(
        'my-10 flex items-center scale-[0.85] lg:scale-100 justify-center gap-3',
        className,
      )}
    >
      <LoadingMark cycle={2600} rings={2} size="md" />
      {!!nextLoadingText && (
        <AnimatedLoadingText
          className="mt-0 max-w-[24rem] text-left text-copy-13 leading-6 text-neutral-10/68"
          locale={locale}
          text={nextLoadingText}
        />
      )}
    </div>
  )
}

export const FullPageLoading = () => {
  const locale = useLocale()
  const t = useTranslations('common')
  const defaultLoadingText = useSampledLoadingText(
    t.raw('loading_default') as string[],
    locale,
  )

  return (
    <div
      data-hide-print
      className="flex min-h-[60svh] w-full items-center justify-center py-16"
    >
      <div className="flex max-w-[100vw] flex-col items-center px-6">
        <CapillaryInkLoadingMark />
        <CenterRevealLoadingText text={defaultLoadingText} />
      </div>
    </div>
  )
}
