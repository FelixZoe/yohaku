'use client'

import type {
  PollDataAdapter,
  PollState,
} from '@haklex/rich-compose/modules/poll'
import { useSyncExternalStore } from 'react'

const seedTallies: Record<string, Record<string, number>> = {
  p_demo_single: { o_ragdoll: 412, o_amshort: 287, o_orange: 158 },
  p_demo_multi: { o_cat: 893, o_dog: 1124, o_hamster: 142, o_fish: 309 },
}

const totalOf = (tallies: Record<string, number>) =>
  Object.values(tallies).reduce((acc, n) => acc + n, 0)

class PollMockBackend {
  private store = new Map<string, PollState>()
  private listeners = new Set<() => void>()

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getState = (pollId: string): PollState => {
    let current = this.store.get(pollId)
    if (!current) {
      const tallies = { ...seedTallies[pollId] }
      current = {
        canVote: true,
        closed: false,
        status: 'ready',
        tallies,
        totalVotes: totalOf(tallies),
      }
      this.store.set(pollId, current)
    }
    return current
  }

  submit = async (pollId: string, optionIds: string[]) => {
    await new Promise((resolve) => setTimeout(resolve, 200))
    const current = this.getState(pollId)
    const tallies = { ...current.tallies }
    for (const id of optionIds) {
      tallies[id] = (tallies[id] ?? 0) + 1
    }
    this.store.set(pollId, {
      ...current,
      canVote: true,
      status: 'ready',
      tallies,
      totalVotes: totalOf(tallies),
      userVote: optionIds,
    })
    for (const listener of this.listeners) listener()
  }
}

const backend = new PollMockBackend()

export const mockPollAdapter: PollDataAdapter = {
  usePollState: (pollId) =>
    useSyncExternalStore(
      backend.subscribe,
      () => backend.getState(pollId),
      () => backend.getState(pollId),
    ),
  useSubmit: (pollId) => (optionIds) => backend.submit(pollId, optionIds),
}
