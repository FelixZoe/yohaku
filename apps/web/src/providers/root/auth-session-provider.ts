import { useQuery } from '@tanstack/react-query'
import { nanoid } from 'nanoid'
import { useEffect } from 'react'

import { setIsOwnerLogged } from '~/atoms/hooks/owner'
import { setSessionReader } from '~/atoms/hooks/reader'
import { fetchAppUrl } from '~/atoms/hooks/url'
import { writePresenceCard } from '~/components/modules/activity/presence-card'
import type { authClient } from '~/lib/authjs'
import { camelcaseKeysWithUrlSkip } from '~/lib/camelcase'
import { getOpenPanel } from '~/lib/openpanel'
import { apiClient } from '~/lib/request'

type AdapterUser = typeof authClient.$Infer.Session
export const AuthSessionProvider: Component = ({ children }) => {
  const { data: session } = useQuery({
    queryKey: ['session'],
    refetchOnMount: 'always',
    queryFn: () =>
      apiClient.proxy.auth.session.get<AdapterUser>({
        params: {
          r: nanoid(),
        },
      }),
  })
  useEffect(() => {
    if (!session) {
      setIsOwnerLogged(false)
      setSessionReader(null)
      return
    }
    const transformedData = camelcaseKeysWithUrlSkip(session)

    setSessionReader(transformedData)
    writePresenceCard({
      name: transformedData.name,
      image: transformedData.image || transformedData.avatar,
    })
    if (transformedData.role === 'owner') {
      setIsOwnerLogged(true)
      void fetchAppUrl().catch(() => {})
    }
    const op = getOpenPanel()
    if (op) {
      op.identify({
        profileId: transformedData.id,
        email: transformedData.email,
        lastName: transformedData.name,
        avatar: transformedData.avatar,
      })
    }
  }, [session])
  return children
}
