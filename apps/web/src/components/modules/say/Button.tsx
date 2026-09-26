import { MotionButtonBase } from '~/components/ui/button'
import { clsxm } from '~/lib/helper'

import { useSayModal } from './hooks'

export const CreateSayButton: Component = ({ className }) => {
  const present = useSayModal()
  return (
    <MotionButtonBase
      className={clsxm(
        'flex size-6 duration-200 center hover:text-accent',
        className,
      )}
      onClick={() => present()}
    >
      <i className="i-mingcute-add-circle-line" />
    </MotionButtonBase>
  )
}
