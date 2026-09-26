import { RequestError } from '@mx-space/api-client'

import { apiClient } from '~/lib/request'
import { defineQuery } from '~/queries/helper'

const MAX_TOPIC_ID = 9_223_372_036_854_775_807n
const isTopicId = (identifier: string) =>
  /^[1-9]\d{0,18}$/.test(identifier) && BigInt(identifier) <= MAX_TOPIC_ID

export const getTopicQuery = (topicIdentifier: string, locale?: string) =>
  defineQuery({
    queryKey: ['topic', topicIdentifier, locale],
    queryFn: async ({ queryKey }) => {
      const [, identifier] = queryKey
      if (!isTopicId(identifier!)) {
        return (await apiClient.topic.getTopicBySlug(identifier!)).$serialized
      }

      try {
        return (await apiClient.topic.getById(identifier!)).$serialized
      } catch (error) {
        if (!(error instanceof RequestError) || error.status !== 404) {
          throw error
        }

        return (await apiClient.topic.getTopicBySlug(identifier!)).$serialized
      }
    },
  })
