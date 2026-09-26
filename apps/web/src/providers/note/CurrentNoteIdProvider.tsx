'use client'

import { atom, useAtomValue, useSetAtom } from 'jotai'
import type { FC, PropsWithChildren } from 'react'
import { memo, useCallback, useEffect } from 'react'

import { useBeforeMounted } from '~/hooks/common/use-before-mounted'
import { jotaiStore } from '~/lib/store'

const currentNoteNidAtom = atom<null | string>(null)
const pendingNoteNidAtom = atom<null | string>(null)
const activeNoteNidAtom = atom(
  (get) => get(pendingNoteNidAtom) ?? get(currentNoteNidAtom),
)
const noteNavigationPendingAtom = atom((get) => {
  const pendingNid = get(pendingNoteNidAtom)
  return !!pendingNid && pendingNid !== get(currentNoteNidAtom)
})

const normalizeNoteNid = (nid: number | string | null | undefined) =>
  nid === null || nid === undefined ? null : nid.toString()

export const CurrentNoteNidProvider: FC<
  {
    nid: string
  } & PropsWithChildren
> = memo(({ nid, children }) => {
  const setNoteId = useSetAtom(currentNoteNidAtom)
  const setPendingNoteNid = useSetAtom(pendingNoteNidAtom)
  // useHydrateAtoms([[currentNoteNidAtom, nid]], {
  //   dangerouslyForceHydrate: true,
  // })
  useBeforeMounted(() => {
    // setNoteId(noteId)
    jotaiStore.set(currentNoteNidAtom, nid)
    if (jotaiStore.get(pendingNoteNidAtom) === nid) {
      jotaiStore.set(pendingNoteNidAtom, null)
    }
  })

  useEffect(() => {
    setNoteId(nid)
    setPendingNoteNid((pendingNid) => (pendingNid === nid ? null : pendingNid))
  }, [nid, setNoteId, setPendingNoteNid])

  return children
})
CurrentNoteNidProvider.displayName = 'CurrentNoteIdProvider'

export const useCurrentNoteNid = () => useAtomValue(currentNoteNidAtom)

export const useActiveNoteNid = () => useAtomValue(activeNoteNidAtom)

export const useIsNoteNavigationPending = () =>
  useAtomValue(noteNavigationPendingAtom)

export const useBeginNoteNavigation = () => {
  const currentNoteNid = useCurrentNoteNid()
  const setPendingNoteNid = useSetAtom(pendingNoteNidAtom)

  return useCallback(
    (nid: number | string) => {
      const nextNid = normalizeNoteNid(nid)
      setPendingNoteNid(nextNid === currentNoteNid ? null : nextNid)
    },
    [currentNoteNid, setPendingNoteNid],
  )
}
