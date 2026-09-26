import { clsxm } from '~/lib/helper'

import { MotionButtonBase } from './MotionButton'

export const RoundedIconButton: typeof MotionButtonBase = ({
  ref,
  className,
  children,
  ...rest
}) => (
  <MotionButtonBase
    ref={ref}
    className={clsxm(
      'center inline-flex rounded-lg border border-black/10 p-2 text-center leading-none text-neutral-9 dark:border-white/10',
      'transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]',
      'hover:bg-black/[0.02] hover:border-black/15 dark:hover:bg-white/4 dark:hover:border-white/15',
      'active:bg-black/[0.04] active:translate-y-px',
      className,
    )}
    {...rest}
  >
    {children}
  </MotionButtonBase>
)

RoundedIconButton.displayName = 'RoundedIconButton'
