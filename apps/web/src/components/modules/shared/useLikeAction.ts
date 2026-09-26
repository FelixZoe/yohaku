'use client'

import { useCallback, useEffect, useState } from 'react'

import { isLikedBefore, setLikeId } from '~/lib/cookie'
import { apiClient } from '~/lib/request'

export const useLikeAction = ({
  enabled = true,
  id,
  initialCount,
  kind,
  onLiked,
}: {
  enabled?: boolean
  id: string
  initialCount: number
  kind: 'Note' | 'Post'
  onLiked: () => void
}) => {
  const [isLiked, setIsLiked] = useState(() => !!id && isLikedBefore(id))
  const [likeCount, setLikeCount] = useState(initialCount)

  useEffect(() => {
    setIsLiked(!!id && isLikedBefore(id))
  }, [id, initialCount])

  useEffect(() => {
    setLikeCount(initialCount)
  }, [id, initialCount])

  const handleLike = useCallback(() => {
    if (!id) return
    if (!enabled) return
    if (isLiked) return

    apiClient.activity.likeIt(kind, id).then(() => {
      setLikeId(id)
      onLiked()
      setIsLiked(true)
      setLikeCount((count) => count + 1)
    })
  }, [enabled, id, isLiked, kind, onLiked])

  return { handleLike, isLiked, likeCount }
}
