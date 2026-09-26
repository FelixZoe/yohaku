import { buildNSKey } from '~/lib/ns'

export const PRESENCE_CARD_KEY = buildNSKey('presence-card')

export type PresenceCard = {
  name: string
  image: string
}

export function buildPresenceCard(input: {
  name?: string | null
  image?: string | null
}): PresenceCard | null {
  const name = input.name?.trim() ?? ''
  const imageRaw = input.image?.trim() ?? ''
  const image = imageRaw.startsWith('https://') ? imageRaw.slice(0, 2048) : ''
  if (!name && !image) return null
  return {
    name: name.slice(0, 50),
    image,
  }
}

export function readPresenceCard(
  storage:
    Pick<Storage, 'getItem'> | null | undefined = globalThis.localStorage,
): PresenceCard | null {
  if (!storage) return null
  try {
    const raw = storage.getItem(PRESENCE_CARD_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { name?: unknown; image?: unknown }
    return buildPresenceCard({
      name: typeof parsed.name === 'string' ? parsed.name : '',
      image: typeof parsed.image === 'string' ? parsed.image : '',
    })
  } catch {
    return null
  }
}

export function writePresenceCard(
  input: { name?: string | null; image?: string | null },
  storage:
    Pick<Storage, 'setItem'> | null | undefined = globalThis.localStorage,
): PresenceCard | null {
  const card = buildPresenceCard(input)
  if (!card || !storage) return card
  storage.setItem(PRESENCE_CARD_KEY, JSON.stringify(card))
  return card
}

export function resolvePresenceUpdate({
  isOwnerLogged,
  ownerName,
  session,
  card,
  commentName,
}: {
  isOwnerLogged: boolean
  ownerName?: string | null
  session?: { name?: string | null; image?: string | null } | null
  card?: PresenceCard | null
  commentName?: string
}): {
  displayName?: string
  image?: string
} {
  if (isOwnerLogged) {
    return {
      displayName: ownerName?.trim() || undefined,
      image: session?.image || card?.image || undefined,
    }
  }

  if (session) {
    return {
      displayName:
        session.name?.trim() || card?.name || commentName?.trim() || undefined,
      image: session.image || card?.image || undefined,
    }
  }

  return {
    displayName: card?.name || commentName?.trim() || undefined,
    image: card?.image || undefined,
  }
}

export function resolvePresenceAvatar({
  readerImage,
  presenceImage,
}: {
  readerImage?: string | null
  presenceImage?: string | null
}): string | undefined {
  return readerImage || presenceImage || undefined
}
