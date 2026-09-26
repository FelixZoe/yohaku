'use client'

import type { CommentModel, RequestError } from '@mx-space/api-client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ExtractAtomValue } from 'jotai'
import { atom, useAtomValue } from 'jotai'
import { atomWithStorage, selectAtom } from 'jotai/utils'
import { useTranslations } from 'next-intl'
import type { PropsWithChildren } from 'react'
import { use, useCallback } from 'react'

import { useIsOwnerLogged } from '~/atoms/hooks/owner'
import { useSessionReader } from '~/atoms/hooks/reader'
import { apiClient } from '~/lib/request'
import { getErrorMessageFromRequestError } from '~/lib/request.shared'
import { jotaiStore } from '~/lib/store'
import { toast } from '~/lib/toast'

import { insertCommentIntoListCache } from '../comment-cache'
import {
  moderationPendingKey,
  trackCommentModeration,
} from '../CommentModeration'
import type { CommentAnchor } from '../types'
import { MAX_COMMENT_TEXT_LENGTH } from './constants'
import type { createInitialValue } from './providers'
import {
  CommentBoxContext,
  CommentBoxLifeCycleContext,
  CommentCompactContext,
  CommentCompletedCallbackContext,
  CommentIsReplyContext,
  CommentOriginalRefIdContext,
} from './providers'

export const useCommentCompact = () => use(CommentCompactContext)
export const useUseCommentReply = () => use(CommentIsReplyContext)

const useCommentOriginalRefId = () => {
  const fallbackRefId = useAtomValue(use(CommentBoxContext).refId)
  return use(CommentOriginalRefIdContext) || fallbackRefId
}

const useCommentCompletedCallback = () => use(CommentCompletedCallbackContext)

export const useCommentBoxTextValue = () =>
  useAtomValue(use(CommentBoxContext).text)

export const useCommentBoxRefIdValue = () =>
  useAtomValue(use(CommentBoxContext).refId)

export const useGetCommentBoxAtomValues = () => use(CommentBoxContext)
const useCommentBoxLifeCycle = () => use(CommentBoxLifeCycleContext)

// ReactNode 导致 tsx 无法推断，过于复杂
const commentActionLeftSlotAtom = atom(null as PropsWithChildren['children'])
export const useCommentActionLeftSlot = () =>
  useAtomValue(commentActionLeftSlotAtom)

export const setCommentActionLeftSlot = (slot: PropsWithChildren['children']) =>
  jotaiStore.set(commentActionLeftSlotAtom, slot)

export const useCommentBoxHasText = () =>
  useAtomValue(
    selectAtom(
      use(CommentBoxContext).text,
      useCallback((v) => v.length > 0, []),
    ),
  )

export const useCommentBoxTextIsOversize = () =>
  useAtomValue(
    selectAtom(
      use(CommentBoxContext).text,
      useCallback((v) => v.length > MAX_COMMENT_TEXT_LENGTH, []),
    ),
  )
type CommentContextValue = ReturnType<typeof createInitialValue>

export const useSetCommentBoxValues = <
  T extends keyof CommentContextValue,
>() => {
  const ctx = use(CommentBoxContext)
  return useCallback(
    (key: T, value: ExtractAtomValue<CommentContextValue[T]>) => {
      const atom = ctx[key]
      if (!atom) throw new Error(`atom ${key} not found`)
      jotaiStore.set(atom as any, value)
    },
    [ctx],
  )
}

// Comment Mode

export const enum CommentBoxMode {
  legacy,
  'with-auth',
}

const commentModeAtom = atomWithStorage(
  'comment-mode',
  CommentBoxMode['with-auth'],
)

export const useCommentMode = () => useAtomValue(commentModeAtom)
export const setCommentMode = (mode: CommentBoxMode) =>
  jotaiStore.set(commentModeAtom, mode)

export const useSendComment = () => {
  const t = useTranslations('comment')
  const commentRefId = useCommentBoxRefIdValue()
  const {
    text: textAtom,
    author: authorAtom,
    mail: mailAtom,
    url: urlAtom,
    avatar: avatarAtom,

    anchor: anchorAtom,
    rejectedText: rejectedTextAtom,

    isWhisper: isWhisperAtom,
    syncToRecently: syncToRecentlyAtom,
  } = useGetCommentBoxAtomValues()
  const { afterSubmit } = useCommentBoxLifeCycle()
  const isOwnerLogged = useIsOwnerLogged()
  const sessionReader = useSessionReader()
  const isLogged = !!sessionReader
  const queryClient = useQueryClient()
  const isReply = useUseCommentReply()
  const originalRefId = useCommentOriginalRefId()
  const completedCallback = useCommentCompletedCallback()

  const wrappedCompletedCallback = <T extends CommentModel>(data: T): T => {
    if (data.moderation?.status !== 'rejected') completedCallback?.(data)
    return data
  }

  const { mutate, isPending } = useMutation({
    mutationFn: async (refId: string) => {
      const text = jotaiStore.get(textAtom)
      const author = jotaiStore.get(authorAtom)
      const mail = jotaiStore.get(mailAtom)
      const avatar = jotaiStore.get(avatarAtom)
      const url = jotaiStore.get(urlAtom)
      const anchor = jotaiStore.get(anchorAtom)

      const guestCommentDto: {
        text: string
        author: string
        mail: string
        avatar?: string
        url?: string
        isWhispers?: boolean
        anchor?: CommentAnchor
      } = {
        text,
        author,
        mail,
        avatar,
        url,
      }
      if (anchor) guestCommentDto.anchor = anchor

      // Omit empty string key
      Object.keys(guestCommentDto).forEach((key) => {
        // @ts-expect-error
        if (guestCommentDto[key] === '') delete guestCommentDto[key]
      })

      // Reply Comment
      if (isReply) {
        if (isLogged) {
          return apiClient.comment
            .readerReply(refId, {
              text,
              ...(jotaiStore.get(isWhisperAtom)
                ? { isWhispers: jotaiStore.get(isWhisperAtom) }
                : {}),
            })
            .then(wrappedCompletedCallback)
        } else {
          return apiClient.comment
            .guestReply(refId, guestCommentDto)
            .then(wrappedCompletedCallback)
        }
      }

      // Normal Comment
      const isWhisper = jotaiStore.get(isWhisperAtom)
      const syncToRecently = jotaiStore.get(syncToRecentlyAtom)

      if (isLogged) {
        return apiClient.comment
          .readerComment(refId, {
            text,
            ...(isWhisper ? { isWhispers: isWhisper } : {}),
            ...(anchor ? { anchor } : {}),
          })
          .then(async (res) => {
            if (syncToRecently && isOwnerLogged)
              apiClient.recently.proxy
                .post({
                  data: {
                    content: text,
                    ref: refId,
                  },
                })
                .then(() => {
                  toast.success(t('synced_to_thinking'))
                })

            return res
          })
          .then(wrappedCompletedCallback)
      }
      guestCommentDto.isWhispers = isWhisper
      return apiClient.comment
        .guestComment(refId, guestCommentDto)
        .then(wrappedCompletedCallback)
    },
    mutationKey: [commentRefId, 'comment'],
    onError(error: RequestError) {
      toast.error(getErrorMessageFromRequestError(error))
    },
    onSuccess(data) {
      const { moderation } = data
      if (moderation?.status === 'rejected') {
        jotaiStore.set(rejectedTextAtom, jotaiStore.get(textAtom))
        return
      }
      afterSubmit?.()

      const toastCopy = isLogged
        ? t('submit_success')
        : isReply
          ? t('reply_success')
          : t('comment_success')

      if (moderation?.status === 'pending')
        toast.info(t(moderationPendingKey(moderation.reviewer)))
      else toast.success(toastCopy)
      jotaiStore.set(textAtom, '')
      jotaiStore.set(anchorAtom, null)

      const created =
        data && typeof data === 'object' && 'id' in data
          ? (data as CommentModel)
          : null
      if (created?.id) {
        const { moderation: _receipt, ...publicComment } = created
        if (moderation?.status === 'pending' && moderation.receipt)
          trackCommentModeration(
            originalRefId,
            publicComment,
            moderation.receipt,
            moderation.reviewer,
          )
        insertCommentIntoListCache(
          queryClient,
          originalRefId,
          { ...publicComment, new: true },
          sessionReader
            ? {
                id: sessionReader.id,
                email: sessionReader.email,
                name: sessionReader.name,
                handle: sessionReader.handle ?? '',
                image: sessionReader.image,
                role: sessionReader.isOwner ? 'owner' : 'reader',
              }
            : null,
        )
      }
    },
  })

  return [
    useCallback(() => mutate(commentRefId), [commentRefId, mutate]),
    isPending,
  ] as const
}
