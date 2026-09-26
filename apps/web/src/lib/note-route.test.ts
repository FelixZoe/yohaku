import { describe, expect, it } from 'vitest'

import { buildNotePath, parseNotePath } from './note-route'

describe('buildNotePath', () => {
  it('prefers the slug route when slug and created exist', () => {
    expect(
      buildNotePath({
        nid: 42,
        slug: 'hello-note',
        createdAt: '2026-03-14T12:00:00.000Z',
      }),
    ).toBe('/notes/2026/3/14/hello-note')
  })

  it('falls back to the nid route when slug data is missing', () => {
    expect(
      buildNotePath({
        nid: 42,
      }),
    ).toBe('/notes/42')
  })

  it('falls back to the nid route when the creation date is unavailable', () => {
    expect(
      buildNotePath({
        nid: 42,
        slug: 'hello-note',
      }),
    ).toBe('/notes/42')

    expect(
      buildNotePath({
        nid: 42,
        slug: 'hello-note',
        createdAt: 'not-a-date',
      }),
    ).toBe('/notes/42')
  })

  it('preserves the password query string', () => {
    expect(
      buildNotePath({
        nid: 42,
        slug: 'hello-note',
        createdAt: '2026-03-14T12:00:00.000Z',
        password: 'open sesame',
      }),
    ).toBe('/notes/2026/3/14/hello-note?password=open+sesame')
  })
})

describe('parseNotePath', () => {
  it('parses a nid path', () => {
    expect(parseNotePath('/notes/42')).toEqual({ kind: 'nid', nid: 42 })
  })

  it('parses a slug-date path', () => {
    expect(
      parseNotePath('/notes/2026/6/13/first-time-tokyo-26-years-late-trip'),
    ).toEqual({
      kind: 'slug',
      year: 2026,
      month: 6,
      day: 13,
      slug: 'first-time-tokyo-26-years-late-trip',
    })
  })

  it('extracts the password query', () => {
    expect(parseNotePath('/notes/42?password=open+sesame')).toEqual({
      kind: 'nid',
      nid: 42,
      password: 'open sesame',
    })
    expect(
      parseNotePath('/notes/2026/3/14/hello-note?password=open+sesame'),
    ).toEqual({
      kind: 'slug',
      year: 2026,
      month: 3,
      day: 14,
      slug: 'hello-note',
      password: 'open sesame',
    })
  })

  it('round-trips buildNotePath output', () => {
    expect(
      parseNotePath(
        buildNotePath({
          nid: 42,
          slug: 'hello-note',
          createdAt: '2026-03-14T12:00:00.000Z',
        }),
      ),
    ).toEqual({
      kind: 'slug',
      year: 2026,
      month: 3,
      day: 14,
      slug: 'hello-note',
    })
    expect(parseNotePath(buildNotePath({ nid: 42 }))).toEqual({
      kind: 'nid',
      nid: 42,
    })
  })

  it('rejects non-note and malformed paths', () => {
    expect(parseNotePath('/posts/tech/hello')).toBeNull()
    expect(parseNotePath('/notes')).toBeNull()
    expect(parseNotePath('/notes/')).toBeNull()
    expect(parseNotePath('/notes/abc')).toBeNull()
    expect(parseNotePath('/notes/latest')).toBeNull()
    expect(parseNotePath('/notes/series/hello')).toBeNull()
    expect(parseNotePath('/notes/2026/6/slug')).toBeNull()
    expect(parseNotePath('/notes/2026/13/1/slug')).toBeNull()
  })
})
