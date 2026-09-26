'use client'

import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

import { useOnlineCount } from '~/atoms'
import { useSocketIsConnect } from '~/atoms/hooks/socket'
import { PeekLink } from '~/components/modules/peek/PeekLink'
import { Divider } from '~/components/ui/divider'
import { FloatPopover } from '~/components/ui/float-popover'
import { SlotText } from '~/components/ui/slot-text'
import { usePageIsActive } from '~/hooks/common/use-is-active'
import { useIsClient } from '~/hooks/common/use-is-client'
import { clsxm } from '~/lib/helper'
import { getNoteRouteParams } from '~/lib/note-route'
import { apiClient } from '~/lib/request'
import { routeBuilder, Routes } from '~/lib/route-builder'

const ROTATE_MS = 8000

const useReadingRooms = (enabled: boolean) =>
  useQuery({
    queryKey: ['rooms'],
    enabled,
    staleTime: 1000 * 10,
    refetchInterval: 1000 * 30,
    queryFn: async () => {
      const data = (await apiClient.activity.getRoomsInfo()).$serialized
      const roomName = (id: string) => `article_${id}`
      const result = [] as { path: string; title: string; count: number }[]
      data.objects.notes.forEach((note) => {
        result.push({
          path: routeBuilder(Routes.Note, { ...getNoteRouteParams(note) }),
          title: note.title,
          count: data.roomCount[roomName(note.id)],
        })
      })
      data.objects.posts.forEach((post) => {
        result.push({
          path: routeBuilder(Routes.Post, {
            category: post.category.slug,
            slug: post.slug,
          }),
          title: post.title,
          count: data.roomCount[roomName(post.id)],
        })
      })
      data.objects.pages.forEach((page) => {
        result.push({
          path: routeBuilder(Routes.Page, { slug: page.slug }),
          title: page.title,
          count: data.roomCount[roomName(page.id)],
        })
      })
      return result.filter((r) => r.count > 0).sort((a, b) => b.count - a.count)
    },
  })

const Pulse = ({
  connected,
  className,
}: {
  connected: boolean
  className?: string
}) => (
  <span
    aria-hidden
    className={clsxm(
      'size-[5px] shrink-0 rounded-full',
      connected
        ? 'bg-accent motion-safe:animate-[footer-pulse_2.8s_ease-out_infinite]'
        : 'bg-neutral-5',
      className,
    )}
  />
)

export const Heartbeat = () => {
  const t = useTranslations('gateway')
  const isActive = usePageIsActive()
  const isClient = useIsClient()
  const count = useOnlineCount()
  const connected = useSocketIsConnect() && isClient
  const show = isClient && isActive

  const { data: rooms } = useReadingRooms(show && count > 0)
  const [index, setIndex] = useState(0)
  const roomsLength = rooms?.length ?? 0

  useEffect(() => {
    if (roomsLength <= 1) return
    const timer = setInterval(
      () => setIndex((i) => (i + 1) % roomsLength),
      ROTATE_MS,
    )
    return () => clearInterval(timer)
  }, [roomsLength])

  if (!show) return null
  const reading = count > 0 ? rooms?.[index % Math.max(roomsLength, 1)] : null

  return (
    <FloatPopover
      asChild
      mobileAsSheet
      as="div"
      offset={10}
      placement="top-end"
      trigger="both"
      triggerElement={
        <div className="flex cursor-pointer flex-col gap-0.5 whitespace-nowrap md:items-end">
          <span className="inline-flex items-baseline gap-1.5">
            <Pulse className="self-center" connected={connected} />
            <SlotText
              className="text-neutral-8"
              style={{ fontVariantNumeric: 'tabular-nums' }}
              text={String(count)}
            />
            <span>{t('reading_now')}</span>
          </span>
          <span className="block h-[1.6em] max-w-[22em] truncate text-neutral-8">
            {reading && <SlotText text={reading.title} />}
          </span>
        </div>
      }
    >
      <div className="w-72 space-y-2 text-copy-13 leading-relaxed text-neutral-7">
        <p className="flex items-center justify-between">
          <span>{connected ? t('connected') : t('disconnected')}</span>
          <Pulse className="size-1.5" connected={connected} />
        </p>
        <Divider />
        {rooms && rooms.length > 0 ? (
          <>
            <p className="font-medium text-neutral-8">{t('popular_content')}</p>
            <ul className="space-y-1">
              {rooms.map((room) => (
                <li
                  className="flex items-center justify-between gap-5"
                  key={room.path}
                >
                  <PeekLink
                    className="truncate text-neutral-8 hover:underline hover:decoration-current/30 hover:underline-offset-2"
                    href={room.path}
                  >
                    {room.title}
                  </PeekLink>
                  <span className="inline-flex shrink-0 items-center gap-1 text-neutral-6 tabular-nums">
                    <i className="i-mingcute-user-visible-line" />
                    {room.count}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p>{t('no_readers')}</p>
        )}
        <Divider />
        <p className="text-label-12 text-neutral-6">{t('websocket_intro')}</p>
      </div>
    </FloatPopover>
  )
}
