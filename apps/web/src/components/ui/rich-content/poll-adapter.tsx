'use client'

import type {
  PollDataAdapter,
  PollState,
} from '@haklex/rich-compose/modules/poll'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { parsePollState } from '@yohaku/rich-content/src/lexical/biz/poll/parse-state.ts'

import { webFetchJSON } from '~/hooks/common/use-web-host'

const pollKey = (pollId: string) => ['poll', pollId] as const

const fallbackState: PollState = {
  tallies: {},
  totalVotes: 0,
  status: 'loading',
  closed: false,
  canVote: false,
}

const fetchState = async (pollId: string): Promise<PollState> =>
  parsePollState(await webFetchJSON<unknown>(`/polls/${pollId}`))

const castVote = async (
  pollId: string,
  optionIds: string[],
): Promise<PollState> =>
  parsePollState(
    await webFetchJSON<unknown>(`/polls/${pollId}/vote`, {
      body: JSON.stringify({ optionIds }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    }),
  )

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
