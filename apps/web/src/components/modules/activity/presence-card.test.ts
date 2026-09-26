import { describe, expect, it } from 'vitest'

import {
  buildPresenceCard,
  resolvePresenceAvatar,
  resolvePresenceUpdate,
} from './presence-card'

describe('buildPresenceCard', () => {
  it('keeps a https name/image pair', () => {
    expect(
      buildPresenceCard({
        name: ' Magren ',
        image: 'https://avatars.githubusercontent.com/u/1?v=4',
      }),
    ).toEqual({
      name: 'Magren',
      image: 'https://avatars.githubusercontent.com/u/1?v=4',
    })
  })

  it('drops non-https images and empty cards', () => {
    expect(
      buildPresenceCard({
        name: '',
        image: 'http://example.com/a.png',
      }),
    ).toBeNull()
    expect(buildPresenceCard({ name: 'Xu Liu', image: '' })).toEqual({
      name: 'Xu Liu',
      image: '',
    })
  })
})

describe('resolvePresenceUpdate', () => {
  it('uses the session card while logged in and the stored card when not', () => {
    expect(
      resolvePresenceUpdate({
        isOwnerLogged: false,
        session: {
          name: 'Magren',
          image: 'https://avatars.githubusercontent.com/u/1?v=4',
        },
        card: { name: 'old', image: 'https://example.com/old.png' },
        commentName: 'comment',
      }),
    ).toEqual({
      displayName: 'Magren',
      image: 'https://avatars.githubusercontent.com/u/1?v=4',
    })

    expect(
      resolvePresenceUpdate({
        isOwnerLogged: false,
        session: null,
        card: {
          name: 'Magren',
          image: 'https://avatars.githubusercontent.com/u/1?v=4',
        },
        commentName: 'comment',
      }),
    ).toEqual({
      displayName: 'Magren',
      image: 'https://avatars.githubusercontent.com/u/1?v=4',
    })
  })
})

describe('resolvePresenceAvatar', () => {
  it('prefers the authenticated reader image over the presence card', () => {
    expect(
      resolvePresenceAvatar({
        readerImage: 'https://a.example/r.png',
        presenceImage: 'https://a.example/p.png',
      }),
    ).toBe('https://a.example/r.png')
    expect(
      resolvePresenceAvatar({
        readerImage: undefined,
        presenceImage: 'https://a.example/p.png',
      }),
    ).toBe('https://a.example/p.png')
  })
})
