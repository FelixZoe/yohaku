import { RequestError, type TopicModel } from '@mx-space/api-client'
import { QueryClient } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { apiClient } from '~/lib/request'

import { getTopicQuery } from './query'

vi.mock('~/lib/request', () => ({
  apiClient: {
    topic: {
      getById: vi.fn(),
      getTopicBySlug: vi.fn(),
    },
  },
}))

const topic = {
  id: '133259626408329218',
  name: 'Topic',
  slug: 'topic-slug',
} as TopicModel

describe('getTopicQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('resolves an entity identifier by id without calling the slug endpoint', async () => {
    vi.mocked(apiClient.topic.getById).mockResolvedValueOnce({
      $serialized: topic,
    } as never)

    const queryClient = new QueryClient()
    const result = await queryClient.fetchQuery(getTopicQuery(topic.id))

    expect(result).toBe(topic)
    expect(apiClient.topic.getById).toHaveBeenCalledWith(topic.id)
    expect(apiClient.topic.getTopicBySlug).not.toHaveBeenCalled()
  })

  it('resolves a textual identifier by slug', async () => {
    vi.mocked(apiClient.topic.getTopicBySlug).mockResolvedValueOnce({
      $serialized: topic,
    } as never)

    const queryClient = new QueryClient()
    const result = await queryClient.fetchQuery(getTopicQuery(topic.slug))

    expect(result).toBe(topic)
    expect(apiClient.topic.getTopicBySlug).toHaveBeenCalledWith(topic.slug)
    expect(apiClient.topic.getById).not.toHaveBeenCalled()
  })

  it('falls back to slug when an id-shaped slug has no matching entity id', async () => {
    const numericSlug = '2024'
    vi.mocked(apiClient.topic.getById).mockRejectedValueOnce(
      new RequestError(
        'Topic not found',
        404,
        `/topics/${numericSlug}`,
        null,
        'TOPIC_NOT_FOUND',
      ),
    )
    vi.mocked(apiClient.topic.getTopicBySlug).mockResolvedValueOnce({
      $serialized: topic,
    } as never)

    const queryClient = new QueryClient()
    const result = await queryClient.fetchQuery(getTopicQuery(numericSlug))

    expect(result).toBe(topic)
    expect(apiClient.topic.getById).toHaveBeenCalledWith(numericSlug)
    expect(apiClient.topic.getTopicBySlug).toHaveBeenCalledWith(numericSlug)
  })

  it('does not hide a non-404 id request failure with a slug lookup', async () => {
    const error = new RequestError(
      'Service unavailable',
      503,
      `/topics/${topic.id}`,
      null,
    )
    vi.mocked(apiClient.topic.getById).mockRejectedValueOnce(error)

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    await expect(queryClient.fetchQuery(getTopicQuery(topic.id))).rejects.toBe(
      error,
    )
    expect(apiClient.topic.getTopicBySlug).not.toHaveBeenCalled()
  })
})
