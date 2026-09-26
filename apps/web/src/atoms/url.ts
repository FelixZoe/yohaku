import { atom } from 'jotai'

import { jotaiStore } from '~/lib/store'

export const adminUrlAtom = atom<string | null>(null)
const webUrlAtom = atom<string | null>(null)

export const getWebUrl = () => jotaiStore.get(webUrlAtom)
export const setWebUrl = (url: string) => jotaiStore.set(webUrlAtom, url)
export const getAdminUrl = () => jotaiStore.get(adminUrlAtom)
export const setAdminUrl = (url: string) => jotaiStore.set(adminUrlAtom, url)

export function applyUrlConfig(data: {
  adminUrl?: string | null
  webUrl?: string | null
}) {
  if (data.adminUrl) setAdminUrl(data.adminUrl)
  if (data.webUrl) setWebUrl(data.webUrl)
}
