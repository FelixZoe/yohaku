import { createAtomHooks } from 'jojoo/react'

import { backgroundEffectEnabledAtom } from '../background'

export const [
  ,
  ,
  useIsBackgroundEffectEnabled,
  ,
  ,
  setIsBackgroundEffectEnabled,
] = createAtomHooks(backgroundEffectEnabledAtom)
