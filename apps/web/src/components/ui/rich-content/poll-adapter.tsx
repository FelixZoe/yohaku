'use client'

import type {
  PollDataAdapter,
  PollState,
} from '@haklex/rich-compose/modules/poll'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '~/lib/request'

const pollKey = (pollId: string) => ['poll', pollId] as const

const fallbackState: PollState = {
  tallies: {},
  totalVotes: 0,
  status: 'loading',
  closed: false,
  canVote: false,
}

const fetchState = (pollId: string): Promise<PollState> =>
  apiClient.proxy.polls(pollId).get<PollState>({ transformResponse: false })

const castVote = (pollId: string, optionIds: string[]): Promise<PollState> =>
  apiClient.proxy.polls(pollId).vote.post<PollState>({
    data: { optionIds },
    transformResponse: false,
  })

export const yohakuPollAdapter: PollDataAdapter = {
  usePollState: (pollId) => {
    const { data } = useQuery({
      queryKey: pollKey(pollId),
      queryFn: () => fetchState(pollId),
      staleTime: 30_000,
    })
    return data ?? fallbackState
  },
  useSubmit: (pollId) => {
    const qc = useQueryClient()
    const mutation = useMutation({
      mutationFn: (optionIds: string[]) => castVote(pollId, optionIds),
      onSuccess: (next) => qc.setQueryData(pollKey(pollId), next),
    })
    return async (optionIds) => {
      await mutation.mutateAsync(optionIds)
    }
  },
}
