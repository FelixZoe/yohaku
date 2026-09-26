'use client'

import type { TopicModel } from '@mx-space/api-client'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { isHydrationEnded } from '~/components/common/HydrationEndDetector'
import { FloatPopover } from '~/components/ui/float-popover'
import { useIsDark } from '~/hooks/common/use-is-dark'
import { Link } from '~/i18n/navigation'
import { topicColors, topicWarmHue } from '~/lib/color'
import { clsxm } from '~/lib/helper'
import { routeBuilder, Routes } from '~/lib/route-builder'
import { useCurrentNoteDataSelector } from '~/providers/note/CurrentNoteDataProvider'

import { NoteTopicAvatar } from './NoteTopicAvatar'
import { NoteTopicDetail } from './NoteTopicDetail'

export const NoteTopicBinderClip = ({
  topic: topicProp,
}: {
  topic?: TopicModel
} = {}) => {
  const contextTopic = useCurrentNoteDataSelector((state) => state?.data.topic)
  const topic = topicProp ?? contextTopic
  const isDark = useIsDark()
  const [shouldAnimate] = useState(() => isHydrationEnded())

  if (!topic) return null

  const c = topicColors(topic.name, isDark)
  const hue = topicWarmHue(topic.name)
  const clipWidth = Math.max(72, topic.name.length * 8 + 28)
  const topicHref = routeBuilder(Routes.NoteTopic, { slug: topic.slug })

  return (
    <FloatPopover
      offset={8}
      placement="bottom-start"
      triggerElement={
        <Link className="group block" href={topicHref}>
          {/* Clip body — horizontal bar */}
          <div className="flex">
            {/* Left edge — clip thickness/fold wrapping around paper */}
            <div
              className="w-[5px] shrink-0 transition-all duration-200 group-hover:brightness-115"
              style={{
                background: `linear-gradient(90deg, ${c.to} 0%, ${c.mid} 100%)`,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
              }}
            />
            {/* Main face */}
            <div
              className="relative flex flex-1 items-center justify-center rounded-br-[6px] rounded-tr-[6px] transition-all duration-200 group-hover:brightness-115"
              style={{
                width: `${clipWidth}px`,
                height: 30,
                background: `linear-gradient(135deg, ${c.from} 0%, ${c.mid} 40%, ${c.to} 100%)`,
                boxShadow:
                  'inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.15)',
              }}
            >
              {/* Inner bevel highlight */}
              <span
                className="pointer-events-none absolute inset-x-1.5 top-0.5 h-px"
                style={{
                  background:
                    'linear-gradient(90deg, rgba(255,255,255,0.05), rgba(255,255,255,0.15), rgba(255,255,255,0.05))',
                }}
              />
              <span className="text-label-12 font-semibold leading-none tracking-wider text-white/90 drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]">
                {topic.name}
              </span>
            </div>
          </div>

          {/* Vertical tab — clip side profile wrapping down paper edge */}
          <div
            className="relative h-7 w-[5px] rounded-br-[3px] transition-all duration-200 group-hover:brightness-115"
            style={{
              background: `linear-gradient(180deg, ${c.to} 0%, hsl(${hue}, 30%, ${isDark ? 38 : 28}%) 100%)`,
              boxShadow: '1px 1px 3px rgba(0,0,0,0.15)',
            }}
          />
        </Link>
      }
      wrapperClassName={clsxm(
        'absolute -left-[3px] -top-[3px] z-[2] hidden lg:block print:hidden!',
        shouldAnimate && 'note-binder-clip-entering',
      )}
    >
      <NoteTopicDetail topic={topic} />
    </FloatPopover>
  )
}

export const NoteTopicInlineTag = ({
  topic: topicProp,
}: {
  topic?: TopicModel
} = {}) => {
  const t = useTranslations('note')
  const contextTopic = useCurrentNoteDataSelector((state) => state?.data.topic)
  const topic = topicProp ?? contextTopic
  const isDark = useIsDark()

  if (!topic) return null

  const hue = topicWarmHue(topic.name)

  return (
    <div className="mb-3 lg:hidden">
      <FloatPopover
        mobileAsSheet
        sheet={{
          title: topic.name,
          triggerAsChild: true,
        }}
        triggerElement={
          <button
            className="inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-label-12 leading-none text-neutral-7 transition-transform duration-200 active:translate-y-px"
            type="button"
            style={{
              backgroundColor: `hsla(${hue}, 35%, ${isDark ? 42 : 52}%, ${isDark ? 0.14 : 0.1})`,
              borderColor: `hsla(${hue}, 32%, ${isDark ? 64 : 42}%, ${isDark ? 0.28 : 0.16})`,
              color: `hsl(${hue}, 24%, ${isDark ? 86 : 30}%)`,
            }}
          >
            <NoteTopicAvatar
              alt={t('topic_avatar_alt', { name: topic.name })}
              className="shrink-0 ring-1 ring-black/5"
              icon={topic.icon}
              name={topic.name}
              size={18}
            />
            <span className="max-w-[60vw] truncate font-medium">
              {topic.name}
            </span>
          </button>
        }
      >
        <NoteTopicDetail topic={topic} />
      </FloatPopover>
    </div>
  )
}
