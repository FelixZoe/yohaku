import { describe, expect, it } from 'vitest'

import { EventTypes } from '~/types/events'

import { handlerMap } from './handler'

describe('socket event routing', () => {
  it('keys every handler by an event the worker subscribes to', () => {
    const subscribed = new Set<string>(Object.values(EventTypes))

    expect(
      Object.keys(handlerMap).filter((event) => !subscribed.has(event)),
    ).toEqual([])
  })
})
